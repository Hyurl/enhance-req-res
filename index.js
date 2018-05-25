"use strict";

const { Cookie } = require("sfn-cookie");
const { URL } = require("url6");
const reqHandle = require("./lib/req");
const resHandle = require("./lib/res");

function enhance(options = null) {
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

        // Enable jsonp response.
        if (options.jsonp && req.query[options.jsonp]) {
            res.jsonp = req.query[options.jsonp];
        }

        reqHandle(options, req);
        resHandle(options, res);

        return { req, res };
    };
};

enhance.Cookie = Cookie;
enhance.URL = URL;

module.exports = enhance;