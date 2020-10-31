"use strict";

var http2 = null;
const maxAgePattern = /max-age=(\d+)/i;

try {
    http2 = require("http2");
} catch (e) { }

/**
 * Assign read-only property/properties to an object.
 * @param {any} obj 
 * @param {string|{[x: string]: string}} prop 
 * @param {any} value 
 */
function readonly(obj, prop, value) {
    if (!prop)
        return;

    if (typeof prop === "object") {
        for (let k in prop) {
            readonly(obj, k, prop[k]);
        }
    } else {
        let desc;

        if (typeof value === "function") {
            desc = { get: value, set() { } };
        } else {
            desc = { value, writable: true, enumerable: true };
        }

        Object.defineProperty(obj, prop, desc);
    }
}

/**
 * Gets cache-control value.
 * @param {string} str 
 * @returns {number|string}
 */
function getCache(str) {
    if (!str || str.toLowerCase() === "no-cache")
        return;

    let maxAge = str.match(maxAgePattern);

    if (maxAge) {
        let _maxAge = parseInt(maxAge[1]);
        return isNaN(_maxAge) ? 0 : _maxAge;
    } else {
        return str;
    }
}

function getResCookies(res) {
    let _cookies = res.getHeader("set-cookie");
    let cookies = {};

    if (!_cookies)
        return cookies;

    if (!Array.isArray(_cookies))
        _cookies = [_cookies];

    for (let i in _cookies) {
        let pair = _cookies[i].split(";")[0].split("=");
        cookies[pair[0]] = decodeURIComponent(pair[1]);
    }

    return cookies;
}

module.exports = {
    readonly,
    getCache,
    getResCookies,
    http2
};
