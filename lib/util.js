"use strict";

const http2 = null;
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
    if (typeof prop === "object") {
        for (let k in prop) {
            if (typeof prop[k] === "function") {
                prop[k] = {
                    get: prop[k],
                    set() { }
                };
            } else {
                prop[k] = { value: prop[k], writable: true, enumerable: true };
            }
        }
        Object.defineProperties(obj, prop);
    } else {
        let desc;
        if (typeof value === "function") {
            desc = {
                get: value,
                set() { },
                enumerable: true
            };
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
    if (!str || str.toLowerCase() === "no-cache") return undefined;
    let maxAge = str.match(maxAgePattern);

    if (maxAge) {
        let _maxAge = parseInt(maxAge[1]);
        return isNaN(_maxAge) ? 0 : _maxAge;
    } else {
        return str;
    }
}

function getResCookies(res) {
    var _cookies = res.getHeader("set-cookie"),
        cookies = {};
    if (!_cookies) return cookies;
    if (!Array.isArray(_cookies)) _cookies = [_cookies];
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