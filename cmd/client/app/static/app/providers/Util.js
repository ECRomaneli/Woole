app.provide('$util', {
    parseContentType: (contentType) => {
        let content = {}

        if (contentType === void 0 || contentType === '') { return content }

        // workaround for array headers mixed up with headers separated by semicolon
        let tokens = contentType.toLowerCase().split(";").map(str => str.trim())

        // Parse the xxxx/yyyyy content-type
        let categoryAndType = tokens.shift().split('/')
        content.category = categoryAndType[0]
        content.type = categoryAndType[1]

        // Parse other possible tokens
        for (let token in tokens) {
            token.startsWith("charset=") && (content.charset = token.substring(8))
        }

        return content
    },

    parseBody: (obj) => {
        if (!obj.body) { return }
        obj.b64Body = obj.body
        obj.body = atob(body)
    },

    parseRequestToCurl(req) {

    }
});