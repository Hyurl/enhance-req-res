import { ServerResponse, IncomingMessage } from "http";
import { Http2Stream, Http2ServerRequest, Http2ServerResponse } from "http2";
import * as url6 from "url6";
import * as SfnCookie from "sfn-cookie";

declare namespace enhance {
    export const URL: typeof url6.URL;
    export const Cookie: typeof SfnCookie.Cookie;

    export interface Request extends IncomingMessage {
        /**
         * The Http2Stream object backing the request 
         * (**only available with http2**).
         */
        readonly stream?: Http2Stream;

        /**
         * Request time, not really connection time, but the moment this 
         * module performs actions.
         */
        readonly time: number;

        /**
         * An object parsed by [url6](https://github.com/hyurl/url6) module. 
         * Be aware of `urlObj.auth`, which is actually sent by http 
         * `Basic Authentication`.
         */
        readonly urlObj: url6.URL;
        /** deprecated, use `urlObj` instead. */
        readonly URL: url6.URL;

        /** Request domain name. */
        readonly domainName?: string;

        /**
         * Unlike **express** or **koa**'s `subdomains`, this property is 
         * calculated by setting the `domain` option.
         */
        readonly subdomain?: string;

        /**
         * If the client requested via a proxy server, this property will be 
         * set, otherwise it's `null`. If available, it may contain these 
         * properties:
         * - `protocol` The client's real request protocol 
         *  (`x-forwarded-proto`).
         * - `host` The real host that client trying to request 
         *  (`x-forwarded-host`).
         * - `ip`: The real IP of client (`ips[0]`).
         * - `ips`: An array carries all IP addresses, includes client IP and 
         *  proxy server IPs (`x-forwarded-for`).
         */
        readonly proxy?: {
            protocol: string,
            host: string,
            ip: string,
            ips: string[]
        };

        /** HTTP Authentication of the client. */
        readonly auth?: { username: string, password: string };

        /**
         * Either `http` or `https`, if `useProxy` is true, then trying to use 
         * `proxy`'s `protocol` first.
         */
        readonly protocol: string;

        /** Whether the `protocol` is `https`. */
        readonly secure: boolean;

        /**
         * The requested host address (including `hostname` and `port`), if 
         * `useProxy` is true, then try to use `proxy`'s `host` first.
         */
        readonly host: string;

        /** The requested host name (without `port`). */
        readonly hostname: string;

        /** The requested port. */
        readonly port?: number;

        /** Full requested path (with `search`). */
        readonly path: string;

        /** Directory part of requested path (without `search`). */
        readonly pathname: string;

        /** The requested URL `search` string, with a leading `?`. */
        readonly search?: string;

        /** Parsed URL query object. */
        readonly query?: { [key: string]: string };

        /**
         * Full requested URL string (without `hash`, which is not sent by the
         * client).
         */
        readonly href: string;

        /** Equivalent to `headers.referer`. */
        readonly referer?: string;

        /** Reference to `headers.origin` or `urlObj.origin`. */
        readonly origin?: string;

        /** The `Content-Type` requested body (without `charset`). */
        readonly type?: string;

        /**
         * The requested body's `charset`, or the first accepted charset
         * (`charsets[0]`), assume they both use a same charset. Unlike other
         * properties, you can set this one to a valid charset, it will be 
         * used to decode request body.
         */
        charset?: string;

        /** An array carries all `Accept-Charset`s, ordered by `q`ualities. */
        readonly charsets: string[];

        /** The `Content-Length` of requested body. */
        length: number;

        /** An object carries all parsed `Cookie`s sent by the client. */
        readonly cookies?: { [name: string]: any };

        /**
         * The real client IP, if `useProxy` is `true`, then trying to use 
         * `proxy`'s `ip` first.
         */
        ip: string;

        /**
         * An array carries all IP addresses, includes client IP and proxy
         * server IPs. Unlike `proxy.ips`, which may be `undefined`, while 
         * this will always be available.
         */
        readonly ips: string[];

        /** The first accepted response content type (`accepts[0]`). */
        accept?: string;

        /** An array carries all `Accept`s types, ordered by `q`ualities. */
        readonly accepts: string[];

        /** The first accepted response language (`accepts[0]`). */
        lang?: string;

        /** An array carries all `Accept-Language`s, ordered by `q`ualities. */
        readonly langs: string[];

        /** The first accepted response encodings (`encodings[0]`). */
        encoding?: string;

