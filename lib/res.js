"use strict";

const STATUS_CODES = require("http").STATUS_CODES;
const EventEmitter = require("events").EventEmitter;
const etag = require("etag");
const fresh = require("fresh");
const mime = require("mime-types");
const Cookie = require("sfn-cookie").default;
const CookieSignature = require("cookie-signature");
const HtmlTags = require("html-tags");
const sendStream = require("send");
const contentDisposition = require("content-disposition");
const capitalize = require("capitalization").capitalize;
const startsWith = require("lodash/startsWith");
const endsWith = require("lodash/endsWith");
const intercept = require("function-intercepter").default;
const getCache = require("./util").getCache;
const getResCookies = require("./util").getResCookies;

class Response extends EventEmitter {
    /**
     * Gets a response header field's (case insensitive) value.
     * @param {string} field
     * @returns {string|string[]|void}
     */
    get(field) {
        return typeof field == "string"
            ? (this.getHeader(field) || this.headers[field])
            : null;
    }

    /**
     * Sets a response header field's (case insensitive) value.
     * @param {string} field
     * @param {string|string[]} value
     * @returns {void}
     */
    set(field, value) {
        this.setHeader(field, value);
        this.headers[field] = value;
    }

    /**
     * Appends a value to a response header field (case insensitive).
     * @param {string} field
     * @param {string} value
     * @returns {void}
     */
    append(field, value) {
        let origin = this.get(field);
        if (origin === undefined || origin === null) {
            value = [value];
        } else {
            value = Array.isArray(origin)
                ? origin.concat(value)
                : [origin].concat(value);
        }
        this.headers[field] = value;
    }

    /**
     * Removes a response header field.
     * @param {string} field
     * @returns {void}
     */
    remove(field) {
        delete this.headers[field];
    }

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
    cookie(name, value, opts) {
        opts = opts || {};
        if (value === undefined) {
            return this.cookies[name];
        } else if (value === null) {
            this.cookies[name] = null;
        } else {
            this.cookies[name] = new Cookie(name, value, opts);
        }
    }

    /**
     * Makes an HTTP basic authentication.
     * @param {string} [realm] Often used as dialog title.
     * @returns {void}
     */
    auth(realm) {
        realm = `Basic realm="${realm || "HTTP Authentication"}"`;
        this.status = 401;
        this.headers["WWW-Authenticate"] = realm;
        this.end();
    }

    /**
     * Clears authentication.
     * @returns {void}
     */
    unauth() {
        return this.auth();
    }

    /**
     * Redirects the request to a specified URL.
     * @param {string|number} url If set to `-1`, that means go back to the 
     *  previous page.
     * @param {301|302} [code]
     */
    redirect(url, code) {
        this.code = code || 302;
        this.location = url === -1 ? this._req.referer : url;
        this.end();
    }

