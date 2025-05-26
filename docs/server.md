[<- Go back to "README"](../README.md)

# Server Documentation

Woole allows the creation of custom servers. Before setting up a Woole Server, ensure that the necessary ports (HTTP, HTTPS, and Tunnel) are open and properly configured in the firewall, if applicable. Refer to the server provider’s documentation for specific configuration instructions.

Please note that domains and hosting services are not included with Woole Server.

## Basic Usage

```sh
./woole-server -pattern {client}.mywebsite.com
```

**Output:**

```
╒═════════════════════════════════════════════════════╕
│   HTTP listening on: http://{client}.mywebsite.com  |
│ Tunnel listening on: grpc://mywebsite.com:9653      |
╘═════════════════════════════════════════════════════╛
```

*To provide an HTTPS server, the server must be certified. Consult the [Using HTTPS](#using-https) section for more details.*

## Available Options

| Option                      | Description                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| `-pattern`                  | Set the server hostname pattern. Example: `{client}.mysite.com`             |
| `-http`                     | Port on which the server listens for HTTP requests (default `80`)           |
| `-https`                    | Port on which the server listens for HTTPS requests (default `443`)         |
| `-tunnel`                   | Port on which the gRPC tunnel listens (default `9653`)                      |
| `-seed`                     | Key used to hash the client bearer                                          |
| `-tls-cert`                 | Path to the TLS certificate or fullchain file                               |
| `-tls-key`                  | Path to the TLS private key file                                            |
| `-shared-key`               | Path to the shared key used to authenticate the client. (Default: disabled) |
| `-log-level`                | Level of detail for the logs to be displayed (default `INFO`)               |
| `-log-remote-addr`          | Log the request remote address                                              |
| `-tunnel-reconnect-timeout` | Timeout to reconnect the stream when the connection is lost. [Duration format](special-types.md#duration-format) (default `10s`) |
| `-tunnel-request-size`      | Tunnel maximum request size. [Size format](special-types.md#size-format) (default `2GB`, limited by gRPC)  |
| `-tunnel-response-size`     | Tunnel maximum response size. [Size format](special-types.md#size-format) (default `2GB`, limited by gRPC) |
| `-tunnel-response-timeout`  | Timeout to receive a client response. [Duration format](special-types.md#duration-format) (default `10s`)  |
| `-tunnel-connection-timeout`| Timeout for client connections. [Duration format](special-types.md#duration-format) (default `unset`)      |
| `-version`                  | Print the version                                                           |


## Hostname Pattern

The `pattern` is used to define the host format and where the [Client ID](client.md#client-id) will be displayed in the URL. Example, `{client}.pattern.here` will generate URLs such as:
- https://clientid.pattern.here;
- https://test.pattern.here
- https://l2rhwi87aira.pattern.here;

*If using a host, configure it to allow the `*.pattern.here` DNS records.*

### Custom URL Rules

The [Client ID](client.md#client-id) will be used for the first attached tunnel and the subsequents will be appended with a 5 digits hash. The [Client ID](client.md#client-id) will become available again once the tunnel dettach.

If no name is provided, an 8 digits hash will be returned instead.

### Example

Using the server pattern "https://{client}.pattern.here" and the [Client ID](client.md#client-id) `test` will return the following URL:
- https://test.pattern.here, if the name test is not in use right now OR
- https://test-3ld8f.pattern.here, with a 5 digits hash.

Otherwise, if the name is not provided, an 8 digits hash will be used instead:
- https://2hv9e4lf.pattern.here

## Using HTTPS

The HTTPS URL is only available for certified servers. Provide the certification path and the key path using `-tls-cert` and `-tls-key` respectively. The HTTPS port can be changed using the `-https` option.

### Example

```sh
    ./woole-server \
        -pattern {client}.mywebsite.com \
        -tls-cert "/etc/tls/domain/fullchain.pem" \
        -tls-key "/etc/tls/domain/privkey.pem"
```

**Output:**

```
╒═════════════════════════════════════════════════════╕
│   HTTP listening on: http://{client}.mywebsite.com  |
│  HTTPS listening on: https://{client}.mywebsite.com |
│ Tunnel listening on: grpc://mywebsite.com:9653      |
╘═════════════════════════════════════════════════════╛
```

## Server Authentication

To use the server authentication, generate a shared/symmetric key file (no need to have a special format or length) and use the `-shared-key` providing the file path.

### **Example**

1. **Generate any shared key**:

   ```sh
   openssl rand 32 > shared.key
   ```
   - This command generates a pseudo random 32 bytes binary key.

2. **Usage**:

   Use the same key file in the server and client application:
   ```
   ./woole -shared-key "/path/to/file/shared/key"
   ./woole-server -shared-key "/path/to/file/shared/key"
   ```

