package app

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"
	"sync"
	"time"
	"woole/internal/pkg/constants"
	"woole/internal/pkg/template"
	"woole/internal/pkg/tunnel"
	"woole/pkg/channel"
	"woole/pkg/parser"
	"woole/pkg/rand"
	"woole/pkg/signal"
	web "woole/web/client"

	iurl "woole/internal/pkg/url"

	"google.golang.org/grpc/credentials"
)

// Config has all the configuration parsed from the command line.
type Config struct {
	ClientId               string
	ClientKey              []byte
	ProxyUrl               *url.URL
	HttpUrl                *url.URL
	TunnelUrl              *url.URL
	CustomUrl              *url.URL
	SnifferUrl             *url.URL
	MaxRecords             int
	LogLevel               string
	SnifferLogLevel        string
	ServerKey              string
	tlsSkipVerify          bool
	tlsCa                  string
	EnableTLSTunnel        bool
	AllowReaders           bool
	IsStandalone           bool
	DisableSnifferOnlyMode bool
	DisableSelfRedirection bool
	MaxReconnectAttempts   int
	ReconnectIntervalStr   string
	ReconnectInterval      time.Duration
	available              bool
}

var (
	RedirectTemplate                 = template.FromFile(web.EmbeddedFS, "redirect.html")
	config           *Config         = &Config{available: false}
	session          *tunnel.Session = &tunnel.Session{}
	sessionInitiated signal.Signal   = *signal.New()
	StatusBroker     *channel.Broker = channel.NewBroker()
	configMu         sync.Mutex
)

func HasSession() bool {
	return session.Bearer != nil
}

// If no session was provided yet, the routine will wait for a session
func GetSessionWhenAvailable() *tunnel.Session {
	<-sessionInitiated.Receive()
	return session
}

func SetSession(serverSession *tunnel.Session) {
	if !HasSession() {
		defer sessionInitiated.SendLast()
	}
	session = serverSession
}

func ReadConfig() *Config {
	if !config.available {
		configMu.Lock()
		defer configMu.Unlock()
	}

	if config.available {
		return config
	}

	emptyStr := ""

	clientId := flag.String("client", "", "Unique identifier of the client")
	httpUrl := flag.String("http", constants.DefaultStandaloneMessage, "Port to start the standalone server (disables tunnel)")
	proxyUrl := flag.String("proxy", constants.DefaultProxyPort, "URL of the target server to be proxied")
	tunnelUrl := flag.String("tunnel", constants.DefaultTunnelPortStr, "URL of the tunnel")
	customUrl := flag.String("custom-host", constants.DefaultCustomUrlMessage, "Custom host to be used when proxying")
	snifferPort := flag.String("sniffer", constants.DefaultSnifferPort, "Port on which the sniffing tool is available")
	disableSnifferOnlyMode := flag.Bool("disable-sniffer-only", false, "Terminate the application when the tunnel closes")
	maxRecords := flag.Int("records", 1000, "Max records to store. Use 0 to not define a limit.")
	logLevel := flag.String("log-level", "INFO", "Level of detail for the logs to be displayed")
	snifferLogLevel := flag.String("sniffer-log-level", "INFO", "Level of detail for the sniffer logs to be displayed")
	// allowReaders := flag.Bool("allow-readers", false, "Allow other connections to listen the requests")
	maxReconnectAttempts := flag.Int("reconnect-attempts", 5, "Maximum number of reconnection attempts. 0 for infinite")
	reconnectInterval := flag.String("reconnect-interval", "5s", "Time between reconnection attempts. Duration format")
	disableSelfRedirection := flag.Bool("disable-self-redirection", false, "Disables the self-redirection and the proxy changing")
	serverKey := flag.String("server-key", "", "Path to the ECC public key used to authenticate (only if configured by the server)")
	tlsSkipVerify := flag.Bool("tls-skip-verify", false, "Disables the validation of the integrity of the Server's certificate")
	tlsCa := flag.String("tls-ca", "", "Path to the TLS CA file. Only for self-signed certificates")

	flag.Usage = func() {
		flag.PrintDefaults()
		fmt.Printf("\n")
		fmt.Printf("Definitions:\n")
		fmt.Printf("  Duration Format\n")
		fmt.Printf("\tThe duration format allows you to specify time intervals using a combination of numeric values and time unit qualifiers up to \"(d)ay\":\n")
		fmt.Printf("\t- Example: \"1d 3h 50s\" for 1 day, 3 hours and 50 seconds.\n")
	}

	flag.Parse()
	StatusBroker.Start()

	if *httpUrl == constants.DefaultStandaloneMessage {
		httpUrl = &emptyStr
	}

	config = &Config{
		ClientId:               *clientId,
		ClientKey:              rand.RandMD5(*clientId),
		HttpUrl:                iurl.RawUrlToUrl(*httpUrl, "http", constants.DefaultStandalonePort),
		ProxyUrl:               iurl.RawUrlToUrl(*proxyUrl, "http", ""),
		TunnelUrl:              iurl.RawUrlToUrl(*tunnelUrl, "grpc", constants.DefaultTunnelPortStr),
		SnifferUrl:             iurl.RawUrlToUrl(*snifferPort, "http", constants.DefaultSnifferPort),
		MaxRecords:             *maxRecords,
		LogLevel:               *logLevel,
		SnifferLogLevel:        *snifferLogLevel,
		ServerKey:              *serverKey,
		tlsSkipVerify:          *tlsSkipVerify,
		tlsCa:                  *tlsCa,
		DisableSnifferOnlyMode: *disableSnifferOnlyMode,
		DisableSelfRedirection: *disableSelfRedirection,
		EnableTLSTunnel:        true,
		IsStandalone:           httpUrl != &emptyStr,
		MaxReconnectAttempts:   *maxReconnectAttempts,
		ReconnectIntervalStr:   *reconnectInterval,
		ReconnectInterval:      parseDurationOrPanic("reconnect-interval", *reconnectInterval),
		available:              true,
	}

	if *customUrl != constants.DefaultCustomUrlMessage {
		config.CustomUrl = iurl.RawUrlToUrl(*customUrl, "http", "")
	}

	session.ClientId = *clientId

	return config
}

