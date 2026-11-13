const test = require("node:test");
const assert = require("node:assert");
const { pickServer, pickLocation, forwardedFor, createProxy } = require("./08-reverse-proxy-and-nginx");

const shop = { name: "shop.example.test", locations: [{ prefix: "/api/", upstream: "api_pool" }, { prefix: "/", static: true }] };
const admin = { name: "admin.example.test", locations: [{ prefix: "/", static: true }] };
const makeConfig = () => ({
  servers: [shop, admin],
  upstreams: { api_pool: ["app1", "app2"], other_pool: ["app3"] },
});
const api = (extra = {}) => ({ host: "shop.example.test", path: "/api/hello", clientIp: "172.18.0.5", ...extra });
const froms = (handle, n, request = api()) => Array.from({ length: n }, () => handle(request).from);

// ---------- pickServer ----------

test("pickServer: the host picks the server with that name", () => {
  assert.strictEqual(pickServer([shop, admin], "admin.example.test"), admin);
  assert.strictEqual(pickServer([shop, admin], "shop.example.test"), shop);
});

test("pickServer: an unknown host gets the first server (the default server)", () => {
  assert.strictEqual(pickServer([shop, admin], "other.test"), shop);
  assert.strictEqual(pickServer([admin, shop], "other.test"), admin);
});

test("pickServer: no servers gives null", () => {
  assert.strictEqual(pickServer([], "shop.example.test"), null);
});

// ---------- pickLocation ----------

test("pickLocation: the longest matching prefix wins, whatever the order", () => {
  assert.strictEqual(pickLocation(shop, "/api/hello").prefix, "/api/");
  const reversed = { name: "x", locations: [...shop.locations].reverse() };
  assert.strictEqual(pickLocation(reversed, "/api/hello").prefix, "/api/");
});

test("pickLocation: / catches everything else", () => {
  assert.strictEqual(pickLocation(shop, "/about").prefix, "/");
  assert.strictEqual(pickLocation(shop, "/").prefix, "/");
});

test("pickLocation: /apis does not start with /api/, so it goes to /", () => {
  assert.strictEqual(pickLocation(shop, "/apis").prefix, "/");
  assert.strictEqual(pickLocation(shop, "/api").prefix, "/");
});

test("pickLocation: the prefix must be at the START of the path, not somewhere inside it", () => {
  assert.strictEqual(pickLocation(shop, "/docs/api/hello").prefix, "/");
});

test("pickLocation: no prefix matches gives null", () => {
  const onlyApi = { name: "x", locations: [{ prefix: "/api/", upstream: "api_pool" }] };
  assert.strictEqual(pickLocation(onlyApi, "/about"), null);
});

test("pickLocation: a longer prefix wins over a shorter one that is listed after it", () => {
  const server = { name: "x", locations: [{ prefix: "/api/v2/", upstream: "b" }, { prefix: "/api/", upstream: "a" }] };
  assert.strictEqual(pickLocation(server, "/api/v2/users").upstream, "b");
  assert.strictEqual(pickLocation(server, "/api/v1/users").upstream, "a");
});

// ---------- forwardedFor ----------

test("forwardedFor: with no earlier value it is just the client ip", () => {
  assert.strictEqual(forwardedFor(undefined, "172.18.0.5"), "172.18.0.5");
});

test("forwardedFor: an earlier value stays, and the client ip is added after it", () => {
  assert.strictEqual(forwardedFor("1.2.3.4", "172.18.0.5"), "1.2.3.4, 172.18.0.5");
  assert.strictEqual(forwardedFor("1.2.3.4, 5.6.7.8", "9.9.9.9"), "1.2.3.4, 5.6.7.8, 9.9.9.9");
});

// ---------- createProxy: routing ----------

test("createProxy: a static location is answered by nginx itself", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  assert.deepStrictEqual(handle({ host: "shop.example.test", path: "/", clientIp: "1.1.1.1" }), { status: 200, from: "static" });
  assert.deepStrictEqual(handle({ host: "admin.example.test", path: "/", clientIp: "1.1.1.1" }), { status: 200, from: "static" });
});

test("createProxy: an unknown host is handled by the first server", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  assert.strictEqual(handle({ host: "other.test", path: "/api/x", clientIp: "1.1.1.1" }).status, 200);
  assert.strictEqual(handle({ host: "other.test", path: "/api/x", clientIp: "1.1.1.1" }).from, "app2");
});

