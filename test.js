const http = require("http");
const enhance = require("./");
enhance.Cookie.parseMany

http.createServer((_req, _res) => {

    var { req, res } = enhance({
        domain: ["localhost", "127.0.0.1"]
    })(_req, _res);

    console.log(req.URL);
    console.log(req.ip);

    res.headers["x-powered-by"] = "Ayonium";
    res.lastModified = new Date(1970);
    res.cookies.user = req.auth ? req.auth.username : "anonymous";

    res.send(["Hello", "World"]);

    console.log("Cost time: %d ms", Date.now() - req.time);

}).listen(80);