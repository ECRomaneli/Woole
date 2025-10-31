package recorder

import (
	"net"
	"net/http"
	"time"
	"woole/internal/pkg/tunnel"

	web "woole/web/server"

	"github.com/ecromaneli-golang/http/webserver"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
)

func serveWebServer() {
	server := webserver.NewServerWithFS(http.FS(web.EmbeddedFS))
	server.Logger().SetLogLevelStr(config.ServerLogLevel)

	domain := config.GetDomain()

	if domain != "" {
		server.Get(domain+"/", recorderHandler)
	}

	server.All(config.HostnamePattern+"/**", recorderHandler)

	if config.HasTlsFiles() {
		go func() {
			panic(server.ListenAndServeTLS(":"+config.HttpsPort, config.TlsCert, config.TlsKey))
		}()
	}

	panic(server.ListenAndServe(":" + config.HttpPort))
}

func serveTunnel() {
	log.SetLogLevelStr(config.LogLevel)

	lis, err := net.Listen("tcp", ":"+config.TunnelPort)
	panicIfNotNil(err)

	// Opts
	kaep := keepalive.EnforcementPolicy{
		MinTime:             1 * time.Minute,
		PermitWithoutStream: true,
	}

	kasp := keepalive.ServerParameters{
		// MaxConnectionIdle:     15 * time.Minute,
		// MaxConnectionAge:      30 * time.Minute,
		// MaxConnectionAgeGrace: 5 * time.Second,
		Time:    30 * time.Minute,
		Timeout: 20 * time.Second,
	}

	opts := []grpc.ServerOption{
		grpc.KeepaliveEnforcementPolicy(kaep),
		grpc.KeepaliveParams(kasp),
		grpc.MaxRecvMsgSize(config.TunnelResponseSize),
		grpc.MaxSendMsgSize(config.TunnelRequestSize),
	}

	if config.HasTlsFiles() {
		opts = append(opts, grpc.Creds(config.GetTransportCredentials()))
	}

	s := grpc.NewServer(opts...)

	tunnel.RegisterTunnelServer(s, &Tunnel{})

	go func() {
		if err := s.Serve(lis); err != nil {
			panic("Failed to serve Tunnel. Reason: " + err.Error())
		}
	}()
}