    /**
     * Sends contents to the client, and automatically performs type checking.
     * @param {any} data Could be a string of `text`, `html`, `xml`, a buffer,
     *  or any object that can be serialized by `JSON.stringify()`.
     * @returns {void}
     */
    send(data) {
        // if (!this.charset)
        //     this.charset = "UTF-8";

        if (this._req.method == "HEAD" || data === null || data === undefined) {
            this.end();
            return;
        } else if (typeof data === "string") {
            // string
            if (!this.type) {
                let _data = data.trim();

                if ((_data[0] === "{" && endsWith(_data, "}"))
                    || (_data[0] === "[" && endsWith(_data, "]"))) {
                    this.type = "application/json";
                } else if (endsWith(_data, ">")) {
                    if (startsWith(_data, "<!DOCTYPE ")) {
                        this.type = "text/html";
                    } else if (startsWith(_data, "<?xml ")) {
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
                } else {
                    this.type = "text/plain";
                }
            }

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
    }

    /**
     * Sends a file to the client, and automatically performs type checking.
     * @param {string} filename
     * @param {(err: Error)=>void} [cb] A function called when the file are sent
     *  or failed.
     * @returns {void}
     */
    sendFile(filename, cb) {
        var err = null;

        if (!this.type)
            this.type = mime.lookup(filename) || "text/plain";

        sendStream(this._req, filename).on("error", e => {
            err = e;
            this.end();
        }).on("end", () => {
            if (err) {
                if (typeof cb === "function")
                    cb(err);
                else
                    throw err;
            }
        }).pipe(this);
    }

    /**
     * Performs a download function of resource.
     * @param {string} filename The file path.
     * @param {string} [newName] Rewrite attachment filename for clients.
     * @param {(err: Error)=>void} [cb] A function called when the file are sent
     *  or failed.
     * @returns {void}
     */
    download(filename, newName, cb) {
        if (typeof newName === "function") {
            cb = newName;
            newName = null;
        }
        this.attachment = newName || filename;
        return this.sendFile(filename, cb);
    }

    /**
     * Sets/Gets status code.
     * @returns {number}
     */
    get code() {
        return this.statusCode;
    }

    set code(code) {
        this.statusCode = code;
    }

    /**
     * Sets/Gets status message.
     * @returns {string}
     */
    get message() {
        return this.statusMessage;
    }

    set message(msg) {
        this.statusMessage = msg;
    }

    /**
     * Sets/Gets both status code and message.
     */
    get status() {
        return this.code + (this.message ? " " + this.message : "");
    }

    /**
     * @param {string | number} status
     */
    set status(status) {
        if (typeof status == "number") {
            this.code = status;
            if (parseFloat(this._req.httpVersion) < 2.0) {
                this.message = STATUS_CODES[status];
            }
        } else {
            let i = status.indexOf(" ");
            this.code = parseInt(status.slice(0, i));
            if (parseFloat(this._req.httpVersion) < 2.0) {
                this.message = status.slice(i + 1).trim();
            }
        }
    }

    /**
     * Sets/Gets `Content-Type` without `charset`.
     * @returns {string}
     */
    get type() {
        return this.headers["content-type"] &&
            this.headers["content-type"].split(";")[0];
    }

    set type(type) {
        if (type.indexOf("/") === -1) type = mime.lookup(type);
        if (this.charset) type += `; charset=${this.charset}`;
        this.headers["content-type"] = type;
    }

    /**
     * Sets/Gets `Content-Type` only with `charset`.
     * @returns {string}
     */
    get charset() {
        return this.headers["content-type"] &&
            this.headers["content-type"].split("=")[1];
    }

    set charset(charset) {
        let type = this.type || "";
        this.headers["content-type"] = `${type}; charset=${charset}`;
    }

    /**
     * Sets/Gets `Content-Length`.
     * @returns {number}
     */
    get length() {
        return this.headers["content-length"];
    }

    set length(v) {
        this.headers["content-length"] = v;
    }

    /**
     * Sets/Gets `Content-Encoding`.
     * @returns {string}
     */
    get encoding() {
        return this.headers["content-encoding"];
    }

    set encoding(v) {
        this.headers["content-encoding"] = v;
    }

    /**
     * Sets/Gets `Date`.
     * @returns {string | Date}
     */
    get date() {
        return this.headers.date;
    }

    set date(v) {
        this.headers.date = v;
    }

    /**
     * Sets/Gets `Etag`.
     * @returns {string}
     */
    get etag() {
        return this.headers.etag;
    }

    set etag(v) {
        this.headers.etag = v;
    }

    /**
     * Sets/Gets `Last-Modified`.
     * @returns {string | Date}
     */
    get lastModified() {
        return this.headers["last-modified"];
    }

    set lastModified(v) {
        this.headers["last-modified"] = v;
    }

    /**
     * Sets/Gets `Location`.
     * @returns {string}
     */
    get location() {
        return this.headers.location;
    }

    set location(v) {
        this.headers.location = v;
    }

    /**
     * Sets/Gets `Refresh` in a number of seconds.
     * @returns {string | number}
     */
    get refresh() {
        return this.headers.refresh;
    }

    set refresh(v) {
        this.headers.refresh = v;
    }

    /**
     * Sets/Gets `Content-Disposition` with a filename.
     * @returns {string}
     */
    get attachment() {
        return this.headers["content-disposition"];
    }

    set attachment(filename) {
        this.type = mime.lookup(filename);
        this.headers["content-disposition"] = contentDisposition(filename);
    }

    /**
     * Sets/Gets `Cache-Control`.
     * @returns {string | number}
     */
    get cache() {
        return getCache(this.headers["cache-control"]);
    }

    set cache(v) {
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

    /**
     * Sets/Gets `Vary`.
     * @returns {string | string[]}
     */
    get vary() {
        return this.headers.vary;
    }

    set vary(v) {
        this.headers.vary = v;
    }

    /**
     * Set `Connection` to `keep-alive` or check whether equivalent.
     * @returns {boolean}
     */
    get keepAlive() {
        return this.headers.connection === "keep-alive";
    }

    set keepAlive(keep) {
        this.headers.connection = keep ? "keep-alive" : "close";
    }

    /**
     * Whether the response has been modified.
     * @readonly
     * @returns {boolean}
     */
    get modified() {
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
    }

    set modified(v) { }
}

exports.default = Response;

exports.handle = (options, res) => {
    res.headers = typeof res.getHeaders == "function" ? res.getHeaders() : {};
    res.cookies = getResCookies(res);
    res.writeHead = intercept(res.writeHead).before(() => {
        for (let name in res.cookies) {
            let cookie, value = res.cookies[name];

            if (value === null || value === undefined) {
                cookie = new Cookie({
                    name,
                    value: "",
                    maxAge: undefined,
                    expires: new Date(1970)
                });
            } else if (value instanceof Cookie) {
                cookie = value;
                if (!cookie.name) cookie.name = name;
            } else if (typeof value !== "string") {
                value = "j:" + JSON.stringify(value);
                cookie = new Cookie(name, value);
            } else {
                value = "s:" + value;
                cookie = new Cookie(name, value);
            }

            if (cookie.maxAge !== undefined) {
                let time = Date.now() + cookie.maxAge * 1000;
                cookie.expires = new Date(time).toUTCString();
            }

            if (options.cookieSecret && cookie.value) {
                cookie.value = CookieSignature.sign(
                    cookie.value,
                    options.cookieSecret
                );
            }

            res.append("set-cookie", cookie.toString());
        }

        for (let name in res.headers) {
            let value = res.headers[name];

            if (options.capitalize)
                name = capitalize(name);
            if (value instanceof Date)
                value = value.toUTCString();

            res.setHeader(name, value);
        }

        // HTTP/2 doesn't support status message and connection field.
        if (parseFloat(res._req.httpVersion) >= 2.0) {
            res.statusMessage = "";
            res.removeHeader("connection");
        }
    });
}