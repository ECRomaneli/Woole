package recorder

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"woole/internal/app/server/app"
	"woole/internal/pkg/constants"
	"woole/internal/pkg/template"
	"woole/internal/pkg/tunnel"
	"woole/pkg/timer"
	web "woole/web/server"

	"woole/internal/app/server/recorder/adt"

	"github.com/ecromaneli-golang/http/webserver"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func getRecordWhenReady(client *adt.Client, req *webserver.Request) (*adt.Record, error) {
	record := adt.NewRecord((&tunnel.Request{}).FromHTTPRequest(req))
	record.Step = tunnel.Step_REQUEST
	client.AddRecord(record)

	var err error

	elapsed := timer.Exec(func() {
		defer client.RemoveRecord(record.Id)

		select {
		case <-record.OnResponse.Receive():
		case <-time.After(config.TunnelResponseTimeout):
			err = fmt.Errorf("Record(%s) Server timeout reached", record.Id)
		case <-req.Raw.Context().Done():
			err = fmt.Errorf("Record(%s) The request is no longer available", record.Id)
		}
	})

	if err != nil {
		record.Response = &tunnel.Response{Code: http.StatusGatewayTimeout, Body: []byte("Gateway Timeout"), ServerElapsed: elapsed}
		return record, err
	}

	record.Response.ServerElapsed = elapsed
	client.SendServerElapsed(record)

	return record, nil
}

func sendServerMessage(stream tunnel.Tunnel_TunnelServer, client *adt.Client) {
	for record := range client.RecordChannel {
		err := stream.Send(&tunnel.ServerMessage{Record: record})

		if !handleGRPCErrors(err) {
			return
		}
	}
}

func receiveClientMessage(stream tunnel.Tunnel_TunnelServer, client *adt.Client) {
	for {
		tunnelRes, err := stream.Recv()

		if !handleGRPCErrors(err) {
			return
		}

		if tunnelRes.Record.Step != tunnel.Step_RESPONSE {
			log.Error("Wrong record step")
			return
		}

		if err == nil {
			client.SetRecordResponse(tunnelRes.Record.Id, tunnelRes.Record.Response)
		}

	}
}

func createSession(client *adt.Client, expireAt int64) *tunnel.Session {
	hostname := strings.Replace(config.HostnamePattern, constants.ClientToken, client.Id, 1)

	auth := &tunnel.Session{
		ClientId:        client.Id,
		Hostname:        hostname,
		HttpPort:        config.HttpPort,
		ExpireAt:        expireAt,
		MaxRequestSize:  int32(config.TunnelRequestSize),
		MaxResponseSize: int32(config.TunnelResponseSize),
		ResponseTimeout: int64(config.TunnelResponseTimeout),
		Bearer:          client.Bearer,
	}

	if config.HasTlsFiles() {
		auth.HttpsPort = config.HttpsPort
	}

	return auth
}

func getClient(hs *tunnel.Handshake, clientIp string) (*adt.Client, error) {
	clientCandidate := &adt.Client{
		Id:        hs.ClientId,
		IpAddress: clientIp,
	}

	err := app.AuthClient(hs.SharedKey)
	if err != nil {
		log.Error(clientCandidate.LogPrefix(), "-", err.Error())
		return nil, err
	}

	// Recover client session if exists
	client, err := clientManager.RecoverSession(hs.ClientId, hs.Bearer)

	if err != nil {
		log.Error(clientCandidate.LogPrefix(), "-", err.Error())
		return nil, err
	}

	if client != nil {
		client.IpAddress = clientIp
		return client, nil
	}

	// Create session or try recover from other server with the same key
	client, err = clientManager.Register(hs.ClientId, hs.Bearer, app.GenerateBearer(hs.ClientKey))

	if err != nil {
		log.Error(clientCandidate.LogPrefix(), "-", err.Error())
		return nil, err
	}

	client.IpAddress = clientIp
	log.Info(client.LogPrefix(), "- Session Started")
	clientManager.DeregisterOnTimeout(client.Id, func() { log.Info(client.LogPrefix(), "- Session Finished") })
	return client, nil
}

func logRecord(clientId string, record *adt.Record) {
	if log.IsInfoEnabled() {
		log.Info(getClientLog(clientId, record.ToString(config.LogRemoteAddr, 26)))
	}
}

func getClientLog(clientId string, message string) string {
	return clientId + " - " + message
}

func panicIfNotNil(err any) {
	if err != nil {
		panic(err)
	}
}

// Handle gRPC errors and return if the error was or not handled
func handleGRPCErrors(err error) bool {
	if err == nil {
		return true
	}

	switch status.Code(err) {
	case codes.ResourceExhausted:
		log.Warn("Request discarded. Reason: Max size exceeded")
		return true
	case codes.Unavailable, codes.Canceled:
		return false
	default:
		log.Error(err)
		return false
	}
}

func getHelpPage(clientId string) *tunnel.Response {
	params := map[string]string{
		"client_id":  clientId,
		"tunnel_url": config.GetDomain(),
		"version":    config.Version,
	}
	if config.TunnelPort != strconv.Itoa(constants.DefaultTunnelPort) {
		params["tunnel_url"] += ":" + config.TunnelPort
	}

	res := &tunnel.Response{
		Code: http.StatusAccepted,
		Body: []byte(template.FromFile(web.EmbeddedFS, "index.html").Apply(params)),
	}

	if clientId == "" {
		res.Code = http.StatusOK
	}

	res.SetHeader("Content-Type", "text/html")
	res.SetHeader("Content-Length", strconv.Itoa(len(res.Body)))

	return res
}
