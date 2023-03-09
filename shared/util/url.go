package util

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

const ()

var (
	defaultPortByScheme map[string]int = map[string]int{
		"http":  80,
		"https": 443,
	}
)

func GetDefaultPort(scheme string) int {
	if port, exists := defaultPortByScheme[scheme]; exists {
		return port
	}
	return -1
}

func GetDefaultPortStr(scheme string) string {
	if port := GetDefaultPort(scheme); port != -1 {
		return strconv.Itoa(port)
	}
	return ""
}

func RawUrlToUrl(rawUrl string, defaultSchema string, defaultPort string) *url.URL {

	// Pattern: ":<port>"
	if strings.Index(rawUrl, ":") == 0 {
		rawUrl = "localhost" + rawUrl
	}

	// Pattern: "<hostname>[:port]"
	if !strings.Contains(rawUrl, "://") {
		rawUrl = defaultSchema + "://" + rawUrl
	}

	url, err := url.Parse(rawUrl)
	if err != nil {
		panic(fmt.Sprintf("Unexpected Url format: %s. Error: %s", rawUrl, err.Error()))
	}

	// Pattern: "[<scheme>://]<hostname>"
	if !strings.Contains(url.Host, ":") && defaultPort != "" {
		url.Host += ":" + defaultPort
	}

	return url
}