package recorder

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"woole/internal/app/client/app"
	"woole/internal/app/client/recorder/adt"
	"woole/internal/pkg/constants"
	"woole/internal/pkg/tunnel"
	iurl "woole/internal/pkg/url"

	"woole/pkg/timer"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var proxyHandler = CreateProxyHandler(config.ProxyUrl)
var proxyReplayHandler = CreateProxyHandler(config.ProxyUrl)

func Replay(request *tunnel.Request) {
	record := adt.NewRecord(request, adt.REPLAY)
	forwardTo := request.GetHeaderOrEmpty(constants.ForwardedToHeader)

	if forwardTo == "" {
		request.SetHeader(constants.ForwardedToHeader, config.ProxyUrl.String())
	} else {
		proxyUrl, err := url.Parse(forwardTo)

		if err != nil {
			log.Error("Error parsing URL:", err)
			return
		}

		proxyReplayHandler = CreateProxyHandler(proxyUrl)
	}

	record.Response = proxyRequest(record.Request, proxyReplayHandler)
	records.AddRecordAndPublish(record)

	if log.IsInfoEnabled() {
		log.Info(record.ToString(config.LogRemoteAddr, 26))
	}
}

func GetRecords() *adt.Records {
	return records
}

// onTunnelStart starts the connection with the server via a gRPC tunnel.
//
// Returns:
// - A boolean indicating whether the connection was successfully established.
// - An error if the connection failed or was interrupted.
func onTunnelStart(stream tunnel.Tunnel_TunnelClient) (bool, error) {
	// Send the handshake
	stream.Send(&tunnel.ClientMessage{Handshake: config.GetHandshake()})

	// Receive the session
	serverMsg, err := stream.Recv()
	if !handleGRPCErrors(err) {
		return false, err
	}

	var expireAt string
	if app.HasSession() {
		log.Info("["+config.TunnelUrl.String()+"]", "Connection Reestablished")
		expireAt = app.ExpireAt()
	}

	app.SetSession(serverMsg.Session)

	if expireAt != "" && app.ExpireAt() != expireAt {
		log.Info("["+config.TunnelUrl.String()+"]", "New Session ExpireAt:", app.ExpireAt())
	}

	// Reset old IDs
	records.ResetServerIds()

	app.ChangeStatusAndPublish(tunnel.Status_CONNECTED)

	// Listen for requests and send responses asynchronously
	for {
		serverMsg, err := stream.Recv()

		if err != nil {
			if !handleGRPCErrors(err) {
				return true, err
			}
			continue
		}

		go handleServerRecord(stream, serverMsg.Record)
	}
}

func handleServerRecord(stream tunnel.Tunnel_TunnelClient, serverRecord *tunnel.Record) {
	defer catchAllErrors()

	switch serverRecord.Step {
	case tunnel.Step_REQUEST:
		handleServerRequest(stream, serverRecord)
	case tunnel.Step_SERVER_ELAPSED:
		handleServerElapsed(serverRecord)
	default:
		log.Error("Record Step Not Allowed")
	}
}

func handleServerRequest(stream tunnel.Tunnel_TunnelClient, serverRecord *tunnel.Record) {
	record := adt.EnhanceRecord(serverRecord)
	doRequest(record)

	err := stream.Send(&tunnel.ClientMessage{Record: record.ThinClone(tunnel.Step_RESPONSE)})
	if !handleGRPCErrors(err) {
		log.Error("Failed to send response for Record ID "+record.Id+":", err)
	}

	records.AddRecordAndPublish(record)

	if log.IsInfoEnabled() {
		log.Info(record.ToString(config.LogRemoteAddr, 26))
	}
}

func handleServerElapsed(serverRecord *tunnel.Record) {
	rec := records.GetByServerId(serverRecord.Id)

	if rec == nil {
		log.Error("Record ID " + serverRecord.Id + " is not available")
		return
	}

	rec.Step = tunnel.Step_SERVER_ELAPSED
	rec.Response.ServerElapsed = serverRecord.Response.ServerElapsed
	records.Publish(&adt.Record{ClientId: rec.ClientId, Record: serverRecord})
}

