const { STATUS_CODES, ServerResponse } = require("http");
const etag = require("etag");
const fresh = require("fresh");
const mime = require("mime-types");
const Cookie = require("sfn-cookie");
const CookieSignature = require("cookie-signature");
const HtmlTags = require("html-tags");
const sendStream = require("send");
const contentDisposition = require("content-disposition");
const { capitalize, getCache, getResCookies, startWith } = require("./util");

/**
 * Gets a response header field's (case insensitive) value.
 * @param {string} field
 * @returns {string|string[]|void}
 */
ServerResponse.prototype.get = function get(field) {
    return typeof field === "string" ? this.getHeader(field) : null;
};

/**
 * Sets a response header field's (case insensitive) value.
 * @param {string} field
 * @param {string|string[]} value
 * @returns {void}
 */
ServerResponse.prototype.set = function set(field, value) {
    this.headers[field] = value;
};

/**
 * Appends a value to a response header field (case insensitive).
 * @param {string} field
 * @param {string} value
 * @returns {void}
 */
ServerResponse.prototype.append = function (field, value) {
    let origin = this.get(field);
    if (origin === undefined || origin === null) {
        value = [value];
    } else {
        value = Array.isArray(origin) ? origin.concat(value) : [origin].concat(value);
    }
    this.headers[field] = value;
};

/**
 * Removes a response header field.
 * @param {string} field
 * @returns {void}
 */
ServerResponse.prototype.remove = function remove(field) {
    delete this.headers[field];
};

/**
 * Sets/Gets cookies.
 * @param {string} name
 * @param {string} value
 * @param {{[x:string]:string|number|Date}} opts Include:
 *  - `maxAge: number` How many seconds that this cookie should last.
 *  - `expires: number|string|Date`: Keep alive to a specified date or time.
 *  - `sameSite`: Honor same-site principle, could be either `strict` or `lax`.
 *  - `domain`: Set cookie for a specified domain name.
 *  - `path`: Set cookie for a specified pathname.
 *  - `httpOnly`: Only HTTP, not JavaScript, can access this cookie.
 *  - `secure`: This cookie won't be sent if not using HTTPS protocol.
 * @returns {void}
 */
ServerResponse.prototype.cookie = function cookie(name, value = undefined, opts = {}) {
    if (value === undefined) {
        return this.cookies[name];
    } else if (value === null) {
        this.cookies[name] = null;
    } else {
        this.cookies[name] = new Cookie(name, value, opts);
    }
};

/**
 * Makes an HTTP basic authentication.
 * @param {string} realm Often used as dialog title.
 * @returns {void}
 */
ServerResponse.prototype.auth = function auth(realm = "HTTP Authentication") {
    realm = `Basic realm="${realm}"`;
    this.status = 401;
    this.headers["WWW-Authenticate"] = realm;
    this.end();
};

/**
 * Clears authentication.
 * @returns {void}
 */
ServerResponse.prototype.unauth = function unauth() {
    return this.auth();
};

/**
 * Redirects the request to a specified URL.
 * @param {string|number} url If set to `-1`, that means go back to the 
 *  previous page.
 */
ServerResponse.prototype.redirect = function redirect(url, code = 302) {
    this.code = code;
    this.location = url === -1 ? this._req.referer : url;
    this.end();
}

/**
 * Sends contents to the client, and automatically performs type checking.
 * @param {any} data Could be a string of `text`, `html`, `xml`, a buffer,
 *  or any object that can be serialized by `JSON.stringify()`.
 * @returns {void}
 */
