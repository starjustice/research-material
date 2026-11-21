const test = require("node:test");
const assert = require("node:assert");
const {
  originOf, sameOrigin, sameSite, needsPreflight, corsHeaders, checkCors, browserFetch, setCookieHeader, cookieSent,
} = require("./06-cookies-cors-and-same-origin");

const copy = (value) => JSON.parse(JSON.stringify(value));

// ---------- originOf ----------

test("originOf: scheme, host and port", () => {
  assert.deepStrictEqual(originOf("https://shop.example.com:8443/cart?x=1"), { scheme: "https", host: "shop.example.com", port: 8443 });
});

test("originOf: default ports are filled in", () => {
  assert.deepStrictEqual(originOf("http://example.com/a"), { scheme: "http", host: "example.com", port: 80 });
  assert.deepStrictEqual(originOf("https://example.com"), { scheme: "https", host: "example.com", port: 443 });
});

test("originOf: host is lower case", () => {
  assert.strictEqual(originOf("https://Shop.Example.COM/").host, "shop.example.com");
});

test("originOf: other schemes throw", () => {
  assert.throws(() => originOf("ftp://example.com"), /only http and https are supported/);
  assert.throws(() => originOf("file:///tmp/a.html"), /only http and https are supported/);
});

// ---------- sameOrigin ----------

test("sameOrigin: only the path differs", () => {
  assert.strictEqual(sameOrigin("https://a.com/x", "https://a.com/y/z?q=1"), true);
});

test("sameOrigin: a different scheme is another origin", () => {
  assert.strictEqual(sameOrigin("http://a.com", "https://a.com"), false);
});

test("sameOrigin: the same number with another scheme is another origin", () => {
  assert.strictEqual(sameOrigin("http://a.com:8443", "https://a.com:8443"), false);
  assert.strictEqual(sameOrigin("http://a.com:443", "https://a.com"), false);
});

test("sameOrigin: a different port is another origin", () => {
  assert.strictEqual(sameOrigin("http://localhost:3000", "http://localhost:4000"), false);
});

test("sameOrigin: a different host is another origin, even a subdomain", () => {
  assert.strictEqual(sameOrigin("https://example.com", "https://api.example.com"), false);
  assert.strictEqual(sameOrigin("https://example.com", "https://example.org"), false);
});

test("sameOrigin: the default port written out is the same origin", () => {
  assert.strictEqual(sameOrigin("https://a.com", "https://a.com:443/x"), true);
  assert.strictEqual(sameOrigin("http://a.com", "http://a.com:80"), true);
  assert.strictEqual(sameOrigin("http://a.com", "http://a.com:81"), false);
});

test("sameOrigin: letter case in the host does not matter", () => {
  assert.strictEqual(sameOrigin("https://A.com", "https://a.COM/x"), true);
});

// ---------- sameSite ----------

test("sameSite: other port and other subdomain are the same site", () => {
  assert.strictEqual(sameSite("http://localhost:3000", "http://localhost:4000"), true);
  assert.strictEqual(sameSite("https://www.example.com", "https://api.example.com"), true);
  assert.strictEqual(sameSite("https://example.com", "https://a.b.example.com"), true);
});

test("sameSite: another registrable name is another site", () => {
  assert.strictEqual(sameSite("https://example.com", "https://example.org"), false);
  assert.strictEqual(sameSite("https://shop.com", "https://evilshop.com"), false);
});

test("sameSite: a different scheme is another site", () => {
  assert.strictEqual(sameSite("http://example.com", "https://example.com"), false);
});

test("sameSite: public suffixes count as part of the name", () => {
  assert.strictEqual(sameSite("https://alice.github.io", "https://bob.github.io"), false);
  assert.strictEqual(sameSite("https://a.alice.github.io", "https://b.alice.github.io"), true);
  assert.strictEqual(sameSite("https://shop.co.uk", "https://bank.co.uk"), false);
  assert.strictEqual(sameSite("https://www.shop.co.uk", "https://api.shop.co.uk"), true);
});

test("sameSite: localhost and 127.0.0.1 are different sites", () => {
  assert.strictEqual(sameSite("http://localhost:3000", "http://127.0.0.1:3000"), false);
});

// ---------- needsPreflight ----------

