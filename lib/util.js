/**
 * Capitalizes every single word in a string.
 * @param {string} text 
 * @returns {string}
 */
function capitalize(text) {
    return text.replace(/\b[a-z]/g, char => char.toUpperCase());
};

/**
 * Assign read-only property/properties to an object.
 * @param {any} obj 
 * @param {string|{[x: string]: string}} prop 
 * @param {any} value 
 */
function assign(obj, prop, value = null) {
    if (typeof prop === "object") {
        for (let k in prop) {
            if(prop[k] instanceof Function){
                prop[k] = {
                    get: prop[k],
                    set(){},
                    enumerable: true
                };
            }else{
                prop[k] = { value: prop[k], writable: true, enumerable: true };
            }
        }
        Object.defineProperties(obj, prop);
    } else {
        var desc;
        if(value instanceof Function){
            desc = {
                get: value,
                set(){},
                enumerable: true
            };
        }else{
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
    if (!str || str.toLowerCase() === "no-cache") return null;
    let maxAge = str.match(/max-age=(\d+)/i);
    
    if (maxAge) {
        let _maxAge = parseInt(maxAge[1]);
        return isNaN(_maxAge) ? 0 : _maxAge;
    } else {
        return str;
    }
}

/**
 * Parses host to an array carries hostname and port.
 * @param {string} host 
 * @returns {[string, number]}
 */
function parseHost(host) {
    if (!host || typeof host !== "string") return [];
    var pair;
    if (host[0] === "[") {
        let i = host.indexOf("]:");
        if(i > 0){
            pair[0] = host.substring(0, i + 1);
            pair[1] = host.substring(i + 2);
        }else{
            pair = [host];
        }
    } else {
        pair = host.split(":");
    }
    if (pair[1])
        pair[1] = parseInt(pair[1]);
    return pair;
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

function startWith(text, str) {
    return text === str || text.substring(0, text.length - str.length + 1) === str;
}

function endWith(text, str) {
    return text === str || text.substring(text.length - str.length) === str;
}

module.exports = {
    capitalize,
    assign,
    parseHost,
    getCache,
    getResCookies,
    startWith,
    endWith
};