        /** An array carries all `Accept-Encoding`s, ordered by sequence. */
        readonly encodings: string[];

        /** Whether the request fires with `X-Requested-With: XMLHttpRequest`. */
        readonly xhr: boolean;

        /** Whether the request fires with `Connection: keep-alive`. */
        readonly keepAlive: boolean;

        /**
         * `Cache-Control` sent by the client, it could be `null` (`no-cache`),
         * a `number` of seconds (`max-age`), or a string `private`, `public`,
         * etc.
         */
        readonly cache?: string | number;

        /**
         * Gets a request header field's (case insensitive) value.
         * @param field 
         */
        get(field: string): string;

        /**
         * Checks if the request `Content-Type` matches the given types, 
         * available of using short-hand words, like `html` indicates 
         * `text/html`. If pass, returns the first matched type.
         * @param types 
         */
        is(...types: string[]): string | false;
    }

    export interface Response extends ServerResponse {
        /**
         * The Http2Stream object backing the response 
         * (**only available with http2**).
         */
        readonly stream?: Http2Stream;

        /** Set/Get status code. */
        code: number;

        /** Set/Get status message. */
        message: string;

        /** Set/Get both status code and message. */
        status: number | string;

        /** Set/Get `Content-Type` without `charset` part. */
        type?: string;

        /** Set/Get `Content-Type` with only `charset` part. */
        charset?: string;

        /** Set/Get `Content-Length`. */
        length?: number;

        /** Set/Get `Content-Encoding`. */
        encoding?: string;

        /** Set/Get `Date`. */
        date?: string | Date;

        /** Set/Get - `Etag`. */
        etag?: string;

        /** Set/Get `Last-Modified`. */
        lastModified?: string | Date;

        /** Set/Get `Location`. */
        location?: string;

        /** 
         * Set/Get `Refresh` as a number of seconds, or a string with URL.
         * 
         * Example:
         * 
         *      res.refresh = 3; // The page will auto-refresh in 3 seconds.
         *      // Auto-redirect to /logout in 3 seconds:
         *      res.refresh = "3; URL=/logout";
         *      console.log(res.refresh); // => 3; URL=/logout
         */
        refresh?: number | string;

        /** 
         * Set/Get `Content-Disposition` with a filename.
         * 
         * Example:
         * 
         *      res.attachment = "example.txt";
         *      console.log(res.attachment); // => attachment; filename="example.txt"
         * */
        attachment?: string;

        /** 
         * Set/Get `Cache-Control`.
         * 
         * Example:
         * 
         *      res.cache = null; // no-cache
         *      res.cache = 0; // max-age=0
         *      res.cache = 3600; // max-age=3600
         *      res.cache = "private";
         *      console.log(res.cache); // private
         */
        cache?: string | number;

        /** 
         * Set/Get `Vary`.
         * 
         * Example:
         * 
         *      res.vary = "Content-Type";
         *      res.vary = ["Content-Type", "Content-Length"];
         *      console.log(res.vary); // => Content-Type, Content-Length
         */
        vary?: string | string[];

        /** Set `Connection` to `keep-alive` or check whether equivalent. */
        keepAlive: boolean;

        /** 
         * If set, the response data will be sent as jsonp and the given value 
         * will be used as the callback function name.
         */
        jsonp?: string;

        /** 
         * Whether the response has been modified.
         * 
         * This property is read-only, and only available after `res.atag` and
         * `res.lastModified` are set (whether explicitly or implicitly).
         */
        readonly modfied: boolean;

        /**
         * Set/Get response headers.
         * 
         * This property is a Proxy instance, and itself is read-only, you can 
         * only manipulate its properties to set headers.
         * 
         * Example:
         * 
         *      res.headers["x-powered-by"] = "Node.js/8.9.3";
         *      console.log(res.headers); // => { "x-powered-by": "Node.js/8.9.3" }
         *      
         *      // If you want to delete a header, just call:
         *      delete res.headers["x-powered-by"];
         */
        readonly headers: { [x: string]: string | number | Date };

        /**
         * Set/Get response cookies.
         *
         * This property is a Proxy instance, and itself is read-only, you can 
         * only manipulate its properties to set cookies.
         * 
         * Example:
         * 
         *      res.cookies.username = "Luna";
         *      res.cookies.username = "Luna; Max-Age=3600";
         * 
         *      res.cookies.username = new Cookie({ value: "Luna", maxAge: 3600 });
         * 
         *      console.log(res.cookies); // => { username: "Luna" }
         * 
         *      // If you want to delete a cookie, just call:
         *      delete res.cookies.username;
         *      // This may be more convenient if you just want it to expire:
         *      res.cookies.username = null;
         */
        readonly cookies: { [name: string]: any };