test("needsPreflight: a plain GET does not", () => {
  assert.strictEqual(needsPreflight({ method: "GET", headers: {} }), false);
  assert.strictEqual(needsPreflight({ method: "GET" }), false);
});

test("needsPreflight: GET, HEAD and POST with safe headers do not", () => {
  assert.strictEqual(needsPreflight({ method: "HEAD", headers: { Accept: "application/json" } }), false);
  assert.strictEqual(needsPreflight({ method: "POST", headers: { "Content-Type": "text/plain" } }), false);
  assert.strictEqual(needsPreflight({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } }), false);
  assert.strictEqual(needsPreflight({ method: "post", headers: { "Content-Type": "multipart/form-data; boundary=x" } }), false);
});

test("needsPreflight: other methods do", () => {
  for (const method of ["PUT", "PATCH", "DELETE", "put"]) {
    assert.strictEqual(needsPreflight({ method, headers: {} }), true, method);
  }
});

test("needsPreflight: a JSON body does", () => {
  assert.strictEqual(needsPreflight({ method: "POST", headers: { "Content-Type": "application/json" } }), true);
  assert.strictEqual(needsPreflight({ method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" } }), true);
});

test("needsPreflight: Authorization and custom headers do", () => {
  assert.strictEqual(needsPreflight({ method: "GET", headers: { Authorization: "Bearer x" } }), true);
  assert.strictEqual(needsPreflight({ method: "GET", headers: { "X-Request-Id": "1" } }), true);
});

test("needsPreflight: does not change the request", () => {
  const r = { method: "POST", headers: { "Content-Type": "application/json" } };
  const before = copy(r);
  needsPreflight(r);
  assert.deepStrictEqual(r, before);
});

// ---------- corsHeaders ----------

const strict = { allowedOrigins: ["http://localhost:3000", "https://shop.example.com"], credentials: true, methods: ["GET", "POST", "DELETE"], headers: ["Content-Type", "Authorization"], maxAge: 600 };

test("corsHeaders: no Origin header (curl) gets nothing", () => {
  assert.deepStrictEqual(corsHeaders(strict, { method: "GET" }), {});
  assert.deepStrictEqual(corsHeaders({ allowedOrigins: "*" }, { method: "GET" }), {});
});

test("corsHeaders: an allowed origin is copied back, with Vary and credentials", () => {
  assert.deepStrictEqual(corsHeaders(strict, { method: "GET", origin: "http://localhost:3000" }), {
    "Access-Control-Allow-Origin": "http://localhost:3000",
    Vary: "Origin",
    "Access-Control-Allow-Credentials": "true",
  });
});

test("corsHeaders: the answer follows the origin that asked", () => {
  const h = corsHeaders(strict, { method: "GET", origin: "https://shop.example.com" });
  assert.strictEqual(h["Access-Control-Allow-Origin"], "https://shop.example.com");
});

test("corsHeaders: an origin that is not in the list gets only Vary", () => {
  assert.deepStrictEqual(corsHeaders(strict, { method: "GET", origin: "https://evil.com" }), { Vary: "Origin" });
  assert.deepStrictEqual(corsHeaders(strict, { method: "OPTIONS", origin: "https://evil.com" }), { Vary: "Origin" });
});

test("corsHeaders: the list needs an exact match", () => {
  assert.deepStrictEqual(corsHeaders(strict, { method: "GET", origin: "http://localhost:3001" }), { Vary: "Origin" });
  assert.deepStrictEqual(corsHeaders(strict, { method: "GET", origin: "https://shop.example.com.evil.com" }), { Vary: "Origin" });
});

test("corsHeaders: * sends * and no Vary", () => {
  assert.deepStrictEqual(corsHeaders({ allowedOrigins: "*" }, { method: "GET", origin: "https://anything.com" }), { "Access-Control-Allow-Origin": "*" });
});

test("corsHeaders: * with credentials sends both (the browser will refuse it)", () => {
  assert.deepStrictEqual(corsHeaders({ allowedOrigins: "*", credentials: true }, { method: "GET", origin: "https://a.com" }), {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
  });
});

test("corsHeaders: a preflight gets methods, headers and max age", () => {
  assert.deepStrictEqual(corsHeaders(strict, { method: "OPTIONS", origin: "http://localhost:3000" }), {
    "Access-Control-Allow-Origin": "http://localhost:3000",
    Vary: "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,DELETE",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "600",
  });
});

test("corsHeaders: a normal request does not get methods or headers", () => {
  const h = corsHeaders(strict, { method: "POST", origin: "http://localhost:3000" });
  assert.strictEqual(h["Access-Control-Allow-Methods"], undefined);
  assert.strictEqual(h["Access-Control-Allow-Headers"], undefined);
  assert.strictEqual(h["Access-Control-Max-Age"], undefined);
});

test("corsHeaders: default methods when none are set", () => {
  const h = corsHeaders({ allowedOrigins: "*" }, { method: "OPTIONS", origin: "https://a.com" });
  assert.strictEqual(h["Access-Control-Allow-Methods"], "GET,HEAD,PUT,PATCH,POST,DELETE");
  assert.strictEqual(h["Access-Control-Max-Age"], undefined);
  assert.strictEqual(h["Access-Control-Allow-Headers"], undefined);
});

test("corsHeaders: with no headers set, the asked headers are copied back", () => {
  const h = corsHeaders({ allowedOrigins: "*" }, { method: "OPTIONS", origin: "https://a.com", requestHeaders: ["content-type", "x-foo"] });
  assert.strictEqual(h["Access-Control-Allow-Headers"], "content-type,x-foo");
});

test("corsHeaders: set headers win over the asked headers", () => {
  const h = corsHeaders(strict, { method: "OPTIONS", origin: "http://localhost:3000", requestHeaders: ["x-foo"] });
  assert.strictEqual(h["Access-Control-Allow-Headers"], "Content-Type,Authorization");
});

test("corsHeaders: a max age of 0 is still sent", () => {
  const h = corsHeaders({ allowedOrigins: "*", maxAge: 0 }, { method: "OPTIONS", origin: "https://a.com" });
  assert.strictEqual(h["Access-Control-Max-Age"], "0");
});

test("corsHeaders: does not change the config", () => {
  const c = copy(strict);
  corsHeaders(c, { method: "OPTIONS", origin: "http://localhost:3000" });
  assert.deepStrictEqual(c, strict);
});

// ---------- checkCors ----------

const ask = { origin: "http://localhost:3000", method: "GET", headers: {}, credentials: false };

test("checkCors: no Allow-Origin header fails", () => {
  assert.deepStrictEqual(checkCors(ask, {}, false), { ok: false, reason: "no Access-Control-Allow-Origin header" });
  assert.deepStrictEqual(checkCors(ask, { Vary: "Origin" }, false), { ok: false, reason: "no Access-Control-Allow-Origin header" });
});

test("checkCors: the same origin or * passes without credentials", () => {
  assert.deepStrictEqual(checkCors(ask, { "Access-Control-Allow-Origin": "http://localhost:3000" }, false), { ok: true });
  assert.deepStrictEqual(checkCors(ask, { "Access-Control-Allow-Origin": "*" }, false), { ok: true });
});

test("checkCors: another origin fails", () => {
  assert.deepStrictEqual(checkCors(ask, { "Access-Control-Allow-Origin": "https://shop.example.com" }, false), {
    ok: false, reason: "origin http://localhost:3000 is not allowed",
  });
});

test("checkCors: header names can be in any letter case", () => {
  assert.deepStrictEqual(checkCors(ask, { "access-control-allow-origin": "*" }, false), { ok: true });
  assert.deepStrictEqual(checkCors(ask, { "ACCESS-CONTROL-ALLOW-ORIGIN": "http://localhost:3000" }, false), { ok: true });
});

test("checkCors: * fails with credentials, even with Allow-Credentials", () => {
  const withCreds = { ...ask, credentials: true };
  assert.deepStrictEqual(checkCors(withCreds, { "Access-Control-Allow-Origin": "*" }, false), { ok: false, reason: "* is not allowed with credentials" });
  assert.deepStrictEqual(
    checkCors(withCreds, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true" }, false),
    { ok: false, reason: "* is not allowed with credentials" });
});

test("checkCors: credentials need Allow-Credentials true", () => {
  const withCreds = { ...ask, credentials: true };
  assert.deepStrictEqual(checkCors(withCreds, { "Access-Control-Allow-Origin": "http://localhost:3000" }, false), {
    ok: false, reason: "Access-Control-Allow-Credentials must be true",
  });
  assert.deepStrictEqual(
    checkCors(withCreds, { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Credentials": "false" }, false),
    { ok: false, reason: "Access-Control-Allow-Credentials must be true" });
  assert.deepStrictEqual(
    checkCors(withCreds, { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Credentials": "true" }, false),
    { ok: true });
});

test("checkCors: Allow-Credentials is not needed without credentials", () => {
  assert.deepStrictEqual(checkCors(ask, { "Access-Control-Allow-Origin": "http://localhost:3000" }, false), { ok: true });
});

test("checkCors: the credentials check comes before the origin check", () => {
  const withCreds = { ...ask, credentials: true };
  assert.strictEqual(checkCors(withCreds, { "Access-Control-Allow-Origin": "https://other.com" }, false).reason, "Access-Control-Allow-Credentials must be true");
});

const pre = (over) => ({ ...ask, ...over });
const okOrigin = { "Access-Control-Allow-Origin": "http://localhost:3000" };

test("checkCors: a preflight for a safe GET needs no method or header list", () => {
  assert.deepStrictEqual(checkCors(pre({}), okOrigin, true), { ok: true });
});

test("checkCors: a preflight for DELETE needs DELETE in the list", () => {
  const req = pre({ method: "DELETE" });
  assert.deepStrictEqual(checkCors(req, okOrigin, true), { ok: false, reason: "method DELETE is not allowed" });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Methods": "GET,POST" }, true), { ok: false, reason: "method DELETE is not allowed" });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Methods": "GET, POST, DELETE" }, true), { ok: true });
});

test("checkCors: the method name is read in upper case", () => {
  assert.deepStrictEqual(checkCors(pre({ method: "delete" }), { ...okOrigin, "Access-Control-Allow-Methods": "DELETE" }, true), { ok: true });
});

test("checkCors: the method is only checked on a preflight", () => {
  assert.deepStrictEqual(checkCors(pre({ method: "DELETE" }), okOrigin, false), { ok: true });
});

test("checkCors: POST and HEAD are always fine", () => {
  assert.deepStrictEqual(checkCors(pre({ method: "POST" }), { ...okOrigin, "Access-Control-Allow-Methods": "GET" }, true), { ok: true });
});

test("checkCors: a * in the method list works only without credentials", () => {
  const h = { ...okOrigin, "Access-Control-Allow-Methods": "*" };
  assert.deepStrictEqual(checkCors(pre({ method: "PUT" }), h, true), { ok: true });
  assert.deepStrictEqual(
    checkCors(pre({ method: "PUT", credentials: true }), { ...h, "Access-Control-Allow-Credentials": "true" }, true),
    { ok: false, reason: "method PUT is not allowed" });
});

test("checkCors: a JSON body needs content-type in the header list", () => {
  const req = pre({ method: "POST", headers: { "Content-Type": "application/json" } });
  assert.deepStrictEqual(checkCors(req, okOrigin, true), { ok: false, reason: "header content-type is not allowed" });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Headers": "Content-Type" }, true), { ok: true });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Headers": "authorization, content-type" }, true), { ok: true });
});

test("checkCors: every unsafe header must be listed, and the first missing one is named", () => {
  const req = pre({ headers: { "X-Foo": "1", Authorization: "Bearer x", Accept: "*/*" } });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Headers": "authorization" }, true), { ok: false, reason: "header x-foo is not allowed" });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Headers": "x-foo" }, true), { ok: false, reason: "header authorization is not allowed" });
  assert.deepStrictEqual(checkCors(req, { ...okOrigin, "Access-Control-Allow-Headers": "X-Foo,Authorization" }, true), { ok: true });
});

