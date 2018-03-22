const http = require("http");
const enhance = require("./");

http.createServer((_req, _res) => {

    var { req, res } = enhance({
        domain: ["localhost", "127.0.0.1"]
    })(_req, _res);

    console.log(req.urlObj);
    console.log(req.ip);
    console.log(req.accepts);

    res.headers["x-powered-by"] = "Ayonium";
    res.lastModified = new Date(1970);
    res.cookies.user = req.auth ? req.auth.username : "anonymous";

    res.send(["Hello", "World"]);

    console.log("Cost time: %d ms", Date.now() - req.time);

}).listen(80);

console.log("HTTP server listening http://localhost.");