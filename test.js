const http = require("http");
const enhance = require("./");
const assert = require("assert");
const axios = require("axios").default;

var genderCookie = new enhance.Cookie({
    value: "female",
    maxAge: 120,
    httpOnly: true
});
var server = http.createServer((_req, _res) => {
    var enhanced = enhance({
        domain: ["localhost", "127.0.0.1"],
        jsonp: true
    })(_req, _res);
    var req = enhanced.req,
        res = enhanced.res;

    assert.ok(req instanceof enhance.Request);
    assert.ok(res instanceof enhance.Response);

    if (req.method == "GET") {
        if (req.path == "/") {
            res.send("<h1>Hello, World!</h1>");
        } else if (req.pathname == "/res-xml") {
            res.send("<Text>Hello, World!</Text>");
        } else if (req.pathname == "/res-object") {
            res.send({ hello: "world!" });
        } else if (req.pathname == "/res-array") {
            res.send(["Hello", "World"]);
        } else if (req.pathname == "/set-header") {
            res.headers["x-powered-by"] = "NodeJS";
            res.send("Hello, World!");
        } else if (req.pathname == "/set-cookie") {
            res.cookies.user = req.auth ? req.auth.username : "anonymous";
            res.cookies.gender = genderCookie;
            res.send("Hello, World!");
        } else if (req.pathname == "/test-req-props") {
            assert.equal(req.href, "http://localhost:3000/test-req-props?user=Luna&gender=female");
            assert.equal(req.domainName, "localhost");
            assert.equal(req.protocol, "http");
            assert.strictEqual(req.secure, false);
            assert.equal(req.host, "localhost:3000");
            assert.equal(req.hostname, "localhost");
            assert.strictEqual(req.port, 3000);
            assert.equal(req.path, "/test-req-props?user=Luna&gender=female");
            assert.equal(req.search, "?user=Luna&gender=female");
            assert.deepEqual(req.query, { user: "Luna", gender: "female" });
            assert.deepEqual(req.cookies, { user: "Luna", gender: "female" });
            assert.equal(req.referer, "http://localhost:3000/");
            assert.equal(req.origin, "http://localhost:3000");
            assert.strictEqual(req.ip, "::ffff:127.0.0.1");
            assert.deepEqual(req.ips, ["::ffff:127.0.0.1"]);
            assert.equal(req.accept, "application/json");
            assert.deepEqual(req.accepts, ["application/json", "*/*"]);
            assert.equal(req.lang, "en-US");
            assert.deepEqual(req.langs, ["en-US", "en"]);
            assert.equal(req.encoding, "gzip");
            assert.deepEqual(req.encodings, ["gzip", "deflate", "br"]);
            assert.strictEqual(req.xhr, true);
            assert.strictEqual(req.keepAlive, false);
            assert.strictEqual(req.cache, 120);

            res.send("Hello, World!");
        } else if (req.pathname == "/res-code") {
            res.code = 201;
            res.send(res.code);
        } else if (req.pathname == "/res-message") {
            res.message = "Request Successfully!";
            res.send(res.message);
        } else if (req.pathname == "/res-status") {
            res.status = 200;
            res.send(res.status);
        } else if (req.pathname == "/res-status-string") {
            res.status = "200 Request Successfully!";
            res.send(res.status);
        } else if (req.pathname == "/res-type") {
            res.type = "text/html";
            res.send("Hello, World!");
        } else if (req.pathname == "/res-charset") {
            res.charset = "ASCII";
            res.send("HelloWorld");
        } else if (req.pathname == "/res-length") {
            res.type = "text/plain";
            res.length = 13;
            res.end("Hello, World!");
        } else if (req.pathname == "/jsonp") {
            res.jsonp = "callback";
            res.send(["Hello", "World"]);
        } else if (req.pathname == "/jsonp2") {
            res.send({hello: "world"});
        } else {
            res.status = 404;
            res.send(res.status);
        }
    }
}).listen(3000, () => {
    axios.defaults.baseURL = "http://localhost:3000";
    Promise.resolve(null).then(() => {
        return axios.get("/").then(res => {
            assert.equal(res.data, "<h1>Hello, World!</h1>");
            assert.equal(res.headers["content-type"], "text/html; charset=UTF-8");
            assert.equal(res.headers["content-length"], 22);
        });
    }).then(() => {
        return axios.get("/res-xml").then(res => {
            assert.equal(res.data, "<Text>Hello, World!</Text>");
            assert.equal(res.headers["content-type"], "application/xml; charset=UTF-8");
            assert.equal(res.headers["content-length"], 26);
        });
    }).then(() => {
        return axios.get("/res-object").then(res => {
            assert.deepStrictEqual(res.data, { hello: "world!" });
        });
    }).then(() => {
        return axios.get("/res-array").then(res => {
            assert.deepStrictEqual(res.data, ["Hello", "World"]);
        });
    }).then(() => {
        return axios.get("/set-header").then(res => {
            assert.equal(res.headers["x-powered-by"], "NodeJS");
        });
    }).then(() => {
        return axios.get("/set-cookie").then(res => {
            assert.deepEqual(res.headers["set-cookie"], [
                "user=s%3Aanonymous",
                genderCookie.toString()
            ]);
        });
    }).then(() => {
        return axios.get("/test-req-props?user=Luna&gender=female", {
            headers: {
                "Accept": "application/json, */*;q=0.8",
                "Accept-Language": "en-US, en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "Max-Age=120",
                "Cookie": "user=s%3ALuna; gender=female",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "http://localhost:3000/",
                "Origin": "http://localhost:3000",
            }
        });
    }).then(() => {
        return axios.get("/res-code").then(res => {
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data, 201);
        });
    }).then(() => {
        return axios.get("/res-message").then(res => {
            assert.equal(res.statusText, "Request Successfully!");
            assert.equal(res.data, "Request Successfully!");
        });
    }).then(() => {
        return axios.get("/res-status").then(res => {
            assert.strictEqual(res.status, 200);
            assert.equal(res.statusText, "OK");
            assert.equal(res.data, "200 OK");
        });
    }).then(() => {
        return axios.get("/res-status-string").then(res => {
            assert.strictEqual(res.status, 200);
            assert.equal(res.statusText, "Request Successfully!");
            assert.equal(res.data, "200 Request Successfully!");
        });
    }).then(() => {
        return axios.get("/res-type").then(res => {
            assert.equal(res.headers["content-type"], "text/html; charset=UTF-8");
        });
    }).then(() => {
        return axios.get("/res-charset").then(res => {
            assert.equal(res.headers["content-type"], "text/plain; charset=ASCII");
        });
    }).then(() => {
        return axios.get("/res-length").then(res => {
            assert.equal(res.headers["content-type"], "text/plain");
            assert.equal(res.headers["content-length"], 13);
        });
    }).then(() => {
        return axios.get("/jsonp").then(res => {
            assert.equal(res.headers["content-type"], "application/javascript; charset=UTF-8");
            assert.equal(res.data, 'callback(["Hello","World"]);');
        });
    }).then(() => {
        return axios.get("/jsonp2?jsonp=callback").then(res => {
            assert.equal(res.headers["content-type"], "application/javascript; charset=UTF-8");
            assert.equal(res.data, 'callback({"hello":"world"});');
        });
    }).then(() => {
        server.close();
        console.log("#### OK ####");
    }).catch(err => {
        server.close();
        throw err;
    });
});
