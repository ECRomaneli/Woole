package recorder

import (
	"context"
	"net/http"
	"time"
	"woole/internal/pkg/tunnel"

	"github.com/ecromaneli-golang/http/webserver"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
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

	client := sessionManager.Get(clientId)

	if client.IsIdle {
		res.Status(http.StatusServiceUnavailable).WriteText("Session started but not in use")
		log.Warn(getSessionLog(clientId, "Trying to use an idle client"))
		return
	}

	record, err := getRecordWhenReady(client, req)

	if err != nil {
		log.Warn(getSessionLog(clientId, err.Error()))
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

	if hs.Handshake.Version != config.Version {
		log.Warn("incompatible client version " + hs.Handshake.Version)
		return status.Errorf(codes.FailedPrecondition, "incompatible client version %s, expected %s", hs.Handshake.Version, config.Version)
	}

	// Recover session if exists
	session, err := createOrRetrieveSession(hs.Handshake, getContextIp(ctx))
	if err != nil {
		return err
	}

	session.StopIdleTimeout()
	log.Info(session.LogPrefix(), "- Tunnel Connected")

	if config.TunnelConnectionTimeout != 0 {
		session.SetExpireAt(config.TunnelConnectionTimeout)
	}

	if hs.Handshake.ExpireAt != 0 {
		if config.TunnelConnectionTimeout == 0 || session.ExpireAt.Unix() > hs.Handshake.ExpireAt {
			session.SetExpireAtTime(hs.Handshake.ExpireAt)
		}
	}

	if !session.ExpireAt.IsZero() {
		cancelableCtx, cancel := context.WithDeadline(stream.Context(), session.ExpireAt)
		ctx = cancelableCtx
		defer cancel()
	}

	// Send session
	stream.Send(&tunnel.ServerMessage{Session: toProtoSession(session)})

	if !handleGRPCErrors(err) {
		return err
	}

	// Listen for HTTP responses from client
	go receiveClientMessage(stream, session)

	// Send new HTTP requests to client
	go sendServerMessage(stream, session)

	// Wait the end-of-stream
	<-ctx.Done()

	if ctx.Err() != context.DeadlineExceeded {
		log.Info(session.LogPrefix(), "- Tunnel Disconnected")
		session.SetIdleTimeout(config.TunnelReconnectTimeout)
	} else {
		log.Info(session.LogPrefix(), "- Session Expired")
		session.SetIdleTimeout(0)
	}

	return ctx.Err()
}

// RPC -> TestConn()
func (_t *Tunnel) TestConn(_ context.Context, _ *tunnel.Empty) (*tunnel.Empty, error) {
	return new(tunnel.Empty), nil
}

func getExpireDate(clientExpireAt int64) time.Duration {
	if clientExpireAt != -1 {
		return time.Duration(clientExpireAt)
	}
	return config.TunnelConnectionTimeout
}

func hasClient(clientId string) bool {
	if len(clientId) == 0 {
		log.Info("No client ID provided")
		return false
	}

	if !sessionManager.Exists(clientId) {
		log.Warn(getSessionLog(clientId, "client ID is not in use"))
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
