const { IncomingMessage } = require("http");
const qs = require("qs");
const url = require("url");
const Cookie = require("sfn-cookie");
const cookieSignature = require("cookie-signature");
const typeis = require("type-is");
const basicAuth = require("basic-auth");
const { assign, parseHost, parseAccepts, getCache, getValues, getReqCookies } = require("./util");

/**
 * Gets a request header field's (case insensitive) value.
 * @param {String} field
 * @returns {String|void}
 */
IncomingMessage.prototype.get = function get(field) {
    return this.headers[field.toLowerCase()];
};

/**
 * Checks if the request `Content-Type` matches the given types.
 * @param {String[]} types
 * @returns {String|false}
 */
IncomingMessage.prototype.is = function is(...types) {
    return typeis(this, ...types);
}

/** Extends IncomingMessage properties */
assign(IncomingMessage.prototype, {
    secure() {
        return this.protocol === "https";
    },
    hostname() {
        return this.host && parseHost(this.host)[0];
    },
    port() {
        return this.host && parseHost(this.host)[1] || null;
    },
    path() {
        return this.URL.path;
    },
    pathname() {
        return this.URL.pathname;
    },
    search() {
        return this.URL.search;
    },
    href() {
        return this.URL.href;
    },
    origin() {
        return this.headers.origin || this.URL.origin;
    },
    length() {
        return this.headers["content-length"];
    },
    ip() {
        return this.ips[0];
    },
    ips() {
        return this.proxy.ips.length ? this.proxy.ips : [this.socket.remoteAddress];
    },
    accept() {
        return this.accepts[0];
    },
    lang() {
        return this.langs[0];
    },
    encoding() {
        return this.encodings[0];
    },
    referer() {
        return this.headers.referer;
    },
    keepAlive() {
        return this.headers.connection.toLowerCase() === "keep-alive";
    },
    xhr() {
        return this.headers["x-requested-with"] &&
            this.headers["x-requested-with"].toLowerCase() === "XMLHttpRequest";
    },
})

module.exports = (options, req) => {

    // Extends instance Properties

    let comma = /\s*,\s*/,
        { domain, useProxy, cookieSecret } = options,
        URL = url.parse(req.url),
        type = req.headers["content-type"] ? req.headers["content-type"].split(/\s*;\s*charset=/) : [],
        proxy = {},
        originAuth = basicAuth(req),
        auth = !originAuth ? null : {
            username: originAuth.name,
            password: originAuth.pass
        },
        cookies = getReqCookies(req);

    // parse cookie pairs
    for (let name in cookies) {
        if (cookieSecret) // unsign cookie
            cookies[name] = cookieSignature.unsign(cookies[name], cookieSecret);

        let mark = cookies[name].substring(0, 2);
        if (mark === "j:") {
            // parse json
            try {
                cookies[name] = JSON.parse(cookies[name].substring(2));
            } catch (e) {
                cookies[name] = cookies[name].substring(2);
            }
        } else if (mark === "s:") {
            // deal with string
            cookies[name] = cookies[name].substring(2);
        }
    }

    // set proxy properties
    assign(proxy, {
        protocol: req.headers["x-forwarded-proto"],
        host: req.headers["x-forwarded-host"],
        ip: () => proxy.ips[0],
        ips: () => {
            if (req.headers["x-forwarded-for"])
                return req.headers["x-forwarded-for"].split(comma);
            else
                return [];
        }
    });

    // set request properties
    assign(req, {
        URL,
        time: Date.now(),
        proxy,
        auth: auth,
        protocol: req.socket.encrypted ? "https" : (useProxy && proxy.protocol ? proxy.protocol : "http"),
        host: useProxy && proxy.host ? proxy.host : req.headers.host,
        subdomain: () => domain && domain.substring(0, req.hostname.length - domain.length - 1),
        query: () => qs.parse(URL.query),
        type: type[0],
        cookies,
        accepts: parseAccepts(req.headers["accept"]),
        langs: parseAccepts(req.headers["accept-language"]),
        encodings: req.headers["accept-encoding"] ? req.headers["accept-encoding"].split(comma) : [],
        charsets: parseAccepts(req.headers["accept-charset"]),
        cache: getCache(req.headers["cache-control"]),
    });

    Object.defineProperty(req, "charset", {
        get: () => type[1] || req.charsets[0],
        set: (v) => req.setEncoding(v)
    });

    // Set properties to URL.
    URL.protocol = req.protocol + ":";
    URL.auth = req.auth ? getValues(req.auth).join(":") : null;
    URL.host = req.host;
    URL.hostname = req.hostname;
    URL.port = req.port;
    URL.origin = `${URL.protocol}://${URL.host}`;
    URL.username = req.auth && req.auth.username;
    URL.password = req.auth && req.auth.password;
    URL.href = `${URL.protocol}://` + (URL.auth ? URL.auth + "@" : "") + `${URL.host}${URL.path}`;
    URL.toString = function () {
        return this.href;
    };
    URL.toJSON = function () {
        return this.href;
    };

    return req;
}