        /** Gets a response header field's value. */
        get(field: string): string;

        /** Sets a response header field's value. */
        set(field: string, value: string | string[] | Date): void;

        /** 
         * Appends a value to a response header field.
         * 
         * Example:
         * 
         *      res.append("Set-Cookie", "username=Luna");
         *      res.append("Set-Cookie", "email=luna@example.com");
         */
        append(field: string, value: string | string[] | Date): void;

        /** Removes a response header field. */
        remove(field: string): void;

        /** Gets a response cookie. */
        cookie(name: string): string;

        /**
         * Sets a response cookie.
         * 
         * Example:
         * 
         *      res.cookie("username", "Luna");
         * 
         *      res.cookie("username", "Luna", { maxAge: 3600 });
         */
        cookie(name: string, value: string, options?: SfnCookie.BaseCookieOptions): void;

        /** 
         * Makes an HTTP basic authentication.
         * 
         * Example:
         * 
         *      if(!req.auth){ // Require authentication if haven't.
         *          res.auth();
         *      }else{
         *           // ...
         *      }
         * */
        auth(realm: string): void;

        /** Clears authentication. */
        unauth(): void;

        /** 
         * Redirects the request to a specified URL.
         * @param url Set `url` to `-1` will go back to the previous page.
         * @param code Default: `302`.
         */
        redirect(url: string | -1, code?: 301 | 302): void;

        /**
         * Sends contents to the client.
         * 
         * This method will automatically perform type checking, If `data` is 
         * a buffer, the `res.type` will be set to `application/octet-stream`;
         * if `data` is an object (or array), `res.type` will be set to 
         * `application/json`; if `data` is a string, the program will detect 
         * if it's `text/plain`, `text/html`, `application/xml`, or 
         * `application/json`.
         *
         * This method also check if a response body has been modified since 
         * the last time, if `res.modified` is `false`, a `304 Not Modified` 
         * with no body will be sent.
         * 
         * This method could send jsonp response as well, if `res.jsonp` is 
         * set, or `options.jsonp` for the application is set and the query 
         * matches, a jsonp response will be sent, and the `res.type` will be 
         * set to `application/javascript`.
         * 
         * Example:
         * 
         *      res.send("Hello, World!"); // text/plain
         *      res.send("<p>Hello, World!</p>"); // text/html
         *      res.send("<Text>Hello, World!</Text>"); // application/xml
         *      res.send(`["Hello", "World!"]`); // application/json
         *      res.send(["Hello", "World!"]); // application/json
         * 
         *      // application/octet-stream
         *      res.send(Buffer.from("Hello, World!"));
         * 
         *      res.jsonp = "callback";
         *      res.send(["Hello", "World!"]);
         *      // will result as 'callback(["Hello", "World!"])'
         */
        send(data: any): void;

        /**
         * Sends a file as response body.
         * 
         * This method also performs type checking.
         * 
         * Example:
         * 
         *      res.sendFile("example.txt");
         *      // if you provide a callback function, then it will be called 
         *      // after the response has been sent, or failed.
         *      res.sendFile("example.txt", (err)=>{
         *          console.log(err ? `Fail!`: "Success!");
         *      });
         */
        sendFile(filename: string, cb?: (err: Error) => void): void;

        /**
         * Performs a file download function.
         * 
         * Example:
         * 
         *      res.download("example.txt");
         */
        download(filename: string, cb?: (err: Error) => void): void;

        /**
         * Performs a file download function, and set a new name to the 
         * response.
         * 
         * Example:
         * 
         *     res.download("1a79a4d60de6718e8e5b326e338ae533.txt", "example.txt");
         */
        download(filename: string, newName: string, cb?: (err: Error) => void): void;
    }

    export interface Options {
        domain?: string | string[],
        useProxy?: boolean,
        capitalize?: boolean,
        cookieSecret?: string,
        /**
         * Set a query name for jsonp callback if needed. If `true` is set, 
         * then the query name will be `jsonp`. In the query string, using the
         * style `jsonp=callback` to request jsonp response.
         */
        jsonp?: string | boolean,
    }
}

declare function enhance(options?: enhance.Options): (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse
) => {
    req: enhance.Request,
    res: enhance.Response
};

export = enhance;