func (cfg *Config) GetTransportCredentials() credentials.TransportCredentials {
	tlsConfig := &tls.Config{InsecureSkipVerify: cfg.tlsSkipVerify}

	if tlsConfig.InsecureSkipVerify || cfg.tlsCa == "" {
		return credentials.NewTLS(tlsConfig)
	}

	caBytes, err := os.ReadFile(cfg.tlsCa)
	if err != nil {
		panic("Failed to load TLS CA File on: " + cfg.tlsCa + ". Reason: " + err.Error())
	}

	cp := x509.NewCertPool()
	if !cp.AppendCertsFromPEM(caBytes) {
		panic("Failed to append certificate")
	}

	return credentials.NewTLS(tlsConfig)
}

func (cfg *Config) GetHandshake() *tunnel.Handshake {
	clientId := cfg.ClientId

	if HasSession() {
		clientId = session.ClientId
	}

	publicKey, err := loadPublicKeyECC(cfg.ServerKey)

	if err != nil {
		panic(err)
	}

	return &tunnel.Handshake{
		ClientId:  clientId,
		ClientKey: cfg.ClientKey,
		Bearer:    session.Bearer,
		PublicKey: publicKey,
	}
}

// loadPublicKeyECC loads the public key from the configured file
func loadPublicKeyECC(path string) ([]byte, error) {
	if path == "" {
		return nil, nil
	}

	keyData, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read public key file: %w", err)
	}

	var block *pem.Block
	for block == nil || block.Type != "PUBLIC KEY" {
		block, keyData = pem.Decode(keyData)
		if block == nil {
			return nil, errors.New("invalid public key format")
		}
	}
	return block.Bytes, nil
}

func ExpireAt() string {
	if session.ExpireAt == 0 {
		return "never"
	}

	t := time.Unix(session.ExpireAt, 0)
	return t.Format("2006-01-02 03:04:05 PM MST")
}

func ChangeStatusAndPublish(status tunnel.Status) {
	session.Status = status
	StatusBroker.Publish(nil)
}

func parseDurationOrPanic(field string, duration string) time.Duration {
	dur, err := parser.ParseDuration(duration)
	if err != nil {
		panic(fmt.Sprintf("Invalid %s: %s", field, err))
	}
	return dur
}

func PrintConfig() {
	fmt.Println(ReadConfig())
}