test("checkCors: * in the header list covers custom headers but never authorization", () => {
  const h = { ...okOrigin, "Access-Control-Allow-Headers": "*" };
  assert.deepStrictEqual(checkCors(pre({ headers: { "X-Foo": "1" } }), h, true), { ok: true });
  assert.deepStrictEqual(checkCors(pre({ headers: { Authorization: "Bearer x" } }), h, true), { ok: false, reason: "header authorization is not allowed" });
});

test("checkCors: * in the header list does not work with credentials", () => {
  const req = pre({ credentials: true, headers: { "X-Foo": "1" } });
  const h = { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "*" };
  assert.deepStrictEqual(checkCors(req, h, true), { ok: false, reason: "header x-foo is not allowed" });
});

test("checkCors: the origin problem is reported before the method problem", () => {
  assert.strictEqual(checkCors(pre({ method: "DELETE" }), {}, true).reason, "no Access-Control-Allow-Origin header");
});

test("checkCors: does not change its inputs", () => {
  const req = pre({ method: "PUT", headers: { "X-Foo": "1" } });
  const h = { ...okOrigin, "Access-Control-Allow-Methods": "PUT", "Access-Control-Allow-Headers": "x-foo" };
  const before = copy([req, h]);
  checkCors(req, h, true);
  assert.deepStrictEqual(copy([req, h]), before);
});

