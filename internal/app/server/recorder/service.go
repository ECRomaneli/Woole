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

func getRecordWhenReady(session *adt.Session, req *webserver.Request) (*adt.Record, error) {
	record := adt.NewRecord((&tunnel.Request{}).FromHTTPRequest(req))
	record.Step = tunnel.Step_REQUEST
	session.AddRecord(record)

	var err error

	elapsed := timer.Exec(func() {
		defer session.RemoveRecord(record.Id)

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
	session.SendServerElapsed(record)

	return record, nil
}

func sendServerMessage(stream tunnel.Tunnel_TunnelServer, session *adt.Session) {
	for record := range session.RecordChannel {
		err := stream.Send(&tunnel.ServerMessage{Record: record})

		if !handleGRPCErrors(err) {
			return
		}
	}
}

func receiveClientMessage(stream tunnel.Tunnel_TunnelServer, session *adt.Session) {
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
			session.SetRecordResponse(tunnelRes.Record.Id, tunnelRes.Record.Response)
		}

	}
}

func toProtoSession(session *adt.Session) *tunnel.Session {
	hostname := strings.Replace(config.HostnamePattern, constants.ClientToken, session.Id, 1)

	auth := &tunnel.Session{
		ClientId:        session.Id,
		Hostname:        hostname,
		HttpPort:        config.HttpPort,
		MaxRequestSize:  int32(config.TunnelRequestSize),
		MaxResponseSize: int32(config.TunnelResponseSize),
		ResponseTimeout: int64(config.TunnelResponseTimeout),
		Bearer:          session.Bearer,
	}

	if session.ExpireAt.IsZero() {
		auth.ExpireAt = 0
	} else {
		auth.ExpireAt = session.ExpireAt.Unix()
	}

	if config.HasTlsFiles() {
		auth.HttpsPort = config.HttpsPort
	}

	return auth
}

func createOrRetrieveSession(hs *tunnel.Handshake, clientIp string) (*adt.Session, error) {
	sessionCandidate := &adt.Session{
		Id:        hs.ClientId,
		IpAddress: clientIp,
	}

	err := app.AuthClient(hs.SharedKey)
	if err != nil {
		log.Error(sessionCandidate.LogPrefix(), "-", err.Error())
		return nil, err
	}

	// Recover session if exists
	session, err := sessionManager.RecoverSession(hs.ClientId, hs.Bearer)

	if err != nil {
		log.Info(sessionCandidate.LogPrefix(), "-", err.Error())
		return nil, err
	}

	if session != nil {
		session.IpAddress = clientIp
		return session, nil
	}

	// Create session or try recover from other server with the same key
	session, err = sessionManager.Register(hs.ClientId, hs.Bearer, app.GenerateBearer(hs.ClientKey))

	if err != nil {
		log.Error(sessionCandidate.LogPrefix(), "-", err.Error())
		return nil, err
	}

	session.IpAddress = clientIp

	log.Info(session.LogPrefix(), "- Session Started")
	sessionManager.DeregisterOnTimeout(session.Id, func() { log.Info(session.LogPrefix(), "- Session Finished") })

	return session, nil
}

func logRecord(clientId string, record *adt.Record) {
	if log.IsInfoEnabled() {
		log.Info(getSessionLog(clientId, record.ToString(config.LogRemoteAddr, 26)))
	}
}

func getSessionLog(clientId string, message string) string {
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
