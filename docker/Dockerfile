FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git curl jq

ARG VERSION=latest
ARG MODULE=client
ARG ARGS=""

WORKDIR /app

# Fetch the latest release if VERSION is not provided
RUN if [ "${VERSION}" = "latest" ]; then \
      VERSION=$(curl -s https://api.github.com/repos/ecromaneli/woole/releases/latest | jq -r .tag_name); \
    fi && \
    echo "Using version: ${VERSION}" && \
    git clone --depth 1 --branch ${VERSION} https://github.com/ecromaneli/woole.git . && \
    sed -i "s/{{VERSION}}/${VERSION}/g" internal/app/${MODULE}/app/settings.go

# Build the binary
RUN cd cmd/${MODULE} && go build -a -o ../../bin/woole .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/bin/woole .

ENTRYPOINT ["./woole"]