// ---------- browserFetch ----------

const API = "http://localhost:4000";
const PAGE = "http://localhost:3000/app";
const api = { allowedOrigins: ["http://localhost:3000"], credentials: true, methods: ["GET", "POST", "DELETE"], headers: ["Content-Type", "Authorization"] };

test("browserFetch: the same origin needs no CORS", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: "http://localhost:3000/a", url: "http://localhost:3000/api", method: "POST", headers: { "Content-Type": "application/json" } }, { allowedOrigins: [] }), {
    sent: ["POST"], serverRan: true, jsCanRead: true, reason: "same origin, no CORS",
  });
});

test("browserFetch: an allowed simple GET works", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET" }, api), {
    sent: ["GET"], serverRan: true, jsCanRead: true, reason: "allowed",
  });
});

test("browserFetch: a simple GET from a stranger still RUNS on the server, but JS cannot read it", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: "http://127.0.0.1:3000/", url: API + "/data", method: "GET" }, api), {
    sent: ["GET"], serverRan: true, jsCanRead: false, reason: "no Access-Control-Allow-Origin header",
  });
});

test("browserFetch: a JSON POST goes OPTIONS first, then POST", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/json", method: "POST", headers: { "Content-Type": "application/json" } }, api), {
    sent: ["OPTIONS", "POST"], serverRan: true, jsCanRead: true, reason: "allowed",
  });
});