ServerResponse.prototype.send = function send(data) {
    if (this._req.method == "HEAD" || data === null || data === undefined) {
        this.end();
        return;
    } else if (typeof data === "string") {
        // string
        if (!this.type) {
            let _data = data.trim();
            if ((_data[0] === "{" && _data[_data.length - 1] == "}") ||
                (_data[0] === "[" && _data[_data.length - 1] == "]")) {
                this.type = "application/json";
            } else if (_data[_data.length - 1] === ">") {
                if (startWith(_data, "<!DOCTYPE ")) {
                    this.type = "text/html";
                } else if (startWith(_data, "<?xml ")) {
                    this.type = "application/xml";
                } else {
                    let match = _data.match(/<([a-zA-Z0-9\-:_]+)/),
                        tag = match && match[1];
                    if (tag) {
                        if (tag.match(/\-:_/) || !HtmlTags.includes(tag)) {
                            this.type = "application/xml";
                        } else {
                            this.type = "text/html";
                        }
                    } else {
                        this.type = "text/plain";
                    }
                }
            }
        }

        if (!this.charset)
            this.charset = "UTF-8";

        this.length = Buffer.byteLength(data, this.charset);
    } else if (Buffer.isBuffer(data)) {
        // buffer
        this.type = "application/octet-stream";
        this.length = data.byteLength;
    } else {
        data = JSON.stringify(data);

        if (this.jsonp) {
            // jsonp
            this.type = "application/javascript";
            data = `${this.jsonp}(${data});`;
        } else {
            this.type = "application/json";
        }
        this.length = Buffer.byteLength(data, this.charset);
    }

    this.etag = etag(data); // Set Etag.

    if (!this.modified)
        this.status = 304;

    if (this.code === 204 || this.code === 304) {
        delete this.headers["content-type"];
        delete this.headers["content-length"];
        delete this.headers["transfer-encoding"];
        data = null;
    }

    this.end(data, this.charset);
};

/**
 * Sends a file to the client, and automatically performs type checking.
 * @param {string} filename
 * @param {(err: Error)=>void} cb A function called when the file are sent
 *  or failed.
 * @returns {void}
 */
ServerResponse.prototype.sendFile = function sendFile(filename, cb = null) {
    var err = null;

    if (!this.type)
        this.type = mime.lookup(filename) || "text/plain";

    sendStream(this._req, filename).on("error", e => {
        err = e;
        this.end();
    }).on("end", () => {
        if (err) {
            if (cb instanceof Function)
                cb(err);
            else
                throw err;
        }
    }).pipe(this);
};

/**
 * Performs a download function of resource.
 * @param {string} filename The file path.
 * @param {string} newName Rewrite attachment filename for clients.
 * @param {(err: Error)=>void} cb A function called when the file are sent
 *  or failed.
 * @returns {void}
 */
ServerResponse.prototype.download = function download(filename, newName = undefined, cb = null) {
    if (newName instanceof Function) {
        cb = newName;
        newName = null;
    }
    this.attachment = newName || filename;
    return this.sendFile(filename, cb);
};

