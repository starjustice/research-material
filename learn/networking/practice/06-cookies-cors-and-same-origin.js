// Lesson 06: Cookies, CORS and same origin. Write the nine pieces below, then run:
//   node --test learn/networking/practice/06-cookies-cors-and-same-origin.test.js
//
// The helpers below the comments (siteOf, lower, list, unsafeHeaders) are already written for you.
// Never change the objects you are given.
//
//   originOf(url)
//       The origin of a web address, as { scheme, host, port }. Use new URL(url).
//       scheme has no colon: "https". host is lower case. port is a number.
//       When the address has no port, use the default: 80 for http and 443 for https.
//       Any scheme other than http and https: throw an Error("only http and https are supported").
//
//   sameOrigin(a, b)
//       true when two addresses have the same scheme, host AND port.
//
//   sameSite(a, b)
//       true when the scheme is the same AND siteOf(host) is the same. The port does not matter.
//
//   needsPreflight(request)
//       request: { method, headers }. headers is a plain object like { "Content-Type": "application/json" }.
//       true when the browser must ask first with an OPTIONS request:
//       the method is not GET, HEAD or POST (letter case does not matter), or unsafeHeaders(headers) is not empty.
//
//   corsHeaders(config, request)
//       What an Express server with the cors package sends back.
//       config:  { allowedOrigins, credentials, methods, headers, maxAge }
//                allowedOrigins is "*" or a list of exact origins like "http://localhost:3000".
//                credentials, methods, headers and maxAge are optional.
//       request: { method, origin, requestHeaders }. origin is the Origin header (undefined for curl).
//                requestHeaders is the list of header names the browser asked about in a preflight (optional).
//       Return a plain object of response headers. Rules, in this order:
//         - no origin: return {}
//         - allowedOrigins is "*":          "Access-Control-Allow-Origin": "*"   (no Vary)
//         - origin is in the list:          "Access-Control-Allow-Origin": that origin, and "Vary": "Origin"
//         - origin is not in the list:      return only { "Vary": "Origin" }
//         - credentials is true:            add "Access-Control-Allow-Credentials": "true"
//         - method is OPTIONS (a preflight) and the origin was allowed, also add:
//             "Access-Control-Allow-Methods": config.methods joined with ","
//                 (default when config.methods is missing: GET,HEAD,PUT,PATCH,POST,DELETE)
//             "Access-Control-Allow-Headers": config.headers joined with ","
//                 (when config.headers is missing: the request's requestHeaders joined with ",",
//                  and nothing at all when there are none)
//             "Access-Control-Max-Age": String(config.maxAge), only when maxAge is set
//       Header names must be written exactly as above.
//
//   checkCors(request, responseHeaders, isPreflight)
//       The check the BROWSER does on the answer. request: { origin, method, headers, credentials }.
//       Header names in responseHeaders can be in any letter case (use the lower() helper).
//       Return { ok: true } or { ok: false, reason }. Check in this order, stop at the first problem:
//         1. no Access-Control-Allow-Origin:                    "no Access-Control-Allow-Origin header"
//         2. credentials is true and the value is "*":          "* is not allowed with credentials"
//         3. credentials is true and Allow-Credentials is not "true":
//                                                               "Access-Control-Allow-Credentials must be true"
//         4. the value is not "*" and not request.origin:       "origin <origin> is not allowed"
//         Only when isPreflight is true, also check:
//         5. the method is not GET, HEAD or POST and is not in Access-Control-Allow-Methods
//            (letter case of the method does not matter; a "*" in the list counts only without credentials):
//                                                               "method <METHOD> is not allowed"
//         6. for each name in unsafeHeaders(request.headers), in order: it must be in Access-Control-Allow-Headers
//            (letter case does not matter). A "*" in the list covers it only without credentials,
//            and never covers "authorization":                  "header <name> is not allowed"
//
//   browserFetch(request, config)
//       Run the whole story. request: { pageUrl, url, method, headers, credentials }. config: as for corsHeaders.
//       Return { sent, serverRan, jsCanRead, reason }.
//         - same origin (pageUrl and url): { sent: [METHOD], serverRan: true, jsCanRead: true, reason: "same origin, no CORS" }
//         - otherwise the Origin header is new URL(pageUrl).origin.
//         - if needsPreflight: sent starts with "OPTIONS". Ask corsHeaders for an OPTIONS answer (pass
//           requestHeaders: unsafeHeaders(request.headers)). If checkCors(..., true) fails:
//           { sent: ["OPTIONS"], serverRan: false, jsCanRead: false, reason: "preflight failed: " + problem }
//         - then the real request goes out: add METHOD (upper case) to sent. The server ALWAYS runs it.
//           Ask corsHeaders with the real method. If checkCors(..., false) fails:
//           { serverRan: true, jsCanRead: false, reason: problem }
//         - success: { serverRan: true, jsCanRead: true, reason: "allowed" }
//       The request passed to checkCors is { origin, method, headers, credentials }.
//
//   setCookieHeader(options)
//       Build the value of a Set-Cookie header.
//       options: { name, value, maxAge, domain, path, secure, httpOnly, sameSite }. Only name and value are required.
//       Write the parts in this order, joined by "; ":
//         name=value, Max-Age=<n>, Domain=<d>, Path=<p>, Secure, HttpOnly, SameSite=<s>
//       Leave out a part that is not set. Throw an Error with these exact messages, checked in this order:
//         sameSite is set and is not Strict, Lax or None:   "sameSite must be Strict, Lax or None"
//         SameSite=None without secure:                     "SameSite=None needs Secure"
//         name starts with __Secure- and not secure:        "__Secure- needs Secure"
//         name starts with __Host- and not secure:          "__Host- needs Secure"
//         name starts with __Host- and has a domain:        "__Host- must not have Domain"
//         name starts with __Host- and path is not "/":     "__Host- needs Path=/"
//
//   cookieSent(cookie, request)
//       Will the browser attach this cookie to this request? Return { sent, reason }.
//       cookie:  { host, domain, path, secure, sameSite }. host is the host that set it. The rest are optional.
//                No domain means "only exactly that host". No path means "/". No sameSite means "Lax".
//       request: { url, pageUrl, method, navigation }. pageUrl is the page the user is looking at.
//                navigation is true when the user's browser is moving to url (a link click, not fetch).
//       Check in this order and stop at the first problem:
//         1. host: with a domain, the request host is that domain or a subdomain of it
//                  (a leading dot in domain does not matter). Without a domain, the host must be exactly cookie.host.
//                                                               { sent: false, reason: "host does not match" }
//         2. path: "/" matches everything. Otherwise the request path equals cookie.path or starts with cookie.path + "/".
//                                                               { sent: false, reason: "path does not match" }
//         3. cookie.secure and the request is not https:        { sent: false, reason: "Secure cookie needs https" }
//         4. sameSite(pageUrl, url) is true:                    { sent: true, reason: "same site" }
//         5. a different site. Look at the cookie's SameSite:
//              None:                                           { sent: true, reason: "SameSite=None" }
//              Lax, and navigation is true, and method is GET: { sent: true, reason: "Lax allows a top level GET" }
//              anything else:                                  { sent: false, reason: "blocked by SameSite=" + mode }

