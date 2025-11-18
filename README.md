<p align="center"><a href="https://github.com/ECRomaneli/woole"><img src="https://i.postimg.cc/44W825Fd/logo.png" alt='Woole'></a></p>
<p align='center'>
    Woole (a shortened form of "Wormhole") is an open-source project for reverse proxying, sniffing, and tunneling, developed in Go
</p>
<p align="center">
<a href="https://github.com/ECRomaneli/woole/releases"><img src="https://img.shields.io/github/v/tag/ecromaneli/woole?label=version&sort=semver&style=for-the-badge" alt="Version"></a>
<a href="https://github.com/ECRomaneli/woole/commits/master"><img src="https://img.shields.io/github/last-commit/ecromaneli/woole?style=for-the-badge" alt="Last Commit"></a>
<a href="https://github.com/ECRomaneli/woole/blob/master/LICENSE"><img src="https://img.shields.io/github/license/ecromaneli/woole?style=for-the-badge" alt="License"></a>
<a href="https://github.com/ECRomaneli/woole/issues"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=for-the-badge" alt="Contributions Welcome"></a>
</p>

## Summary

- [How it Works](#how-it-works)
- [Getting Started](#getting-started)
- [Sniffer](#sniffer)
- [Server](#wooleme-server)
- [Download](#download)
- [Docker](#docker)
- [Build](#build)
- [Author](#author)
- [Disclaimer](#disclaimer)
- [License](#license)

## Documentations


| [Client](docs/client.md) | [Server](docs/server.md) | [Docker](docs/docker.md) | [Sniffer](docs/sniffer.md) | [Special Types](docs/special-types.md) |

## How it Works

Woole consists of two primary modules: the Woole Client and the Woole Server. The server establishes a gRPC tunnel, facilitates the transmission of requests to the client, and awaits corresponding responses. The client, utilizing the configured tunnel, processes incoming requests, performs reverse-proxy operations, logs the relevant data, and returns the responses to the server. Additionally, the client includes an integrated sniffing tool for enhanced request analysis and debugging.

&nbsp;

<p align='center'>
    <a href="https://github.com/ECRomaneli/woole" style='text-decoration:none'>
        <img src="https://i.postimg.cc/xT2bh1jC/woole-arch.png" alt='woole architecture'>
    </a>
</p>

## Getting Started

### Proxying the local port `8080` and serving into the local port `81`:

Working completely **offline**.

```sh
./woole -http 81 -proxy 8080
```

**Output:**

```
╒══════════════════════════════════╕
│  HTTP URL: http://localhost:81   │
│  Proxying: http://localhost:8080 │
│   Sniffer: http://localhost:8000 │
│ Expire At: never                 │
╘══════════════════════════════════╛
```

### Proxying the `github.com` website and serving into the local port `81`:

Analyze the requests of any website.

```sh
./woole -http 81 -proxy https://github.com
```

**Output:**

```
╒══════════════════════════════════╕
│  HTTP URL: http://localhost:81   │
│  Proxying: https://github.com    │
│   Sniffer: http://localhost:8000 │
│ Expire At: never                 │
╘══════════════════════════════════╛
```

### Using the tunnel to connect with an external server

The server is only needed to receive requests from the internet and expose the responses.

```sh
./woole -proxy https://github.com -tunnel woole.me -client anything
```

**Output:**

```
╒══════════════════════════════════════╕
│  HTTP URL: http://anything.woole.me  │
│ HTTPS URL: https://anything.woole.me │
│  Proxying: https://github.com        │
│   Sniffer: http://localhost:8000     │
│ Expire At: never                     │
╘══════════════════════════════════════╛
```

## Sniffer

<p align='center'>
    <a href="https://github.com/ECRomaneli/woole" style='text-decoration:none'>
        <img src="https://i.postimg.cc/zfQBxYbx/sniffer.png" alt='Sniffing Tool'>
    </a>
</p>

The sniffing tool is accessible through the port configured using the `sniffer` option (default port is available in the [client options list](docs/client.md#available-options)). To change the port use:

```sh
./woole -sniffer 9094
```

#### Features
- Light/Dark Theme;
- Deep Search (status, host, url, name, headers, request body, cookies);
- Media preview (audio, video [chunks are not supported], and images);
- Replay requests with or without changes (with editor);
- Generate request cURLs;
- ACE Editor as viewer for the request and response body;
- Beautify XML, HTML, JSON, javascript, and CSS bodies.

#### [Documentation](docs/sniffer.md)

## Woole.me Server

The https://woole.me website was created to offer a free-to-use Woole Server. Simply connect using the tunnel URL `woole.me`.

```
./woole [...] -tunnel woole.me
```

Please note that the virtual machine has limited resources, so we kindly ask that you use it in moderation. The server will always run the latest released version of Woole.

Keep in mind that the website’s availability may change without prior notice.

## Create Your Own Server

[Download](#download), [build](#build.md), or [run the container](#docker) of the "Woole Server" and follow the [Server Documentation](docs/server.md) to learn how to configure it. Woole is an open-source project, there are no restrictions of use. 

#### [Documentation](docs/server.md)

## Download

Pre-built binaries for the client and server are available in the [Releases](https://github.com/ECRomaneli/woole/releases) section. Follow the steps below to download and use them:

### Windows

1. Visit the [Releases Page](https://github.com/ECRomaneli/woole/releases) and download the appropriate binary for your platform (e.g., `woole-windows-x64.zip`).
2. Extract the downloaded file using a compression tool (or just double-click the zip file).
3. Open a Command Prompt or PowerShell in the folder where the binaries were extracted.
4. Run the binaries:
    ```sh
    ./woole.exe --help
    ./woole-server.exe --help
    ```
5. **(Optional)** Add the folder containing the binaries to your PATH environment variable for easier access.

### MacOS/Linux

1. Visit the [Releases Page](https://github.com/ECRomaneli/woole/releases) and download the appropriate binary for your platform (e.g., `woole-linux-x64.zip`, `woole-macos-arm64.zip` or `woole-macos-x64.zip`).
2. Navigate to the download folder and extract the downloaded file:
   ```sh
   unzip woole-<version>-<platform>.zip
   ```
3. Make the binaries executable:
    ```sh
    chmod +x woole woole-server
    ```
4. **(Optional)** Move the binaries to a directory in your `PATH`:
    ```sh
    sudo mv woole woole-server /usr/local/bin/
    ```
5. Run the binaries:
    ```sh
    ./woole --help
    ./woole-server --help

    # If the binaries are in your PATH variable
    woole --help
    woole-server --help
    ```

*Some systems may need administrator permissions to bind well known ports (e.g. 80, 443, etc.)*

## Docker

Woole can be built and run using Docker for easier setup and usage. The Dockerfile supports building images for both the client and the server. The [Dockerfile](https://github.com/ECRomaneli/woole/blob/master/docker/Dockerfile) is available under the `docker` folder in the root path of the project.

For more details, consult the step-by-step instructions [here](docs/docker.md).

#### [Documentation](docs/docker.md)

## Build

#### Requirements:

- Golang 1.25;
- protoc (only for protobuf changes);

#### Steps:

```sh
git clone --depth 1 https://github.com/ecromaneli/woole.git
cd woole

# to build the client
go build -o ./bin/woole ./cmd/client
chmod +x ./bin/woole

# to build the server
go build -o ./bin/woole-server ./cmd/server
chmod +x ./bin/woole-server
```

The executables will be available under the folder `bin`. Use `-help` to see the available options or see the documentation of the [client](docs/client.md) and the [server](docs/server.md).

## Author

- Created by [Emerson Capuchi Romaneli](https://github.com/ECRomaneli) (@ECRomaneli).

## Disclaimer

The Woole project, the woole.me website and all its contributors are not responsible for and do not encourage the use of this tool for any illegal activity. You as the user are solely responsible for its use. Report cybercrimes.

## License

[MIT License](https://github.com/ECRomaneli/woole/blob/master/LICENSE)