test("createProxy: no location for the path gives 404", () => {
  const config = { servers: [{ name: "x", locations: [{ prefix: "/api/", upstream: "api_pool" }] }], upstreams: { api_pool: ["app1"] } };
  const handle = createProxy(config, { app1: true });
  assert.deepStrictEqual(handle({ host: "x", path: "/about", clientIp: "1.1.1.1" }), { status: 404 });
});

test("createProxy: no servers at all gives 404", () => {
  const handle = createProxy({ servers: [], upstreams: {} }, {});
  assert.deepStrictEqual(handle({ host: "x", path: "/", clientIp: "1.1.1.1" }), { status: 404 });
});

// ---------- createProxy: round robin ----------

test("createProxy: round robin goes app1, app2, app1, app2", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  assert.deepStrictEqual(froms(handle, 5), ["app1", "app2", "app1", "app2", "app1"]);
});

test("createProxy: static requests do not move the round robin counter", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  assert.strictEqual(handle(api()).from, "app1");
  handle({ host: "shop.example.test", path: "/", clientIp: "1.1.1.1" });
  assert.strictEqual(handle(api()).from, "app2");
});

test("createProxy: each pool has its own counter", () => {
  const config = makeConfig();
  config.servers[1].locations.unshift({ prefix: "/other/", upstream: "other_pool" });
  const handle = createProxy(config, { app1: true, app2: true, app3: true });
  assert.strictEqual(handle(api()).from, "app1");
  assert.strictEqual(handle({ host: "admin.example.test", path: "/other/x", clientIp: "1.1.1.1" }).from, "app3");
  assert.strictEqual(handle(api()).from, "app2");
});

// ---------- createProxy: apps that are down ----------

test("createProxy: an app that is down is skipped, and users still get 200", () => {
  const handle = createProxy(makeConfig(), { app1: false, app2: true });
  assert.deepStrictEqual(froms(handle, 4), ["app2", "app2", "app2", "app2"]);
  assert.strictEqual(handle(api()).status, 200);
});

test("createProxy: when the first app is down, the request still goes to the next one in the list", () => {
  const health = { app1: false, app2: true };
  const handle = createProxy(makeConfig(), health);
  assert.strictEqual(handle(api()).from, "app2");
  health.app1 = true;
  assert.deepStrictEqual(froms(handle, 3), ["app1", "app2", "app1"]);
});

test("createProxy: when no app is up the answer is 502", () => {
  const handle = createProxy(makeConfig(), { app1: false, app2: false });
  assert.deepStrictEqual(handle(api()), { status: 502 });
});

test("createProxy: an app with no health entry counts as down", () => {
  const handle = createProxy(makeConfig(), { app1: true });
  assert.deepStrictEqual(froms(handle, 3), ["app1", "app1", "app1"]);
  const none = createProxy(makeConfig(), {});
  assert.strictEqual(none(api()).status, 502);
});

test("createProxy: health is read when the request comes, not when the proxy is made", () => {
  const health = { app1: true, app2: true };
  const handle = createProxy(makeConfig(), health);
  assert.strictEqual(handle(api()).status, 200);
  health.app1 = false;
  health.app2 = false;
  assert.strictEqual(handle(api()).status, 502);
  health.app2 = true;
  assert.strictEqual(handle(api()).from, "app2");
});

test("createProxy: a 502 does not move the counter", () => {
  const health = { app1: false, app2: false };
  const handle = createProxy(makeConfig(), health);
  assert.strictEqual(handle(api()).status, 502);
  health.app1 = true;
  health.app2 = true;
  assert.deepStrictEqual(froms(handle, 3), ["app1", "app2", "app1"]);
});

// ---------- createProxy: headers ----------

test("createProxy: the app gets the host, the client ip and the protocol", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  assert.deepStrictEqual(handle(api()), {
    status: 200,
    from: "app1",
    headers: { host: "shop.example.test", "x-forwarded-for": "172.18.0.5", "x-forwarded-proto": "http" },
  });
});

test("createProxy: a client X-Forwarded-For is kept and the client ip is added after it", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  const answer = handle(api({ headers: { "x-forwarded-for": "1.2.3.4" } }));
  assert.strictEqual(answer.headers["x-forwarded-for"], "1.2.3.4, 172.18.0.5");
});

test("createProxy: it does not change the request object it was given", () => {
  const handle = createProxy(makeConfig(), { app1: true, app2: true });
  const request = api({ headers: { "x-forwarded-for": "1.2.3.4" } });
  handle(request);
  assert.deepStrictEqual(request, api({ headers: { "x-forwarded-for": "1.2.3.4" } }));
});