test("browserFetch: a JSON POST from a stranger stops after OPTIONS, the server never runs it", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: "http://127.0.0.1:3000/", url: API + "/json", method: "POST", headers: { "Content-Type": "application/json" } }, api), {
    sent: ["OPTIONS"], serverRan: false, jsCanRead: false, reason: "preflight failed: no Access-Control-Allow-Origin header",
  });
});

test("browserFetch: a method that the server does not list stops after OPTIONS", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/item", method: "PUT" }, api), {
    sent: ["OPTIONS"], serverRan: false, jsCanRead: false, reason: "preflight failed: method PUT is not allowed",
  });
});

test("browserFetch: a header that the server does not list stops after OPTIONS", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET", headers: { "X-Foo": "1" } }, api), {
    sent: ["OPTIONS"], serverRan: false, jsCanRead: false, reason: "preflight failed: header x-foo is not allowed",
  });
});

test("browserFetch: DELETE with an allowed method goes OPTIONS then DELETE", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/item", method: "DELETE" }, api).sent, ["OPTIONS", "DELETE"]);
});

test("browserFetch: the method in sent is upper case", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/item", method: "delete" }, api).sent, ["OPTIONS", "DELETE"]);
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "get" }, api).sent, ["GET"]);
});

test("browserFetch: * with credentials runs on the server, but JS cannot read it", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET", credentials: true }, { allowedOrigins: "*", credentials: true }), {
    sent: ["GET"], serverRan: true, jsCanRead: false, reason: "* is not allowed with credentials",
  });
});

test("browserFetch: * without credentials works", () => {
  assert.strictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET" }, { allowedOrigins: "*" }).jsCanRead, true);
});

test("browserFetch: credentials work with a listed origin", () => {
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/me", method: "GET", credentials: true }, api), {
    sent: ["GET"], serverRan: true, jsCanRead: true, reason: "allowed",
  });
});

test("browserFetch: a server that forgot Allow-Credentials blocks a credentialed request", () => {
  const noCreds = { allowedOrigins: ["http://localhost:3000"] };
  assert.deepStrictEqual(browserFetch({ pageUrl: PAGE, url: API + "/me", method: "GET", credentials: true }, noCreds), {
    sent: ["GET"], serverRan: true, jsCanRead: false, reason: "Access-Control-Allow-Credentials must be true",
  });
});

