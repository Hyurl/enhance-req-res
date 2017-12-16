# Enhance-req-res

**A tool to enhance abilities of the `req` and `res`.**

This module adds additional properties and methods to the corresponding `req` 
and `res` objects in a http server, and enhance abilities of the program.

It has both `express` style and `koa` style, but in a very different way, and 
only keeps very few and useful methods.

This module can work with `connect`, so you can use it to build frameworks.

## Install

```sh
npm install enhance-req-res
```

## Example

```javascript
const http = require("http");
const enhance = require("enhance-req-res");

http.createServer((req, res) => {

    enhance({
        domain: "localhost"
    })(req, res);

    console.log(req.URL);
    console.log(req.ip);

    res.headers["x-powered-by"] = "Ayonium";
    res.lastModified = new Date(1970);
    res.cookies.user = req.auth ? req.auth.username : "anonymous";

    res.send(["Hello", "World"]);

    console.log("Cost time: %d ms", Date.now() - req.time);

}).listen(80);
```

You can use `npm test` to test this code after downloading.

## API

### enhance(`options?: {[x: string]: string}`): (req, res) => void

Valid `options` include:

- `domain` Set a domain name for the program to find out the subdomain.
 - `useProxy` If `true`, when access properties like `req.ip` and 
    `req.host`, will firstly try to get info from proxy, default: `false`.
- `capitalize` Auto-capitalize response headers when setting, default: `true`.
- `cookieSecret` A secret key to sign/unsign cookie values.
- `jsonp` Set a default jsonp callback name if you want.

### Request

Some of these properties are read-only for security reasons, that means you 
won't be able to modified them.

- `URL` An object parsed by `url` module for both new API and legacy API.
    be aware of `URL.auth`, which is actually sent by http 
    `Basic Authendication`.  
- `time` Request time, not really connection time, but the moment this 
    module performs actions.
- `proxy` If the client requested via a proxy server, this property will be 
    set, otherwise it's `null`. If available, it may contain these properties:
    - `protocol` The client's real request protocol (`x-forwarded-proto`).
    - `host` The real host that client trying to request (`x-forwarded-host`).
    - `ip`: The real IP of client (`ips[0]`).
    - `ips`: An array carries all IP addresses, includes client IP and proxy 
        server IPs (`x-forwarded-for`).
- `auth` Authentication of the client, it could be `null`, or an object 
    carries `{ username, password }`.
- `protocol` Either `http` or `https`, if `useProxy` is true, then trying to 
    use `proxy`'s `protocol` first.
- `secure` If `protocol` is `https`, then `true`, otherwise `false`.
- `host` The requested host address (including `hostname` and `port`), if 
    `useProxy` is true, then try to use `proxy`'s `host` first.
- `hostname` The requested host name (without `port`).
- `port` The requested port.
- `subdomain` Unlike **express** or **koa**'s `subdomains`, this property is 
    calculated by setting the `domain` option, and it's a string.
- `path` Full requested path (with `search`).
- `pathname` Directory part of requested path (without `search`).
- `search` The requested URL `search` string, with a leading `?`.
- `query` Parsed URL query object, if you want to get original string, use 
    `URL.query` instead.
- `href` Full requested URL string (without `hash`, which is not sent by the 
    client).
- `referer` Equivalent to `headers.referer`.
- `origin` Reference to `headers.origin` or `URL.origin`.
- `type` The `Content-Type` requested body (without `charset`).
- `charset` The requested body's `charset`, or the first accepted charset 
    (`charsets[0]`), assume they both use a same charset. Unlinke other 
    properties, If you set this one to a valid charset, it will be used to 
    decode request body.
- `charsets` An array carries all `Accept-Charset`s, ordered by `q`ualities.
- `length` The `Content-Length` of requested body.
- `xhr` Whether the request fires with `X-Requested-With: XMLHttpRequest`.
- `cookies` An object carries all parsed `Cookie`s sent by the client.
- `ip` The real client IP, if `useProxy` is `true`, then trying to use 
    `proxy`'s `ip` first.
- `ips` An array carries all IP addresses, includes client IP and proxy 
    server IPs. Unlike `proxy.ips`, which may be `undefined`, while this
    will always be available.
- `accept` The first accepted response content type (`accepts[0]`).
- `accepts` An array carries all `Accept`s types, ordered by `q`ualities.
- `lang` The first accepted response language (`accepts[0]`).
- `langs` An array carries all `Accept-Language`s, ordered by `q`ualities.
- `encoding` The first accepted response encodings (`encodings[0]`). 
- `encodings` An array carries all `Accept-Encoding`s, ordered by sequence.
- `cache` `Cache-Control` sent by the client, it could be `null` (`no-cache`),
    a `number` of seconds (`max-age`), or a string `private`, `public`, etc.
