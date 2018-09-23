"use strict";

const Cookie = require("sfn-cookie").default;
const URL = require("url6").URL;
const Request = require("./lib/req");
const Response = require("./lib/res");
const mixin = require("./lib/util").mixin;
const extended = Symbol("extended");

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

        if (!req[extended] && !res[extended]) {
            // Mix prototype
            let ReqProto = Object.getPrototypeOf(req),
                ResProto = Object.getPrototypeOf(res);

            mixin(ReqProto, Request.default.prototype);
            mixin(ResProto, Response.default.prototype);
            ReqProto[extended] = ResProto[extended] = true;
        }

        Request.handle(options, req);
        Response.handle(options, res);

        // Enable jsonp response.
        let jsonp = options.jsonp === true ? "jsonp" : options.jsonp;
        if (jsonp && req.query && req.query[jsonp]) {
            res.jsonp = req.query[jsonp];
        }

        return { req, res };
    };
};

enhance.Cookie = Cookie;
enhance.URL = URL;

module.exports = enhance;