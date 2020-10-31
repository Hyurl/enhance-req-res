"use strict";

const URL = require("url6").default;
const CookieSignature = require("cookie-signature");
const typeis = require("type-is");
const basicAuth = require("basic-auth");
const parseAccepts = require("parse-accepts").parseValue;
const endsWith = require("lodash/endsWith");
const http = require("http");
const http2 = require("./util").http2;
const readonly = require("./util").readonly;
const getCache = require("./util").getCache;
const comma = /\s*,\s*/;
const semicolon = /\s*;\s*/;

class Request {
    /**
     * Gets a request header field's (case insensitive) value.
     * @param {string} field
     * @returns {string|void}
     */
    get(field) {
        return this.headers[field.toLowerCase()];
    }

    /**
     * Checks if the request `Content-Type` matches the given types.
     * @param {string[]} types
     * @returns {string|false}
     */
    is() {
        return typeis.apply(void 0, [this].concat(Array.from(arguments)));
    }

    /**
     * Set/Get `Content-Type` only with `charset`.
     * @returns {string}
     */
    get charset() {
        let type = this.headers["content-type"];
        return type && type.split("=")[1] || this.charsets[0];
    }

    set charset(v) {
        this.setEncoding(v);
    }

    /**
     * The `Content-Length` of requested body.
     * @returns {number}
     */
    get length() {
        return parseInt(this.headers["content-length"] || 0);
    }

    set length(v) {
        this.headers["content-length"] = v;
    }

    /**
     * The real client IP, if `useProxy` is `true`, then trying to use 
     * `proxy`'s `ip` first.
     */
    get ip() {
        return this.ips[0];
    }

    set ip(v) {
        this.ips[0] = v;
    }

    /** 
     * The first accepted response content type (`accepts[0]`).
     * @returns {string}
     */
    get accept() {
        return this.accepts[0];
    }

    set accept(v) {
        this.accepts[0] = v;
    }

    /**
     * The first accepted response language (`accepts[0]`).
     * @returns {string}
     */
    get lang() {
        return this.langs[0];
    }

    set lang(v) {
        this.langs[0] = v;
    }

    /**
     * The first accepted response encodings (`encodings[0]`).
     * @returns {string}
     */
    get encoding() {
        return this.encodings[0];
    }

    set encoding(v) {
        this.encodings[0] = v;
    }
}

/** Extends properties */
readonly(Request.prototype, {
    secure() {
        return this.protocol === "https";
    },
    hostname() {
        return this.urlObj.hostname;
    },
    port() {
        return Number(this.urlObj.port);
    },
    path() {
        return this.urlObj.path;
    },
    pathname() {
        return this.urlObj.pathname;
    },
    search() {
        return this.urlObj.search;
    },
    href() {
        return this.urlObj.href;
    },
    origin() {
        return this.headers.origin || this.urlObj.origin;
    },
    ips() {
        return this.proxy && this.proxy.ips.length
            ? this.proxy.ips
            : [this.socket.remoteAddress];
    },
    referer() {
        return this.headers.referer;
    },
    keepAlive() {
        return this.headers.connection.toLowerCase() === "keep-alive";
    },
    xhr() {
        return this.headers["x-requested-with"]
            ? this.headers["x-requested-with"].toLowerCase() === "xmlhttprequest"
            : false;
    },
    accepts() {
        return this._cache.accepts ||
            (this._cache.accepts = parseAccepts(this.headers.accept));
    },
    langs() {
        return this._cache.langs ||
            (this._cache.langs = parseAccepts(this.headers["accept-language"]));
    },
    charsets() {
        return this._cache.charsets ||
            (this._cache.charsets = parseAccepts(this.headers["accept-charset"]));
    },
    cache() {
        return this._cache.cache ||
            (this._cache.cache = getCache(this.headers["cache-control"]));
    }
});

function hasProxy(req) {
    return req.headers["x-forwarded-proto"]
        || req.headers["x-forwarded-host"]
        || req.headers["x-forwarded-for"];
}

exports.handle = (options, req) => {
    req.time = Date.now();
    req._cache = {};
    req.cookies = {};

    let proxy;
    if (hasProxy(req)) {
        proxy = {
            protocol: req.headers["x-forwarded-proto"] || null,
            host: req.headers["x-forwarded-host"] || null,
            ips: req.headers["x-forwarded-for"]
                ? req.headers["x-forwarded-for"].split(comma)
                : [],
            ip: null
        };
        proxy.ip = proxy.ips[0];
        req.proxy = proxy;
    } else {
        proxy = {};
        req.proxy = null;
    }

    // parse cookie pairs
    let domain = options.domain,
        useProxy = options.useProxy,
        cookieSecret = options.cookieSecret,
        cookies = req.headers["cookie"];

    if (cookies) {
        cookies = cookies.split(semicolon);

        for (let cookie of cookies) {
            let pair = cookie.split("="),
                name = pair[0],
                value = decodeURIComponent(pair[1]);

            if (cookieSecret)
                value = CookieSignature.unsign(value, cookieSecret) || value;

            let mark = value.slice(0, 2);
            if (mark === "j:") {
                // parse json
                let _value = value.slice(2);
                try {
                    value = JSON.parse(_value);
                } catch (e) {
                    value = _value;
                }
            } else if (mark === "s:") {
                // deal with string
                value = value.slice(2);
            }

            req.cookies[name] = value;
        }
    }

    req.protocol = req.socket.encrypted
        ? "https"
        : (useProxy && proxy.protocol ? proxy.protocol : "http");
    req.host = useProxy && proxy.host
        ? proxy.host
        : (req.headers.host || req.headers[":authority"]);
    req.type = req.headers["content-type"]
        && req.headers["content-type"].split(";")[0];
    req.encodings = req.headers["accept-encoding"]
        ? req.headers["accept-encoding"].split(comma)
        : [];

    let urlObj = new URL(req.protocol + "://" + req.host + req.url);

    req.query = urlObj.query || {};
    req.urlObj = req.URL = urlObj;

    let originAuth = basicAuth(req);
    req.auth = originAuth ? {
        username: originAuth.name,
        password: originAuth.pass
    } : urlObj.auth;

    // Get domain and subdomain.
    if (domain) {
        let domains = typeof domain === "string" ? [domain] : domain;

        for (let domain of domains) {
            if (endsWith(urlObj.hostname, domain)) {
                req.domainName = domain;
                req.subdomain = urlObj.hostname.slice(
                    0,
                    urlObj.hostname.length - domain.length - 1
                );

                break;
            }
        }
    }

    return req;
};

class Http2Request { }
Object.assign(Http2Request.prototype, Request.prototype);

// inheritance hack
Object.setPrototypeOf(Request, http.IncomingMessage);
Object.setPrototypeOf(Request.prototype, http.IncomingMessage.prototype);

if (http2) {
    Object.setPrototypeOf(Http2Request, http2.Http2ServerRequest);
    Object.setPrototypeOf(
        Http2Request.prototype,
        http2.Http2ServerRequest.prototype
    );
}

exports.default = exports.Request = Request;
exports.Http2Request = Http2Request;