func doRequest(record *adt.Record) {
	record.Step = tunnel.Step_RESPONSE
	record.Request.SetHeader(constants.ForwardedToHeader, config.ProxyUrl.String())

	url := config.ProxyUrl
	if config.CustomUrl != nil {
		url = config.CustomUrl
	}

	replaceUrlHeader(url, record.Request.Header, "Origin")
	replaceUrlHeader(url, record.Request.Header, "Referer")

	record.Response = proxyRequest(record.Request, proxyHandler)
	handleRedirections(record)
}

func proxyRequest(req *tunnel.Request, proxyHandler http.HandlerFunc) *tunnel.Response {
	// Redirect and record the response
	recorder := httptest.NewRecorder()
	elapsed := timer.Exec(func() {
		proxyHandler.ServeHTTP(recorder, req.ToHTTPRequest())
	})

	// Save req and res data
	return (&tunnel.Response{}).FromResponseRecorder(recorder, elapsed)
}

func handleRedirections(record *adt.Record) {
	res := record.Response
	location := res.GetHeaderOrEmpty("Location")

	if location == "" {
		return
	}

	if config.DisableSelfRedirection {
		blockSelfRedirection(record, location)
		return
	}

	updateReverseProxy(record, location)
}

func updateReverseProxy(record *adt.Record, location string) {
	locationUrl, err := url.Parse(location)
	if err != nil {
		log.Error("Error parsing URL:", err)
		return
	}

	config.ProxyUrl = iurl.RawUrlToUrl(locationUrl.Hostname(), locationUrl.Scheme, locationUrl.Port())
	proxyHandler = CreateProxyHandler(config.ProxyUrl)
	log.Warn("Proxy changed to \"" + config.ProxyUrl.String() + "\"")

	newLocation, _ := iurl.ReplaceHostByUsingExampleStr(locationUrl.String(), record.Request.Url)
	record.Response.SetHeader("Location", newLocation.String())
}

func blockSelfRedirection(record *adt.Record, location string) {
	record.Type = adt.REDIRECT

	newUrl, ok := iurl.ReplaceHostByUsingExampleStr(location, record.Request.Url)
	if !ok {
		panic("Error when trying to replace the host of [" + record.Request.Url + "]")
	}

	params := make(map[string]string)
	params["redirectUrl"] = location
	params["hostname"] = app.GetSessionWhenAvailable().Hostname

	if newUrl.String() == record.Request.Url {
		params["enableCustomUrl"] = "false"
		params["customUrl"] = "#"
	} else {
		params["enableCustomUrl"] = "true"
		params["customUrl"] = newUrl.String()
	}

	record.Response.Body = []byte(app.RedirectTemplate.Apply(params))
	record.Response.Code = http.StatusOK

	record.Response.SetHeader("Content-Type", "text/html")
	record.Response.DelHeader("Location")
	record.Response.DelHeader("Content-Encoding")
	record.Response.SetHeader("Content-Length", strconv.Itoa(len(record.Response.Body)))
}

func replaceUrlHeader(url *url.URL, header map[string]string, headerName string) {
	if header == nil {
		return
	}

	rawUrl := header[headerName]

	if rawUrl == "" {
		return
	}

	newUrl, ok := iurl.ReplaceHostByUsingExampleUrl(rawUrl, url)

	if !ok {
		panic("Error when trying to replace the host of [" + rawUrl + "]")
	}

	header[headerName] = newUrl.String()
}

func handleGRPCErrors(err error) bool {
	if err == nil {
		return true
	}

	switch status.Code(err) {
	case codes.ResourceExhausted:
		log.Warn("Request discarded. Reason: Max size exceeded")
		return true
	default:
		return false
	}
}

func catchAllErrors() {
	err := recover()

	if err == nil {
		return
	}

	log.Error(err)
	// TODO: Improve error handling
}
