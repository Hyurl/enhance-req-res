const { IncomingMessage } = require("http");
const qs = require("qs");
const url = require("url");
const Cookie = require("sfn-cookie");
const cookieSignature = require("cookie-signature");
const typeis = require("type-is");
const basicAuth = require("basic-auth");
const { assign, parseHost, parseAccepts, getCache, getReqCookies } = require("./util");
const comma = /\s*,\s*/;
const semicolon = /\s*;\s*/;

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
        return this.URL.hostname || this.host && parseHost(this.host)[0];
    },
    
    port() {
        return this.URL.port || this.host && parseHost(this.host)[1] || null;
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
            this.headers["x-requested-with"].toLowerCase() === "XMLHttpRequest";
    },
    
    accepts() {
        if (!this._caches.accepts)
            this._caches.accepts = parseAccepts(this.headers.accept);
        return this._caches.accepts;
    },
    
    langs() {
        if (!this._caches.langs)
            this._caches.langs = parseAccepts(this.headers["accept-language"]);
        return this._caches.langs;
    },
    
    charsets() {
        if (!this._caches.charsets)
            this._caches.charsets = parseAccepts(this.headers["accept-charset"]);
        return this._caches.charsets
    },

    cache() {
        if(!this._caches.cache)
            this._caches.cache = getCache(this.headers["cache-control"]);
        return this._caches.cache;
    }
});

Object.defineProperties(IncomingMessage.prototype, {
    charset: { // Set/Get `Content-Type` only with `charset`.
        enumerable: true,
        get() {
            let type = this.headers["content-type"]
            return type && type.split(/\s*;\s*charset=/)[1] || this.charsets[0];
        },
        set(charset) {
            this.setEncoding(charset);
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

    let { domain, useProxy, cookieSecret } = options,
        URL = url.parse(req.url),
        originAuth = basicAuth(req),
        auth = !originAuth ? null : {
            username: originAuth.name,
            password: originAuth.pass
        },
        cookies = getReqCookies(req),
        proxy = {
            protocol: req.headers["x-forwarded-proto"] || null,
            host: req.headers["x-forwarded-host"] | null,
            ips: req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(comma) || [],
            ip: null,
        };

    proxy.ip = proxy.ips[0];

    // parse cookie pairs
    for (let name in cookies) {
        if (cookieSecret) // unsign cookie
            cookies[name] = cookieSignature.unsign(cookies[name], cookieSecret) || cookies[name];

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

    // set request properties
    Object.assign(req, {
        _caches: {},
        URL,
        time: Date.now(),
        proxy,
        auth: auth,
        protocol: req.socket.encrypted ? "https" : (useProxy && proxy.protocol ? proxy.protocol : "http"),
        host: useProxy && proxy.host ? proxy.host : req.headers.host,
        query: qs.parse(URL.query),
        type: req.headers["content-type"] && req.headers["content-type"].split(semicolon)[0],
        cookies,
        encodings: req.headers["accept-encoding"] ? req.headers["accept-encoding"].split(comma) : [],
    });

    // Set properties to URL.
    URL.protocol = req.protocol + ":";
    URL.auth = req.auth && (req.auth.username + ":" + req.auth.password);
    URL.host = req.host;
    URL.hostname = req.hostname;
    URL.port = req.port;
    URL.origin = `${URL.protocol}//${URL.host}`;
    URL.username = req.auth && req.auth.username;
    URL.password = req.auth && req.auth.password;
    URL.href = `${URL.protocol}//` + (URL.auth ? URL.auth + "@" : "") + `${URL.host}${URL.path}`;
    URL.__proto__.toString = function toString() {
        return this.href;
    };
    URL.__proto__.toJSON = function toJSON() {
        return this.href;
    };

    // Get subdomain.
    req.subdomain = domain && domain.substring(0, req.hostname.length - domain.length - 1);

    return req;
}