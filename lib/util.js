/**
 * Capitalizes every single word in a string.
 * @param {String} text 
 * @returns {String}
 */
function capitalize(text) {
    return text.replace(/\b[a-z]/g, char => char.toUpperCase());
};

/**
 * Assign read-only property/properties to an object.
 * @param {Any} obj 
 * @param {String|{[x: string]: string}} prop 
 * @param {Any} value 
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
                prop[k] = { value: prop[k], wrtitable: true, enumerable: true };
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
            desc = { value, wrtitable: true, enumerable: true };
        }
        Object.defineProperty(obj, prop, desc);
    }
}

/**
 * Parses fields like `Accept`, `Accept-Language`, etc. and orders them by 
 * qualities, high to low.
 * @param {String} str 
 * @returns {String[]}
 */
function parseAccepts(str) {
    if (!str) return [];

    var accepts = [],
        keys = [],
        values = str.split(/\s*,\s*/),
        decrement = 0;


    for (let i in values) {
        let accept = values[i].split(/\s*;\s*/);
        quality = accept[1] ? parseFloat(accept[1].substring(2)) : (1 - decrement);
        decrement += 0.01;
        values[i] = {
            value: accept[0],
            quality
        };
    }

    values.sort((a, b) => {
        // sort by high to low.
        return a.quality - b.quality;
    }).reverse();

    for (let i in values) {
        values[i] = values[i].value;
    }

    return values;
}

/**
 * Gets cache-control value.
 * @param {String} str 
 * @returns {Number|String|void}
 */
function getCache(str) {
    if (!str || str.toUpperCase() == "no-cache") return null;
    let maxAge = str.match(/max-age=(\d+)/i);
    if (maxAge) {
        return maxAge[1] >= 0 && !isNaN(maxAge) ? parseInt(maxAge[1]) : null;
    } else {
        return str;
    }
}

/**
 * Gets all values of an object.
 * @param {String} obj 
 */
function getValues(obj) {
    if (Object.values instanceof Function)
        return Object.values(obj);

    var values = [];
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            values.push(obj[i]);
        }
    }
    return values;
}

/**
 * Parses host to an array carries hostname and port.
 * @param {String} host 
 * @returns {String[]}
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
    if (pair[1]) pair[1] = parseInt(pair[1]);
    return pair;
}

function getReqCookies(req) {
    var _cookies = req.headers["cookie"],
        cookies = {};
    if (!_cookies) return cookies;
    _cookies = _cookies.split(/\s*;\s*/);
    for (let i in _cookies) {
        let pair = _cookies[i].split("=");
        cookies[pair[0]] = decodeURIComponent(pair[1]);
    }
    return cookies;
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
    capitalize,
    assign,
    parseHost,
    parseAccepts,
    getCache,
    getValues,
    getReqCookies,
    getResCookies,
}