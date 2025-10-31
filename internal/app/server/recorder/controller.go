package recorder

import (
	"context"
	"net/http"
	"woole/internal/pkg/tunnel"

	"github.com/ecromaneli-golang/http/webserver"
	"google.golang.org/grpc/peer"
)

// REST -> [ALL] /**
func recorderHandler(req *webserver.Request, res *webserver.Response) {
	clientId := req.Param("client")
	clientExists := hasClient(clientId)

	if !clientExists {
		help := getHelpPage(clientId)
		res.Headers(help.GetHttpHeader()).Status(int(help.Code)).Write(help.Body)
		return
	}

	client := clientManager.Get(clientId)

	if client.IsIdle {
		res.Status(http.StatusServiceUnavailable).WriteText("Session started but not in use")
		log.Warn(getClientLog(clientId, "Trying to use an idle client"))
		return
	}

	record, err := getRecordWhenReady(client, req)

	if err != nil {
		log.Warn(getClientLog(clientId, err.Error()))
	}

	res.Headers(record.Response.GetHttpHeader()).Status(int(record.Response.Code)).Write(record.Response.Body)
	logRecord(clientId, record)
}

// RPC -> Tunnel(stream *TunnelServer)
func (_t *Tunnel) Tunnel(stream tunnel.Tunnel_TunnelServer) error {

	// Get the stream context
	ctx := stream.Context()

	// Receive the client handshake
	hs, err := stream.Recv()

	if !handleGRPCErrors(err) {
		return err
	}

	// Recover client session if exists
	client, err := getClient(hs.Handshake, getContextIp(ctx))
	if err != nil {
		return err
	}

	client.StopIdleTimeout()
	log.Info(client.LogPrefix(), "- Tunnel Connected")

	if config.TunnelConnectionTimeout != 0 {
		client.SetExpireAt(config.TunnelConnectionTimeout)
		cancelableCtx, cancel := context.WithDeadline(stream.Context(), client.ExpireAt)
		ctx = cancelableCtx
		defer cancel()
	}

	// Send session
	stream.Send(&tunnel.ServerMessage{Session: createSession(client)})

	if !handleGRPCErrors(err) {
		return err
	}

	// Listen for HTTP responses from client
	go receiveClientMessage(stream, client)

	// Send new HTTP requests to client
	go sendServerMessage(stream, client)

	// Wait the end-of-stream
	<-ctx.Done()

	if ctx.Err() != context.DeadlineExceeded {
		log.Info(client.LogPrefix(), "- Tunnel Disconnected")
		client.SetIdleTimeout(config.TunnelReconnectTimeout)
	} else {
		log.Info(client.LogPrefix(), "- Session Expired")
		client.SetIdleTimeout(0)
	}

	return ctx.Err()
}

// RPC -> TestConn()
func (_t *Tunnel) TestConn(_ context.Context, _ *tunnel.Empty) (*tunnel.Empty, error) {
	return new(tunnel.Empty), nil
}

func hasClient(clientId string) bool {
	if len(clientId) == 0 {
		log.Info("No client ID provided")
		return false
	}

	if !clientManager.Exists(clientId) {
		log.Warn(getClientLog(clientId, "client ID is not in use"))
		return false
	}

	return true
}

func getContextIp(ctx context.Context) string {
	if config.LogRemoteAddr {
		if p, ok := peer.FromContext(ctx); ok {
			return p.Addr.String()
		} else {
			return "unknown"
		}
	}
	return ""
}
