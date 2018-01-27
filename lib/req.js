"use strict";

const { IncomingMessage } = require("http");
const qs = require("qs");
const url = require("url");
const Cookie = require("sfn-cookie");
const CookieSignature = require("cookie-signature");
const typeis = require("type-is");
const basicAuth = require("basic-auth");
const { parseValue: parseAccepts } = require("parse-accepts");
const { assign, getCache, endWith } = require("./util");
const Url = url.parse("http://localhost").constructor;

Url.prototype.toJSON = function toJSON() {
    return this.href;
};

Url.prototype.toString = function toString() {
    return this.href;
}

/**
 * Gets a request header field's (case insensitive) value.
 * @param {string} field
 * @returns {string|void}
 */
IncomingMessage.prototype.get = function get(field) {
    return this.headers[field.toLowerCase()];
};

/**
 * Checks if the request `Content-Type` matches the given types.
 * @param {string[]} types
 * @returns {string|false}
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
        return this.URL.hostname;
    },

    port() {
        return this.URL.port;
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

    ips() {
        return this.proxy.ips.length ? this.proxy.ips : [this.socket.remoteAddress];
    },

    referer() {
        return this.headers.referer;
    },

    keepAlive() {
        return this.headers.connection.toLowerCase() === "keep-alive";
    },

    xhr() {
        return this.headers["x-requested-with"] &&
            this.headers["x-requested-with"].toLowerCase() === "xmlhttprequest";
    },

    accepts() {
        return this._caches.accepts ||
            (this._caches.accepts = parseAccepts(this.headers.accept));
    },

    langs() {
        return this._caches.langs ||
            (this._caches.langs = parseAccepts(this.headers["accept-language"]));
    },

    charsets() {
        return this._caches.charsets ||
            (this._caches.charsets = parseAccepts(this.headers["accept-charset"]));
    },

    cache() {
        return this._caches.cache ||
            (this._caches.cache = getCache(this.headers["cache-control"]));
    }
});

Object.defineProperties(IncomingMessage.prototype, {
    charset: { // Set/Get `Content-Type` only with `charset`.
        enumerable: true,
        get() {
            let type = this.headers["content-type"];
            return type && type.split("=")[1] || this.charsets[0];
        },
        set(v) {
            this.setEncoding(v);
        }
    },

    length: {
        enumerable: true,
        get() {
            return this.headers["content-length"];
        },
        set(v) {
            this.headers["content-length"] = v;
        }
    },

    ip: {
        enumerable: true,
        get() {
            return this.ips[0];
        },
        set(v) {
            this.ips[0] = v;
        }
    },

    accept: {
        enumerable: true,
        get() {
            return this.accepts[0];
        },
        set(v) {
            this.accepts[0] = v;
        }
    },

    lang: {
        enumerable: true,
        get() {
            return this.langs[0];
        },
        set(v) {
            this.langs[0] = v;
        }
    },

    encoding: {
        enumerable: true,
        get() {
            return this.encodings[0];
        },
        set(v) {
            this.encodings[0] = v;
        }
    }
});

module.exports = (options, req) => {
    req.time = Date.now();
    req._caches = {};

    let originAuth = basicAuth(req);
    req.auth = originAuth ? { username: originAuth.name, password: originAuth.pass } : null,
    
    req.proxy = {
            protocol: req.headers["x-forwarded-proto"] || null,
            host: req.headers["x-forwarded-host"] || null,
            ips: req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(/\s*,\s*/) || []
        };
    req.proxy.ip = req.proxy.ips[0];

    // parse cookie pairs
    req.cookies = {};
    let { domain, useProxy, cookieSecret } = options,
        cookies = req.headers["cookie"];
    if (cookies) {
        cookies = cookies.split(/\s*;\s*/);

        for (let cookie of cookies) {
            let pair = cookie.split("="),
                name = pair[0],
                value = decodeURIComponent(pair[1]);

            if (cookieSecret)
                value = CookieSignature.unsign(value, cookieSecret) || value;

            let mark = value.substring(0, 2);
            if (mark === "j:") {
                // parse json
                let _value = value.substring(2);
                try {
                    value = JSON.parse(_value);
                } catch (e) {
                    value = _value;
                }
            } else if (mark === "s:") {
                // deal with string
                value = value.substring(2);
            }
            req.cookies[name] = value;
        }
    }

    req.protocol = req.socket.encrypted ? "https" : (useProxy && proxy.protocol && proxy.protocol || "http");
    req.host = useProxy && proxy.host && proxy.host || req.headers.host;
    req.type = req.headers["content-type"] && req.headers["content-type"].split(";")[0];
    req.encodings = req.headers["accept-encoding"] ? req.headers["accept-encoding"].split(/\s*,\s*/) : [];

    let urlStr = req.protocol + "://" + req.host + req.url,
        URL = url.parse(urlStr);

    // Fix URL properties.
    URL.auth = req.auth && (req.auth.username + ":" + req.auth.password);
    URL.origin = `${URL.protocol}//${URL.host}`;
    URL.username = req.auth && req.auth.username;
    URL.password = req.auth && req.auth.password;
    URL.href = `${URL.protocol}//` + (URL.auth ? URL.auth + "@" : "") + `${URL.host}${URL.path}`;

    req.query = qs.parse(URL.query);
    req.URL = URL;

    // Get domain and subdomain.
    if (domain) {
        let domains = typeof domain === "string" ? [domain] : domain;
        for (let domain of domains) {
            if (endWith(req.hostname, domain)) {
                req.domain = domain;
                req.subdomain = req.hostname.substring(0, req.hostname.length - domain.length - 1);
                break;
            }
        }
    }

    return req;
}