- `keepAlive` Whether the request fires with `Connection: keep-alive`.
- `get(field)` Gets a request header field's (case insensitive) value.
- `is(...types)` Checks if the request `Content-Type` matches the given types,
    avaialable of using short-hand words, like `html` indicates `text/html`. 
    If pass, returns the first matched type.

```javascript
console.log(req.URL);
console.log(req.ip);
console.log(req.host);
console.log(req.subdomain);
console.log(req.query);
console.log(req.lang);
// ...
```

### Response

Most of `res` properties are setters/getters, if you assign a new value to 
them, that will actually mean something.

#### `code` - Set/Get status code.

```javascript
res.code = 200;
console.log(res.code); // => 200
```

#### `message` - Set/Get status message.

```javascript
res.message = "OK";
console.log(res.message); // => OK
```

#### `status` - Set/Get both status code and message.

```javascript
res.status = 200;
console.log(res.status); // => 200 OK

res.status = "200 Everything works fine.";
console.log(res.status); // => 200 Everything works fine.
console.log(res.code); // => 200
console.log(res.message); // => Everything works fine.
```

#### `type` - Set/Get `Content-Type` without `charset` part.

```javascript
res.type = "text/html";
res.type = "html"; // Will auto lookup to text/html.
console.log(res.type); // => text/html
```

#### `charset` - Set/Get `Content-Type` only with `charset` part.

```javascript
res.charset = "UTF-8";
console.log(res.charset); // => UTF-8
```

#### `length` Set/Get `Content-Length`.

```javascript
res.length = 12;
console.log(res.length); // => 12
```

#### `encoding` Set/Get `Content-Encoding`.

```javascript
res.encoding = "gzip";
console.log(res.encoding); // => gzip
```

#### `date` - Set/Get `Date`.

```javascript
res.date = new Date(); // You can set a date string or Date instance.
console.log(res.date); // => Fri, 15 Dec 2017 04:13:17 GMT
```

#### `etag` Set/Get - `Etag`.

This properties is internally used when calling `res.send()`, if you don't use
`res.send()`, you can call it manually.

```javascript
const etag = require("etag");

var body = "Hello, World!";
res.etag = etag(body);
console.log(res.etag); // => d-CgqfKmdylCVXq1NV12r0Qvj2XgE
```

#### `lastModified` - Set/Get `Last-Modified`.

```javascript
res.lastModified = new Date(2017); // You can set a date string or Date instance.
console.log(res.lastModified); // => Thu, 01 Jan 1970 00:00:02 GMT
```

#### `location` - Set/Get `Location`.

```javascript
res.location = "/login";
console.log(res.location); // => /login
```

#### `refresh` - Set/Get `Refresh` in a number of seconds.

```javascript
res.refresh = 3; // The page will auto-refresh in 3 seconds.
res.refresh = "3; URL=/logout"; // Auto-redirect to /logout in 3 seconds.
console.log(res.refresh); // => 3; URL=/logout
```

#### `attachment` - Set/Get `Content-Disposition` with a filename.

```javascript
res.attachment = "example.txt";
console.log(res.attchment); // => attachment; filename="example.txt"
```

#### `cahce` - Set/Get `Cache-Control`.

```javascript
res.cache = null; // no-cache
res.cache = 0; // max-age=0
res.cache = 3600; // max-age=3600
res.cache = "private";
console.log(res.cache); // private
```

#### `vary` - Set/Get `Vary`.

```javascript
res.vary = "Content-Type";
res.vary = ["Content-Type", "Content-Length"]; // Set multiple fields.
console.log(res.vary); // => Content-Type, Content-Length
```

#### `keepAlive` - Set/Get `Connection`.

```javascript
res.keepAlive = true; // Connection: keep-alive
console.log(res.keepAlive); // => true
```

#### `modified` - Whether the response has been modified.

This property is read-only, and only works after `res.atag` and
`res.lastModified` are set (whether explicitly or implicitly).

```javascript
res.send("Hello, World!");

if (res.modified) {
    console.log("A new response has been sent to the client.");
} else {
    console.log("A '304 Not Modified' response has been sent to the client");
}
```

#### `headers` - Set/Get response headers.

This property is a Proxy instance, you can only manipulate its properties to 
set headers.

```javascript
res.headers["x-powered-by"] = "Node.js/8.9.3";
console.log(res.headers); // => { "x-powered-by": "Node.js/8.9.3" }

// If you want to delete a heder, just call:
delete res.headers["x-powered-by"];
```

#### `cookies` - Set/Get response cookies.

This property is a Proxy instance, you can only manipulate its properties to 
set cookies.

```javascript
res.cookies.username = "Luna";
res.cookies.username = "Luna; Max-Age=3600"; // Set both value and max-age

// Because this module internally uses sfn-cookie to serialize cookies, so you 
// can also set cookies in this way:
const Cookie = require("sfn-cookie");
res.cookies.username = new Cookie({ value: "Luna", maxAge: 3600 });

console.log(res.cookies); // => { username: "Luna" }

// If you want to delete a cookie, just call:
delete res.cookies.username;
// Or this may be more convinient if you just wnat it to expire:
res.cookies.username = null;
```