// ---------- helpers, already written ----------
const PORTS = { "http:": 80, "https:": 443 };
const PUBLIC_SUFFIXES = ["co.uk", "com.au", "co.id", "github.io", "vercel.app"];
const SAFE_METHODS = ["GET", "HEAD", "POST"];

// The "site" of a host: the registrable name. "api.shop.example.com" and "www.example.com" are both "example.com".
// Real browsers use the Public Suffix List. This model knows only the five suffixes above.
function siteOf(host) {
  const h = host.toLowerCase();
  const labels = h.split(".");
  if (labels.length < 2) return h;
  for (const suffix of PUBLIC_SUFFIXES) {
    if (h.endsWith("." + suffix)) {
      const rest = h.slice(0, h.length - suffix.length - 1).split(".");
      return rest[rest.length - 1] + "." + suffix;
    }
  }
  return labels.slice(-2).join(".");
}

// A copy of an object with every key in lower case, and every value as text.
function lower(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) out[k.toLowerCase()] = String(v);
  return out;
}

// "GET, POST" becomes ["GET", "POST"].
const list = (text) => (text || "").split(",").map((s) => s.trim()).filter(Boolean);

// The request headers that are NOT on the browser's safe list, as lower case names, in the order given.
// Safe: accept, accept-language, content-language, and content-type only with
// application/x-www-form-urlencoded, multipart/form-data or text/plain (a "; charset=..." part is ignored).
function unsafeHeaders(headers) {
  const safeNames = ["accept", "accept-language", "content-language"];
  const safeTypes = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];
  const out = [];
  for (const [name, value] of Object.entries(headers || {})) {
    const n = name.toLowerCase();
    if (n === "content-type") {
      if (!safeTypes.includes(String(value).split(";")[0].trim().toLowerCase())) out.push(n);
    } else if (!safeNames.includes(n)) {
      out.push(n);
    }
  }
  return out;
}

// ---------- your nine pieces ----------

function originOf(url) {
  // TODO
}

function sameOrigin(a, b) {
  // TODO
}

function sameSite(a, b) {
  // TODO
}

function needsPreflight(request) {
  // TODO
}

function corsHeaders(config, request) {
  // TODO
}

function checkCors(request, responseHeaders, isPreflight) {
  // TODO
}

function browserFetch(request, config) {
  // TODO
}

function setCookieHeader(options) {
  // TODO
}

function cookieSent(cookie, request) {
  // TODO
}

module.exports = { originOf, sameOrigin, sameSite, unsafeHeaders, needsPreflight, corsHeaders, checkCors, browserFetch, setCookieHeader, cookieSent };
