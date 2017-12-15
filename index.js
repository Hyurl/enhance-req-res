const { IncomingMessage, ServerResponse } = require("http");
const Cookie = require("sfn-cookie");
const reqHandle = require("./lib/req");
const resHandle = require("./lib/res");
const { assign, getValues } = require('./lib/util');

/**
 * Gets a new enhancement with optional configurations.
 * @param {{[x: string]: string}} options Include:
 *  - `domain` Set a domain name for the program to find out the subdomain.
 *  - `useProxy` If `true`, when access properties like `req.ip` and 
 *      `req.host`, will firstly try to get info from proxy, default: `false`.
 *  - `capitalize` Auto-capitalize response headers when setting, default: 
 *      `true`.
 *  - `cookieSecret` A secret key to sign/unsign cookie values.
 *  - `jsonp` Set a default jsonp callback name if you want.
 * @returns {(req: IncomingMessage, res: ServerResponse)=>void}
 */
function enhance(options = null) {
    options = Object.assign({
        domain: "localhost",
        useProxy: false,
        capitalize: true,
        cookieSecret: null,
        jsonp: undefined,
    }, options);

    return (req, res) => {
        // Make a reference of req to res.
        res.req = req;

        // Enable jsonp response.
        if (options.jsonp && req.query[options.jsonp]) {
            res.jsonp = req.query[options.jsonp];
        }

        reqHandle(options, req);
        resHandle(options, res);
    };
};

enhance.Cookie = Cookie;

module.exports = enhance;