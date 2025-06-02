
[<- Go back to "README"](../README.md)

# Docker

Woole can be built and run using Docker for easier setup and usage. The Dockerfile supports building images for both the client and the server. The [Dockerfile](https://github.com/ECRomaneli/woole/blob/master/docker/Dockerfile) is available under the `docker` folder in the root path of the project.

## Dockerfile Arguments

The Dockerfile accepts the following arguments:

- **`MODULE`**: Specifies which module to build. Possible values are:
  - `client` (default): Builds the Woole client.
  - `server`: Builds the Woole server.
- **`VERSION`**: Specifies the version of the source code to use. Possible values are:
  - any specific tag or branch, such as `v1.0.0` or `master`.
  - or `latest` (default) for last released version (non pre-release).

### Example:

```sh
docker build -t {name-and-tag} --build-arg MODULE=server --build-arg VERSION=v1.2.3-example -f Dockerfile .
```

## Building and Running the Images

Download the [Dockerfile](https://github.com/ECRomaneli/woole/blob/master/docker/Dockerfile) or copy the code to a local file, open the terminal, go to the folder where the [Dockerfile](https://github.com/ECRomaneli/woole/blob/master/docker/Dockerfile) is located, and follow the [Build Locally](#build-locally) section.

Alternatively, use one of the [Build One-Liners](#build-one-liners) to build the project with a single command.

### Build Locally

In the same folder as the Dockerfile, follow the instructions below.

#### Client

To build and run the Woole client:

```sh
docker build -t woole --build-arg VERSION=v1.2.3-example -f Dockerfile .
```

- The default module is client, so the `MODULE=client` does not need to be specified.
- `VERSION=v1.2.3-example` indicates that version `v1.2.3-example` of the repository will be used.

#### Server

```sh
docker build -t woole-server --build-arg MODULE=server --build-arg VERSION=v1.2.3-example -f Dockerfile .
```

- `MODULE=server` specifies the build target as the Woole Server.
- `VERSION=v1.2.3-example` indicates that version `v1.2.3-example` of the repository will be used.

### Build One-Liners

Run one of the following commands to automatically download the latest Dockerfile and create the Woole docker image.

#### Using curl

Client:

```sh
curl -s https://raw.githubusercontent.com/ECRomaneli/woole/master/docker/Dockerfile | docker build --no-cache -t woole -f - .
```

Server:

```sh
curl -s https://raw.githubusercontent.com/ECRomaneli/woole/master/docker/Dockerfile | docker build --no-cache -t woole-server --build-arg MODULE=server -f - .
```

#### Using wget

Client:

```sh
wget -4 -q -O - https://raw.githubusercontent.com/ECRomaneli/woole/master/docker/Dockerfile | docker build --no-cache -t woole -f - .
```

Server:

```sh
wget -4 -q -O - https://raw.githubusercontent.com/ECRomaneli/woole/master/docker/Dockerfile | docker build --no-cache -t woole-server --build-arg MODULE=server -f - .
```

## How to use

### Client

To run the Woole client:

Run the client:
```sh
docker run --rm -p 8000:8000 woole $ARGS
```

- The client will be available on port `8000` (sniffer/dashboard).
- Replace `$ARGS` with any additional arguments you want to pass to the client (see the [Client Options](client.md#available-options) section).

### Server

To run the Woole server:

Run the server:
```sh
docker run --rm -p 9653:9653 -p 80:80 woole-server $ARGS
```

- The server will be available on ports `9653` (tunnel) and `80` (HTTP).
- Replace `$ARGS` with any additional arguments you want to pass to the server (see the [Server Options](server.md#available-options) section).

### Examples

#### Server with default configuration

```sh
docker run --rm -p 9653:9653 -p 80:80 woole-server
```

#### Client with a configured tunnel

```sh
docker run --rm -p 8000:8000 woole -proxy http://localhost:8080 -tunnel woole.me
```

*If the server and client are running in the same machine, remember to put the tunnel URL to a network visible on both containers. The docker option `--network host` can also be used. However, it is not recommended for security reasons.*

For more information on available options, refer to the Client and Server sections.