You can check out more details about `sfn-cookie` on 
[GitHub](https://github.com/hyurl/sfn-cookie).

#### `get(field)` - Gets a response header field's value.

```javascript
var type = res.get("Content-Type");
// equivalent to 
var type = req.headers["content-type"];
```

#### `set(field, value)` - Sets a response header field's value.

```javascript
res.set("Content-Type", "text/html");
// equivalent to:
res.headers["content-type"] = "text/html";
```

#### `append(field, value)` - Appends a value to a response header field.

```javascript
res.append("Set-Cookie", "username=Luna");
res.append("Set-Cookie", "email=luna@example.com");
// equivalent to:
res.set("Set-Cookie", ["username=Luna", "email=luna@example.com"]);
```

#### `remove(field)` - Removes a response header field.

```javascript
res.remove("Set-Cookie");
// equivalent to:
delete res.headers["set-cookie"];
```

#### `cookie(name)` - Gets a response cookie.

```javascript
var name = res.cookie("username");
// equivalent to:
var name = res.cookies.username;
```

#### `cookie(name, value, options?: object)` - Sets a response cookie.

```javascript
res.cookie("username", "Luna");
// equivalent to:
res.cookies.username = "Luna";

// you can set additinal options:
res.cookie("username", "Luna", { maxAge: 3600 });
// equivalent to:
res.cookies.username = new Cookie({ value: "Luna" , maxAge: 3600 });
```

Be aware, you cannot set value as `Luna; Max-Age=3600` with `res.cookie()`, it
will always be treated as cookie value.

#### `auth()` - Makes an HTTP basic authentication.

```javascript
if(!req.auth){ // Require authendication if haven't.
    res.auth();
}else{
    // ...
}
```

#### `unauth()` - Clears authentication.

Since browsers clear authentication while response `401 Unauthorized`, so this
method is exactly the same as `req.auth()`, only more readable.

#### `redirect(url, code?: 301 | 302)` - Redirects the request to a specified URL.

```javascript
res.redirect("/login"); // code is 302 by default.
// If you want to go back to the previous page, just pass url -1.
res.redirect(-1);
```

#### `send(data)` - Sends contents to the client.

This method will automatically perform type checking, If `data` is a buffer, 
the `res.type` will be set to `application/octet-stream`; if `data` is an 
object (or array), `res.type` will be set to `application/json`; if `data` is 
a string, the program will detect if it's `text/plain` `text/html`, 
`application/xml`, or `application/json`.

This method also check if a response body has been modified or not, if 
`res.modified` is `false`, a `304 Not Modified` with no body will be sent.

```javascript
res.send("Hello, World!"); // text/plain
res.send("<p>Hello, World!</p>"); // text/html
res.send("<Text>Hello, World!</Text>"); // application/xml
res.send(`["Hello", "World!"]`); // application/json
res.send(["Hello", "World!"]); // application/json
res.send(Buffer.from("Hello, World!")); // application/octet-stream
```

This method could send jsonp response as well, if `res.jsonp` is set, or 
`options.jsonp` for `enhance()` is set and the query matches, a jsonp response
will be sent, and the `res.type` will be set to `application/javascript`.

```javascript
res.jsonp = "callback";
res.send(["Hello", "World!"]); // will result as callback(["Hello", "World!"])
```

#### `sendFile(filename, cb?: (err)=>void)` - Sends a file as response body.

This method also performs type checking.

```javascript
res.sendFile("example.txt");
// if you provide a callback function, then it will be called after the 
// response has been sent, or failed.
res.sendFile("example.txt", (err)=>{
    console.log(err ? `Fail due to: ${err.message}`: "Success!");
});
```

#### `download(filename, newName?: string)` Performs a file download function.

This method uses `res.sendFile()` to transfer the file, but instead of 
displaying on the page, the browser will download it to disk.

```javascript
res.download("example.txt");
// You can set a new name if the original one is inconvenient.
res.download("1a79a4d60de6718e8e5b326e338ae533.txt", "example.txt");
```

Other forms:

- `download(filename, cb:? (err)=>void)`
- `download(filename, newName, cb:? (err)=>void)`

The callback function, will be called after the response has been sent, or 
failed.

Other than downloading a real file, you can perform downloading a string by 
using `res.attachment` and `res.send()`.

```javascript
// This content will be downloaded using the name 'example.html':
res.attachment = "example.html";
res.send("<p>Hello, World!</p>");
```

Worth mentioned, if you use `res.send()` to send a Buffer, most browsers will 
download the buffer as a file, so it's always better to set `res.attachment` 
when you are sending buffers.