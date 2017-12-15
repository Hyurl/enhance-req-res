const http = require("http");
const enhance = require("./");

http.createServer((req, res) => {

    enhance({
        domain: "localhost"
    })(req, res);

    console.log(req.URL);
    console.log(req.ip);

    res.headers["x-powered-by"] = "Ayonium";
    res.lastModified = new Date(1970);
    res.cookies.user = req.auth ? req.auth.username : "anonymous";
    req.status = 200;
    res.send(["Hello", "World"]);

    console.log("Cost time: %d ms", Date.now() - req.time);

}).listen(80);