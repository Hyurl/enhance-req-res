const http2 = require("http2");
const enhance = require("./");
const fs = require("fs");
const assert = require("assert");

var options = {
    key: fs.readFileSync(__dirname + "/server.key"),
    cert: fs.readFileSync(__dirname + "/server.crt")
};

var server = http2.createSecureServer(options, (_req, _res) => {
    var enhanced = enhance({
        domain: ["localhost", "127.0.0.1"]
    })(_req, _res);
    var req = enhanced.req,
        res = enhanced.res;

    assert.ok(req instanceof enhance.Http2Request);
    assert.ok(res instanceof enhance.Http2Response);

    if (req.method == "GET") {
        res.statusMessage = "200 OK";
        res.headers["connection"] = "keep-alive";
        res.headers["server"] = "NodeJS";
        res.send("<h1>Hello, World!</p>");
    }
});

server.listen(443, () => {
    console.log("please open https://localhost/ in your browser");
});