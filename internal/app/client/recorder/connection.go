package recorder

import (
	"context"
	"fmt"
	"math"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
	"woole/internal/app/client/app"
	"woole/internal/pkg/constants"
	"woole/internal/pkg/tunnel"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/status"
)

func startConnectionWithServer(onTunnelStart func(tunnel.Tunnel_TunnelClient) (bool, error)) {
	log.SetLogLevelStr(config.LogLevel)

	var err error

	for attempt := -1; attempt <= config.MaxReconnectAttempts; attempt++ {
		if err == nil {
			app.ChangeStatusAndPublish(tunnel.Status_CONNECTING)
		} else {
			isRetriable := isRetriable(err, attempt >= config.MaxReconnectAttempts)
			if !isRetriable {
				app.ChangeStatusAndPublish(tunnel.Status_DISCONNECTED)
				return
			}
			app.ChangeStatusAndPublish(tunnel.Status_RECONNECTING)
		}

		// Establish tunnel connection and retrieve request/response stream
		client, ctx, cancelCtx, connErr := connectClient(config.EnableTLSTunnel)
		err = connErr

		if err != nil {
			continue
		}

		// Start the tunnel stream
		stream, establishErr := client.Tunnel(ctx)
		if establishErr != nil {
			err = establishErr
			cancelCtx()
			continue
		}

		connEstablished, tunnelErr := onTunnelStart(stream)
		err = tunnelErr
		cancelCtx()

		if connEstablished {
			attempt = -1
		}
	}
	isRetriable(status.Error(codes.Aborted, fmt.Sprintf("failed to establish connection after %d attempts", config.MaxReconnectAttempts)), true)
}

func CreateProxyHandler(proxyUrl *url.URL) http.HandlerFunc {
	proxy := httputil.NewSingleHostReverseProxy(proxyUrl)

	go setProxyTimeout()

	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
		log.Error(err, ":", req.Method, req.URL)
		rw.WriteHeader(StatusInternalProxyError)
		fmt.Fprintf(rw, "%v", err)
	}

	return func(rw http.ResponseWriter, req *http.Request) {
		customHostHandler(req, func(customUrl *url.URL) {
			req.Host = customUrl.Host
			req.URL.Host = customUrl.Host
			req.URL.Scheme = customUrl.Scheme

			proxy.ServeHTTP(rw, req)
		})
	}
}

func customHostHandler(req *http.Request, handler func(*url.URL)) {
	if config.CustomUrl != nil {
		handler(config.CustomUrl)
		return
	}

	hostStr := req.Header.Get(constants.ForwardedToHeader)

	if hostStr == "" {
		handler(config.ProxyUrl)
		return
	}

	// Hide Woole header from the request
	req.Header.Del(constants.ForwardedToHeader)

	host, err := url.Parse(hostStr)

	if err != nil {
		log.Error("Failed to parse domain:", err)
		host = config.ProxyUrl
	}

	handler(host)
}

func setProxyTimeout() {
	session := app.GetSessionWhenAvailable()

	// Customize the Transport to include a timeout
	http.DefaultTransport = &http.Transport{
		DialContext: (&net.Dialer{
			Timeout: time.Duration(session.ResponseTimeout),
		}).DialContext,
	}
}

func connectClient(enableTransportCredentials bool) (tunnel.TunnelClient, context.Context, context.CancelFunc, error) {
	// Opts
	keepaliveParams := keepalive.ClientParameters{
		Time:                1 * time.Minute,
		Timeout:             20 * time.Second,
		PermitWithoutStream: true,
	}

	opts := []grpc.DialOption{
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(math.MaxInt32)),
		grpc.WithDefaultCallOptions(grpc.MaxCallSendMsgSize(math.MaxInt32)),
		grpc.WithKeepaliveParams(keepaliveParams),
	}

	if enableTransportCredentials {
		opts = append(opts, grpc.WithTransportCredentials(config.GetTransportCredentials()))
	} else {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	// Dial server
	conn, err := grpc.NewClient(config.TunnelUrl.Host, opts...)
	if err != nil {
		conn.Close()
		return nil, nil, nil, err
	}

	// Create a cancelable context
	ctx, cancel := context.WithCancel(context.Background())
	cancelFn := func() { cancel(); conn.Close() }

	// Test connection and retry without credentials if needed
	client := tunnel.NewTunnelClient(conn)
	_, err = client.TestConn(ctx, new(tunnel.Empty))

	if err != nil {
		cancelFn()
		if status.Code(err) == codes.Unavailable && enableTransportCredentials {
			config.EnableTLSTunnel = false
			return connectClient(config.EnableTLSTunnel)
		}
		return nil, nil, nil, err
	}

	return client, ctx, cancelFn, nil
}

func isRetriable(err error, aborted bool) bool {
	errStatus, ok := status.FromError(err)

	if !ok || !isRecoverable(err) || !app.HasSession() || aborted {
		log.Fatal("["+config.TunnelUrl.String()+"]", errStatus.Code(), "-", errStatus.Message())
		log.Fatal("["+config.TunnelUrl.String()+"]", "Failed to connect with tunnel")
		return false
	}

	log.Error("["+config.TunnelUrl.String()+"]", errStatus.Code(), "-", errStatus.Message())
	if config.ReconnectInterval > 0 {
		log.Warn("["+config.TunnelUrl.String()+"]", "Trying to reconnect in", config.ReconnectIntervalStr, "...")
		<-time.After(config.ReconnectInterval)
	} else {
		log.Warn("["+config.TunnelUrl.String()+"]", "Trying to reconnect...")
	}
	return true
}

func isRecoverable(err error) bool {
	switch status.Code(err) {
	// e.g. server restart, load balance, etc
	case codes.Unavailable:
		return true
	case codes.Internal:
		return true
	default:
		return false
	}
}
