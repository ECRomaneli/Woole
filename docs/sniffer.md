[<- Go back to "README"](../README.md)

# Sniffing Tool

<p align='center'>
    <a href="https://github.com/ECRomaneli/woole" style='text-decoration:none'>
        <img src="https://i.postimg.cc/zfQBxYbx/sniffer.png" alt='Sniffing Tool'>
    </a>
</p>

The sniffing tool is accessible through the port configured using the `sniffer` option (default port is available in the [options list](client.md#available-options)). To change the port use:

```sh
./woole -sniffer 9094
```

## Features
- Light/Dark Theme;
- Deep Search (status, host, url, name, headers, request body, cookies);
- Media preview (audio, video [chunks are not supported], and images);
- Replay requests with or without changes (with editor);
- Generate request cURLs;
- ACE Editor as viewer for the request and response body;
- Beautify XML, HTML, JSON, javascript, and CSS bodies.

## Search Engine

Woole incorporates a powerful search engine available as the [woole-search](https://www.npmjs.com/package/woole-search) npm package. This engine enables complex querying capabilities including boolean operators, regex matching, and numeric range searches.

### Basic Query Syntax

- Simple search: `term` - Finds objects containing "term" in any field
- Field-specific: `field:value` - Searches for "value" in the specified field
- Boolean operations: `term1 and term2`, `term1 or term2`
- Negation: `not term` - Excludes objects matching the term
- Grouping: `(term1 or term2) and term3`

For complete documentation, examples, and advanced usage:
- [Search-Engine Repository](https://github.com/ECRomaneli/Search-Engine#readme)

## Deep Search

The search uses the pattern `root.parent.child: value` recursively where one or more levels can be used starting from the root parent or not. The value is optional. The root parent is not required, the search can start by any level.

For instance, to search for a specific header called `Content-Type`, the following options are valid:

```
Content-Type
header.Content-Type
response.header.Content-Type
```

and to search for `XML` bodies:

```
response.header.Content-Type: xml
```

Note that the value does not need to match the entire field. Also, the response body is not available when searching, because the response body is loaded on demand to reduce the resources and increase the performance of the sniffer.

## Regex

Using the separator `*:` instead of `:`, the right side of the query will be parsed as a regex. Example:

```
response.code *: ^2[0-9]{2}$
```

## Number Range

Using the separator `~:` instead of `:`, the right side of the query will be parsed as a range. The left side of the query must be a parsable float. Example:

```
response.elapsed ~: 0ms-101ms
```

Note that non-numeric characters are also allowed. However, they will not be validated or parsed. They are a semanthic help to the developer.

## Hierarchical Structure

```
request
├── proto: string (Protocol)
├── method: string (HTTP Verbs)
├── remoteAddr: string
├── url: string
├── path: string
├── header
│   ├── name_1: string
│   └── name_n: string
└── body: text
response
├── proto: string (Protocol)
├── status: string (e.g. Not Found)
├── code: int (e.g. 404)
├── codeGroup: string (e.g. 4xx)
├── header
│   ├── name_1: string
│   └── name_n: string
├── elapsed: int
└── serverElapsed: int
```