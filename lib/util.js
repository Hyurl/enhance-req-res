"use strict";

/**
 * Assign read-only property/properties to an object.
 * @param {any} obj 
 * @param {string|{[x: string]: string}} prop 
 * @param {any} value 
 */
function readonly(obj, prop, value = null) {
    if (typeof prop === "object") {
        for (let k in prop) {
            if (prop[k] instanceof Function) {
                prop[k] = {
                    get: prop[k],
                    set() { }                };
            } else {
                prop[k] = { value: prop[k], writable: true, enumerable: true };
            }
        }
        Object.defineProperties(obj, prop);
    } else {
        let desc;
        if (value instanceof Function) {
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
    let maxAge = str.match(/max-age=(\d+)/i);

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

function mixin(target, source) {
    for (let prop of Object.getOwnPropertyNames(source)) {
        if (prop != "constructor") {
            let desc = Object.getOwnPropertyDescriptor(source, prop);
            if (desc) {
                Object.defineProperty(target, prop, desc);
            } else {
                target[prop] = source[prop];
            }
        }
    }

    return target;
}

module.exports = {
    readonly,
    getCache,
    getResCookies,
    mixin
};