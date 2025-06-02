[<- Go back to "README"](../README.md)

# Woole Client

## Basic Usage

### Using a standalone server (provided by the client)

```sh
./woole -http 8080 -proxy https://github.com/ECRomaneli/woole
```

**Output:**

```
╒════════════════════════════════════════════════╕
│  HTTP URL: http://localhost:8080               │
│  Proxying: https://github.com/ECRomaneli/woole │
│   Sniffer: http://localhost:8000               │
│ Expire At: never                               │
╘════════════════════════════════════════════════╛
```
*More about standalone config under the [Standalone Mode section](#standalone-mode).*

### Using the tunnel to connect with an external server

```sh
./woole -proxy https://github.com/ECRomaneli/woole -tunnel woole.me
```

**Output:**

```
╒════════════════════════════════════════════════╕
│  HTTP URL: http://d123e384.woole.me            │
│ HTTPS URL: https://d123e384.woole.me           │
│  Proxying: https://github.com/ECRomaneli/woole │
│   Sniffer: http://localhost:8000               │
│ Expire At: never                               │
╘════════════════════════════════════════════════╛
```

### External server with client name

```sh
./woole -proxy https://github.com/ECRomaneli/woole -tunnel woole.me -client anything-here
```

**Output:**

```
╒════════════════════════════════════════════════╕
│  HTTP URL: http://anything-here.woole.me       │
│ HTTPS URL: https://anything-here.woole.me      │
│  Proxying: https://github.com/ECRomaneli/woole │
│   Sniffer: http://localhost:8000               │
│ Expire At: never                               │
╘════════════════════════════════════════════════╛
```

*The HTTPS URL requires a [certified Server](server.md#using-https). Otherwise, only the HTTP URL will be displayed.*

## Available Options

| Option                      | Description                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| `-client`                   | Unique identifier of the client                                             |
| `-http`                     | Port to start the standalone server (disables tunnel)                       |
| `-proxy`                    | URL of the target server to be proxied (default `80`)                       |
| `-tunnel`                   | URL of the tunnel (default `9653`)                                          |
| `-custom-host`              | Custom host to be used when proxying                                        |
| `-sniffer`                  | Port on which the sniffer is available (default `8000`)                     |
| `-disable-sniffer-only`     | Terminate the application when the tunnel closes                            |
| `-disable-self-redirection` | Disables the self-redirection and the proxy changing                        |
| `-records`                  | Max records to store. Use `0` for unlimited (default `1000`)                |
| `-log-level`                | Level of detail for the logs to be displayed (default `INFO`)               |
| `-log-remote-addr`          | Log the request remote address                                              |
| `-tls-skip-verify`          | Disables the validation of the integrity of the Server's certificate        |
| `-tls-ca`                   | Path to the TLS CA file (only for self-signed certificates)                 |
| `-shared-key`               | Path to the shared key used to authenticate the client (Only if server requires it) |
| `-reconnect-attempts`       | Maximum number of reconnection attempts. Use `0` for infinite (default `5`) |
| `-reconnect-interval`       | Time between reconnection attempts. [Duration format](special-types.md#duration-format) (default `5s`) |
| `-version`                  | Print the version                                                           |

## Proxy

Woole is capable to proxy local and online HTTP and HTTPS webservers. Custom names defined using a DNS or `hosts` file are also supported.

Define the URL to proxy using the option `-proxy`. The URL must follows one of [these patterns](special-types.md#url-patterns):

```sh
./woole -proxy <port>
```

### Custom Host

The `-custom-host` option allows you to specify a custom host to be used in HTTP requests when proxying. The custom host will always take precedence, even in cases of self-redirection, which may lead to unexpected behavior.

```sh
# Proxying "http://localhost:8080" but sending mywebsite.com as header
./woole -proxy 8080 -custom-host mywebsite.com
```

### Redirections

During navigation, the application may encounter HTTP 302 (Redirect) responses, which can prevent Woole from continuing to use the original proxied URL. To maintain tracking, Woole will automatically update the proxy to follow the new host provided in the redirection.

To disable this behavior, use the following option:


```sh
# Redirections will show a Woole page warning about the URL changing
./woole -disable-self-redirection
```


## Client ID

The `-client` is optional. However, when creating the URL, the provided client ID will be prioritized.
Read more about the URL and how the client is used by the server in the [Server Hostname Pattern](special-types.md#hostname-pattern) section.

## Standalone Mode

Standalone mode initiates a self-served HTTP server via the Woole client. In this mode, the client bypasses the need for a tunnel connection, and can be used as a local sniffing tool and reverse proxy. 

To enable it, provide the port using the option `-http`. If a custom name is provided along with the port, the URL will only be accessible through it.

### Example

```sh
./woole -http 80 -proxy <internal-or-external-url>

# Or, if a custom domain name was configured

./woole -http custom_name:80 -proxy <internal-or-external-url>
```

When using the Standalone mode, the tunnel related options are going to be ignored.

## Tunnel

To use the tunneling tool, a server must be configured and provided using the `tunnel` option.

A single server allows many client connections at the same time. Once configured, copy the Tunnel URL provided by the server and use it as `tunnel`. Consult the [Server Section](server.md) for more details on how to create and configure a server. The URL follows [this pattern](special-types.md##url-patterns) but the default protocol is `grpc` and the default port is `9653`.

```sh
./woole -tunnel woole.me

# OR, WITH A CUSTOMIZED PORT
./woole -tunnel woole.me:<tunnel-port>
```

If the objective is to only use the sniffing tool and the reverse proxy, without the tunnel, consider using the [Standalone Mode](#standalone-mode).

## Troubleshooting

### Expired or unsafe cerficate

For servers with expired or unsafe certificates, if trusted by the user, use the option `-tls-skip-verify` to disable the validation of the integrity. Otherwise, the connection with the tunnel will not be possible. This is only required by HTTPS servers.

### [EXPERIMENTAL] Self-signed Certificates

If the server and the client shares a self-signed certificate, use the `-tls-ca` option to provide the CA file path.

### Requests not showing

Some browsers and websites utilize efficient caching mechanisms to minimize unnecessary requests. To temporarily disable this caching, disable the cache in your browser's DevTools (Network tab > Check "Disable Cache") and remove any cache headers from website requests. Note that this behavior is not a bug.

### Sniffer-Only Mode

When the tunnel closes after a successful session, the application remains active to provide access to the Sniffer and previously recorded data. This is the "Sniffer-Only" mode.

To disable "Sniffer-Only" mode and terminate the application when the tunnel closes, use the following option:

```sh
./woole -disable-sniffer-only
```