Object.defineProperties(ServerResponse.prototype, {
    code: { // Set/Get status code.
        enumerable: true,
        get() {
            return this.statusCode;
        },
        set(code) {
            this.statusCode = code;
        }
    },

    message: { // Set/Get status message.
        enumerable: true,
        get() {
            return this.statusMessage;
        },
        set(msg) {
            this.statusMessage = msg;
        }
    },

    status: { // Set/Get both status code and message.
        enumerable: true,
        get() {
            return this.code + " " + this.message
        },
        set(status) {
            status = typeof status === "string" ? status.split(/\s+/) : [status];
            this.code = status[0];
            this.message = status[1] || STATUS_CODES[status[0]];
        }
    },

    type: { // Set/Get `Content-Type` without `charset`.
        enumerable: true,
        get() {
            return this.headers["content-type"] &&
                this.headers["content-type"].split(";")[0];
        },
        set(type) {
            if (type.indexOf("/") === -1) type = mime.lookup(type);
            if (this.charset) type += `; charset=${this.charset}`;
            this.headers["content-type"] = type;
        }
    },

    charset: { // Set/Get `Content-Type` only with `charset`.
        enumerable: true,
        get() {
            return this.headers["content-type"] &&
                this.headers["content-type"].split("=")[1];
        },
        set(charset) {
            if (this.type) charset = `${this.type}; charset=${charset}`;
            this.headers["content-type"] = charset;
        }
    },

    length: { // Set/Get `Content-Length`.
        enumerable: true,
        get() {
            return this.headers["content-length"];
        },
        set(v) {
            this.headers["content-length"] = v;
        }
    },

    encoding: { // Set/Get `Content-Encoding`.
        enumerable: true,
        get() {
            return this.headers["content-encoding"];
        },
        set(v) {
            this.headers["content-encoding"] = v;
        }
    },

    date: { // Set/Get `Date`.
        enumerable: true,
        get() {
            return this.headers.date;
        },
        set(v) {
            this.headers.date = v;
        }
    },

    etag: { // Set/Get `Etag`.
        enumerable: true,
        get() {
            return this.headers.etag;
        },
        set(v) {
            this.headers.etag = v;
        }
    },

    lastModified: { // Set/Get `Last-Modified`.
        enumerable: true,
        get() {
            return this.headers["last-modified"];
        },
        set(v) {
            this.headers["last-modified"] = v;
        }
    },

    location: { // Set/Get `Location`.
        enumerable: true,
        get() {
            return this.headers.location;
        },
        set(v) {
            this.headers.location = v;
        }
    },

    refresh: { // Set/Get `Refresh` in a number of seconds.
        enumerable: true,
        get() {
            return this.headers.refresh;
        },
        set(v) {
            this.headers.refresh = v;
        }
    },

    attachment: { // Set/Get `Content-Disposition` with a filename.
        enumerable: true,
        get() {
            return this.headers["content-disposition"];
        },
        set(filename) {
            this.type = mime.lookup(filename);
            this.headers["content-disposition"] = contentDisposition(filename);
        }
    },

    cache: { // Set/Get `Cache-Control`.
        enumerable: true,
        get() {
            return getCache(this.headers["cache-control"]);
        },
        set(v) {
            if (!v && v !== 0) {
                this.headers["cache-control"] = "no-cache";
            } else {
                let sec = parseInt(v);
                if (isNaN(sec)) {
                    this.headers["cache-control"] = v;
                } else {
                    this.headers["cache-control"] = `max-age=${sec}`;
                }
            }
        }
    },

    vary: { // Set/Get `Vary`.
        enumerable: true,
        get() {
            return this.headers.vary;
        },
        set(v) {
            this.headers.vary = v;
        }
    },

    keepAlive: {
        enumerable: true,
        get() {
            return this.headers.connection === "keep-alive";
        },
        set(keep) {
            this.headers.connection = keep ? "keep-alive" : "close";
        }
    },

    /** Whether the response has been modified. */
    modified: {
        enumerable: true,
        get() {
            // GET or HEAD for weak freshness validation only
            if ('GET' !== this._req.method && 'HEAD' !== this._req.method)
                return true;

            let code = this.code;
            // 2xx or 304 as per rfc2616 14.26
            if ((code >= 200 && code < 300) || 304 === code) {
                return !fresh(this._req.headers, {
                    'etag': this.headers.etag,
                    'last-modified': this.headers['last-modified']
                });
            }

            return true;
        },
        set() { }
    }
});

module.exports = (options, res) => {

    // res.headers is a proxy.
    const headers = res.getHeaders instanceof Function ? res.getHeaders() : {};
    res.headers = new Proxy(headers, {
        set(target, name, value) {
            target[name] = value;
            if (options.capitalize)
                name = capitalize(name);
            if (value instanceof Date)
                value = value.toUTCString();
            res.setHeader(name, value);
        },
        get: (target, name) => target[name],
        has: (target, name) => name in target,
        deleteProperty(target, name) {
            res.removeHeader(name);
            return delete target[name];
        }
    });

    // res.cookies is a proxy.
    const cookies = getResCookies(res);
    res.cookies = new Proxy(cookies, {
        set(target, name, value) {
            var cookie;
            if (value === null || value === undefined) {
                cookie = new Cookie({
                    name,
                    value: "",
                    maxAge: undefined,
                    expires: new Date(1970)
                });
            } else {
                target[name] = value;
                if (value instanceof Cookie) {
                    cookie = value;
                    if (!cookie.name) cookie.name = name;
                } else if (typeof value !== "string") {
                    value = "j:" + JSON.stringify(value);
                    cookie = new Cookie(name, value);
                } else {
                    value = "s:" + value;
                    cookie = new Cookie(name, value);
                }
            }

            if (cookie.maxAge !== undefined) {
                cookie.expires = new Date(Date.now() + cookie.maxAge * 1000);
            }

            if (options.cookieSecret && cookie.value) {
                cookie.value = CookieSignature.sign(cookie.value, options.cookieSecret);
            }

            res.append("set-cookie", cookie.toString());
        },
        get: (target, name) => target[name],
        has: (target, name) => name in target,
        deleteProperty(target, name) {
            res.cookies[name] = null;
            return delete target[name];
        }
    });
}