"use strict";

const Cookie = require("sfn-cookie").default;
const URL = require("url6").URL;
const request = require("./lib/req");
const response = require("./lib/res");
const http2 = require("./lib/util").http2;

function enhance(options) {
    options = Object.assign({
        domain: null,
        useProxy: false,
        capitalize: true,
        cookieSecret: null,
        jsonp: undefined,
    }, options);

    return (req, res) => {
        // Make a reference of req to res.
        res._req = req;

        // inheritance hack
        if (http2 && (req instanceof http2.Http2ServerRequest)) {
            Object.setPrototypeOf(req, request.Http2Request.prototype);
            Object.setPrototypeOf(res, response.Http2Response.prototype);
        } else {
            Object.setPrototypeOf(req, request.Request.prototype);
            Object.setPrototypeOf(res, response.Response.prototype);
        }

        request.handle(options, req);
        response.handle(options, res);

        // Enable jsonp response.
        let jsonp = options.jsonp === true ? "jsonp" : options.jsonp;
        if (jsonp && req.query && req.query[jsonp]) {
            res.jsonp = req.query[jsonp];
        }

        return { req, res };
    };
}

enhance.Cookie = Cookie;
enhance.URL = URL;
enhance.Request = request.Request;
enhance.Http2Request = request.Http2Request;
enhance.Response = response.Response;
enhance.Http2Response = response.Http2Response;

module.exports = enhance;