test("browserFetch: a server with no header list accepts whatever headers the browser asks about", () => {
  const open = { allowedOrigins: "*" };
  assert.strictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET", headers: { "X-Foo": "1" } }, open).jsCanRead, true);
});

test("browserFetch: Authorization with * and no header list still needs the preflight to pass", () => {
  assert.strictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET", headers: { Authorization: "Bearer x" } }, { allowedOrigins: "*" }).jsCanRead, true);
  assert.strictEqual(browserFetch({ pageUrl: PAGE, url: API + "/data", method: "GET", headers: { Authorization: "Bearer x" } }, { allowedOrigins: "*", headers: ["*"] }).jsCanRead, false);
});

test("browserFetch: the origin is the page's origin, without the path", () => {
  const config = { allowedOrigins: ["https://shop.example.com"] };
  assert.strictEqual(browserFetch({ pageUrl: "https://shop.example.com/cart/1?x=2", url: "https://api.example.com/x", method: "GET" }, config).jsCanRead, true);
});

test("browserFetch: a simple POST (text/plain) is sent without a preflight", () => {
  const r = browserFetch({ pageUrl: "https://evil.com/", url: "https://bank.com/transfer", method: "POST", headers: { "Content-Type": "text/plain" } }, { allowedOrigins: ["https://bank.com"] });
  assert.deepStrictEqual(r.sent, ["POST"]);
  assert.strictEqual(r.serverRan, true);
  assert.strictEqual(r.jsCanRead, false);
});

test("browserFetch: does not change its inputs", () => {
  const req = { pageUrl: PAGE, url: API + "/json", method: "POST", headers: { "Content-Type": "application/json" } };
  const before = copy([req, api]);
  browserFetch(req, api);
  assert.deepStrictEqual(copy([req, api]), before);
});

// ---------- setCookieHeader ----------

test("setCookieHeader: name and value only", () => {
  assert.strictEqual(setCookieHeader({ name: "sid", value: "abc" }), "sid=abc");
});

test("setCookieHeader: every part, in this order", () => {
  assert.strictEqual(
    setCookieHeader({ name: "sid", value: "abc", maxAge: 3600, domain: "example.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" }),
    "sid=abc; Max-Age=3600; Domain=example.com; Path=/; Secure; HttpOnly; SameSite=Lax");
});

test("setCookieHeader: the order does not depend on the order of the options", () => {
  assert.strictEqual(
    setCookieHeader({ sameSite: "Strict", httpOnly: true, path: "/app", name: "a", value: "1" }),
    "a=1; Path=/app; HttpOnly; SameSite=Strict");
});

test("setCookieHeader: false flags and a max age of 0 are handled", () => {
  assert.strictEqual(setCookieHeader({ name: "a", value: "1", secure: false, httpOnly: false }), "a=1");
  assert.strictEqual(setCookieHeader({ name: "a", value: "", maxAge: 0 }), "a=; Max-Age=0");
});

test("setCookieHeader: SameSite=None needs Secure", () => {
  assert.throws(() => setCookieHeader({ name: "a", value: "1", sameSite: "None" }), /^Error: SameSite=None needs Secure$/);
  assert.strictEqual(setCookieHeader({ name: "a", value: "1", sameSite: "None", secure: true }), "a=1; Secure; SameSite=None");
});

test("setCookieHeader: a wrong SameSite word throws", () => {
  assert.throws(() => setCookieHeader({ name: "a", value: "1", sameSite: "lax" }), /^Error: sameSite must be Strict, Lax or None$/);
  assert.throws(() => setCookieHeader({ name: "a", value: "1", sameSite: "Always" }), /sameSite must be Strict, Lax or None/);
});

test("setCookieHeader: __Secure- needs Secure", () => {
  assert.throws(() => setCookieHeader({ name: "__Secure-sid", value: "1" }), /^Error: __Secure- needs Secure$/);
  assert.strictEqual(setCookieHeader({ name: "__Secure-sid", value: "1", secure: true, domain: "example.com" }), "__Secure-sid=1; Domain=example.com; Secure");
});

