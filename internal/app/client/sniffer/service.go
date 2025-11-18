package sniffer

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"io"
	"slices"
	"woole/internal/app/client/app"
	"woole/internal/app/client/recorder"

	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
)

var records = recorder.GetRecords()
var config = app.ReadConfig()
var ignoreContentEncodings = []string{
	"", // empty
	"compress",
	"identity",
}

func ListenAndServe() error {
	return setupServer().ListenAndServe(":" + config.SnifferUrl.Port())
}

func decompress(contentEncoding string, data []byte) []byte {

	if data == nil || slices.Contains(ignoreContentEncodings, contentEncoding) {
		return data
	}

	switch contentEncoding {
	case "gzip":
		reader, err := gzip.NewReader(bytes.NewReader(data))
		panicIfNotNil(err)
		return readReadCloser(reader)
	case "br":
		return readBrotli(brotli.NewReader(bytes.NewReader(data)))
	case "deflate":
		return readReadCloser(flate.NewReader(bytes.NewReader(data)))
	case "zstd":
		decoder, err := zstd.NewReader(bytes.NewReader(data))
		panicIfNotNil(err)
		return readZstd(decoder)
	}

	panic("Unsupported content encoding: " + contentEncoding)
}

func readReadCloser(reader io.ReadCloser) []byte {
	defer func() {
		if reader != nil {
			err := reader.Close()
			panicIfNotNil(err)
		}
	}()

	data, err := io.ReadAll(reader)
	panicIfNotNil(err)

	return data
}

func readZstd(reader *zstd.Decoder) []byte {
	defer reader.Close()

	data, err := io.ReadAll(reader)
	panicIfNotNil(err)

	return data
}

func readBrotli(reader *brotli.Reader) []byte {
	data, err := io.ReadAll(reader)
	panicIfNotNil(err)

	return data
}

func panicIfNotNil(err any) {
	if err != nil {
		panic(err)
	}
}