test("setCookieHeader: __Host- needs Secure, no Domain and Path=/", () => {
  assert.throws(() => setCookieHeader({ name: "__Host-sid", value: "1", path: "/" }), /^Error: __Host- needs Secure$/);
  assert.throws(() => setCookieHeader({ name: "__Host-sid", value: "1", secure: true, path: "/", domain: "example.com" }), /^Error: __Host- must not have Domain$/);
  assert.throws(() => setCookieHeader({ name: "__Host-sid", value: "1", secure: true }), /^Error: __Host- needs Path=\/$/);
  assert.throws(() => setCookieHeader({ name: "__Host-sid", value: "1", secure: true, path: "/app" }), /^Error: __Host- needs Path=\/$/);
  assert.strictEqual(setCookieHeader({ name: "__Host-sid", value: "1", secure: true, path: "/", httpOnly: true, sameSite: "Strict" }), "__Host-sid=1; Path=/; Secure; HttpOnly; SameSite=Strict");
});

test("setCookieHeader: the SameSite problem is reported first", () => {
  assert.throws(() => setCookieHeader({ name: "__Host-a", value: "1", sameSite: "None" }), /SameSite=None needs Secure/);
  assert.throws(() => setCookieHeader({ name: "__Host-a", value: "1", sameSite: "x" }), /sameSite must be/);
});

test("setCookieHeader: a plain name that only contains the prefix text is not special", () => {
  assert.strictEqual(setCookieHeader({ name: "my__Host-x", value: "1" }), "my__Host-x=1");
});

// ---------- cookieSent ----------

const shopCookie = { host: "shop.example.com" };

test("cookieSent: a host cookie goes back to the same host", () => {
  assert.deepStrictEqual(cookieSent(shopCookie, { url: "https://shop.example.com/cart", pageUrl: "https://shop.example.com/", method: "GET" }), { sent: true, reason: "same site" });
});

test("cookieSent: a host cookie does not go to a subdomain or the parent", () => {
  const base = { pageUrl: "https://shop.example.com/", method: "GET" };
  assert.deepStrictEqual(cookieSent(shopCookie, { ...base, url: "https://api.shop.example.com/x" }), { sent: false, reason: "host does not match" });
  assert.deepStrictEqual(cookieSent(shopCookie, { ...base, url: "https://example.com/x" }), { sent: false, reason: "host does not match" });
});

test("cookieSent: a Domain cookie goes to the domain and its subdomains", () => {
  const c = { host: "shop.example.com", domain: "example.com" };
  const base = { pageUrl: "https://www.example.com/", method: "GET" };
  assert.strictEqual(cookieSent(c, { ...base, url: "https://example.com/x" }).sent, true);
  assert.strictEqual(cookieSent(c, { ...base, url: "https://api.example.com/x" }).sent, true);
  assert.strictEqual(cookieSent(c, { ...base, url: "https://a.b.example.com/x" }).sent, true);
  assert.strictEqual(cookieSent(c, { ...base, url: "https://example.org/x" }).reason, "host does not match");
  assert.strictEqual(cookieSent(c, { ...base, url: "https://badexample.com/x" }).reason, "host does not match");
});

test("cookieSent: a leading dot in Domain does not matter", () => {
  assert.strictEqual(cookieSent({ host: "a.example.com", domain: ".example.com" }, { url: "https://b.example.com/", pageUrl: "https://b.example.com/", method: "GET" }).sent, true);
});

test("cookieSent: a path cookie matches that path and below", () => {
  const c = { host: "a.com", path: "/admin" };
  const base = { pageUrl: "https://a.com/", method: "GET" };
  assert.strictEqual(cookieSent(c, { ...base, url: "https://a.com/admin" }).sent, true);
  assert.strictEqual(cookieSent(c, { ...base, url: "https://a.com/admin/users" }).sent, true);
  assert.deepStrictEqual(cookieSent(c, { ...base, url: "https://a.com/shop" }), { sent: false, reason: "path does not match" });
  assert.deepStrictEqual(cookieSent(c, { ...base, url: "https://a.com/administrator" }), { sent: false, reason: "path does not match" });
  assert.strictEqual(cookieSent(c, { ...base, url: "https://a.com/" }).sent, false);
});

test("cookieSent: no path means every path", () => {
  assert.strictEqual(cookieSent({ host: "a.com" }, { url: "https://a.com/x/y/z", pageUrl: "https://a.com/", method: "GET" }).sent, true);
  assert.strictEqual(cookieSent({ host: "a.com", path: "/" }, { url: "https://a.com/x", pageUrl: "https://a.com/", method: "GET" }).sent, true);
});

test("cookieSent: a Secure cookie is not sent over http", () => {
  const c = { host: "a.com", secure: true };
  assert.deepStrictEqual(cookieSent(c, { url: "http://a.com/", pageUrl: "http://a.com/", method: "GET" }), { sent: false, reason: "Secure cookie needs https" });
  assert.strictEqual(cookieSent(c, { url: "https://a.com/", pageUrl: "https://a.com/", method: "GET" }).sent, true);
});

test("cookieSent: the host problem is reported before the path problem", () => {
  const c = { host: "a.com", path: "/x" };
  assert.strictEqual(cookieSent(c, { url: "https://b.com/y", pageUrl: "https://b.com/", method: "GET" }).reason, "host does not match");
});

test("cookieSent: same site but another port still sends a Strict cookie", () => {
  const c = { host: "localhost", sameSite: "Strict" };
  assert.deepStrictEqual(cookieSent(c, { url: "http://localhost:4000/me", pageUrl: "http://localhost:3000/", method: "GET" }), { sent: true, reason: "same site" });
});

test("cookieSent: another site, a fetch call", () => {
  const base = { url: "https://bank.com/me", pageUrl: "https://evil.com/", method: "GET" };
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "None", secure: true }, base), { sent: true, reason: "SameSite=None" });
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "Lax" }, base), { sent: false, reason: "blocked by SameSite=Lax" });
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "Strict" }, base), { sent: false, reason: "blocked by SameSite=Strict" });
});

test("cookieSent: no SameSite means Lax", () => {
  assert.deepStrictEqual(cookieSent({ host: "bank.com" }, { url: "https://bank.com/me", pageUrl: "https://evil.com/", method: "GET" }), { sent: false, reason: "blocked by SameSite=Lax" });
});

test("cookieSent: another site, the user clicks a link (a top level GET)", () => {
  const base = { url: "https://bank.com/me", pageUrl: "https://evil.com/", method: "GET", navigation: true };
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "Lax" }, base), { sent: true, reason: "Lax allows a top level GET" });
  assert.deepStrictEqual(cookieSent({ host: "bank.com" }, base), { sent: true, reason: "Lax allows a top level GET" });
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "Strict" }, base), { sent: false, reason: "blocked by SameSite=Strict" });
});

test("cookieSent: another site, a form POST is blocked for Lax even as a navigation", () => {
  const base = { url: "https://bank.com/transfer", pageUrl: "https://evil.com/", method: "POST", navigation: true };
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "Lax" }, base), { sent: false, reason: "blocked by SameSite=Lax" });
  assert.deepStrictEqual(cookieSent({ host: "bank.com", sameSite: "None", secure: true }, base).sent, true);
});

test("cookieSent: a navigation GET in lower case still counts as GET", () => {
  assert.strictEqual(cookieSent({ host: "bank.com" }, { url: "https://bank.com/", pageUrl: "https://evil.com/", method: "get", navigation: true }).sent, true);
});

test("cookieSent: a missing method means GET", () => {
  assert.strictEqual(cookieSent({ host: "bank.com" }, { url: "https://bank.com/", pageUrl: "https://evil.com/", navigation: true }).sent, true);
});

test("cookieSent: Secure is checked before SameSite", () => {
  assert.strictEqual(cookieSent({ host: "a.com", secure: true, sameSite: "None" }, { url: "http://a.com/", pageUrl: "http://b.com/", method: "GET" }).reason, "Secure cookie needs https");
});

test("cookieSent: http page to https url is another site (different scheme)", () => {
  assert.deepStrictEqual(cookieSent({ host: "a.com", sameSite: "Strict" }, { url: "https://a.com/", pageUrl: "http://a.com/", method: "GET" }), { sent: false, reason: "blocked by SameSite=Strict" });
});

test("cookieSent: does not change its inputs", () => {
  const c = { host: "bank.com", sameSite: "Lax", path: "/" };
  const r = { url: "https://bank.com/me", pageUrl: "https://evil.com/", method: "GET" };
  const before = copy([c, r]);
  cookieSent(c, r);
  assert.deepStrictEqual(copy([c, r]), before);
});
