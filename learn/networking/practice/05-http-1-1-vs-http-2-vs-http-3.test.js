const test = require("node:test");
const assert = require("node:assert");
const {
  h1Schedule, h1LoadTime, h2LoadTime, deliveryTimes, pickProtocol, parseAltSvc,
  nextVisitProtocol, setupRoundTrips, survivesNetworkChange, methodProps, statusClass, cacheState,
} = require("./05-http-1-1-vs-http-2-vs-http-3");

const copy = (value) => JSON.parse(JSON.stringify(value));
const eighteen = Array(18).fill(100); // 18 files, 100 ms each

// ---------- h1Schedule ----------

test("h1Schedule: one connection handles one request at a time", () => {
  assert.deepStrictEqual(h1Schedule([100, 50, 20], { connections: 1 }), [
    { conn: 0, start: 0, end: 100 },
    { conn: 0, start: 100, end: 150 },
    { conn: 0, start: 150, end: 170 },
  ]);
});

test("h1Schedule: the next waiting request takes the connection that is free first", () => {
  assert.deepStrictEqual(h1Schedule([100, 30, 10], { connections: 2 }), [
    { conn: 0, start: 0, end: 100 },
    { conn: 1, start: 0, end: 30 },
    { conn: 1, start: 30, end: 40 },
  ]);
});

test("h1Schedule: with a tie, the lowest connection number is used", () => {
  const s = h1Schedule([10, 10, 10, 10], { connections: 2 });
  assert.deepStrictEqual(s.map((r) => r.conn), [0, 1, 0, 1]);
});

test("h1Schedule: six connections is the default", () => {
  const s = h1Schedule(eighteen);
  assert.strictEqual(new Set(s.map((r) => r.conn)).size, 6);
  assert.strictEqual(s[6].start, 100);
  assert.strictEqual(s[17].end, 300);
});

test("h1Schedule: a connection that is not needed is never opened", () => {
  const s = h1Schedule([10, 10], { connections: 6, connectMs: 40 });
  assert.deepStrictEqual(s, [
    { conn: 0, start: 40, end: 50 },
    { conn: 1, start: 40, end: 50 },
  ]);
});

test("h1Schedule: keep-alive pays the connect cost once per connection", () => {
  const s = h1Schedule([10, 10, 10], { connections: 1, connectMs: 40 });
  assert.deepStrictEqual(s.map((r) => [r.start, r.end]), [[40, 50], [50, 60], [60, 70]]);
});

test("h1Schedule: without keep-alive every request pays the connect cost", () => {
  const s = h1Schedule([10, 10, 10], { connections: 1, connectMs: 40, keepAlive: false });
  assert.deepStrictEqual(s.map((r) => [r.start, r.end]), [[40, 50], [90, 100], [140, 150]]);
});

test("h1Schedule: connections must be a whole number of 1 or more", () => {
  assert.throws(() => h1Schedule([10], { connections: 0 }));
  assert.throws(() => h1Schedule([10], { connections: 2.5 }));
});

test("h1Schedule: an empty list gives an empty schedule", () => {
  assert.deepStrictEqual(h1Schedule([]), []);
});

test("h1Schedule: does not change the list it is given", () => {
  const d = [30, 20, 10];
  const before = copy(d);
  h1Schedule(d, { connections: 2 });
  assert.deepStrictEqual(d, before);
});

// ---------- h1LoadTime ----------

test("h1LoadTime: 18 files on 1 connection wait in one line", () => {
  assert.strictEqual(h1LoadTime(eighteen, { connections: 1 }), 1800);
});

test("h1LoadTime: 18 files on 6 connections need 3 rounds", () => {
  assert.strictEqual(h1LoadTime(eighteen), 300);
});

test("h1LoadTime: the whole page waits for the slowest line", () => {
  assert.strictEqual(h1LoadTime([500, 10, 10, 10], { connections: 2 }), 500);
  assert.strictEqual(h1LoadTime([10, 10, 10, 10, 500], { connections: 2 }), 520);
});

test("h1LoadTime: connect cost, with and without keep-alive", () => {
  assert.strictEqual(h1LoadTime(eighteen, { connectMs: 50 }), 350);
  assert.strictEqual(h1LoadTime(eighteen, { connectMs: 50, keepAlive: false }), 450);
});

test("h1LoadTime: no requests take no time", () => {
  assert.strictEqual(h1LoadTime([]), 0);
});

// ---------- h2LoadTime ----------

test("h2LoadTime: all requests run at the same time on one connection", () => {
  assert.strictEqual(h2LoadTime(eighteen), 100);
  assert.strictEqual(h2LoadTime([500, 10, 10, 10]), 500);
});

test("h2LoadTime: one connect cost, paid once", () => {
  assert.strictEqual(h2LoadTime(eighteen, { connectMs: 50 }), 150);
});

test("h2LoadTime: more requests than maxStreams wait for a free stream (default 100)", () => {
  assert.strictEqual(h2LoadTime(Array(150).fill(10)), 20);
  assert.strictEqual(h2LoadTime(Array(100).fill(10)), 10);
  assert.strictEqual(h2LoadTime(Array(150).fill(10), { maxStreams: 10 }), 150);
});

test("h2LoadTime: no requests take no time, even with a connect cost", () => {
  assert.strictEqual(h2LoadTime([], { connectMs: 50 }), 0);
});

test("h2LoadTime: beats HTTP/1.1 with 6 connections on many small files", () => {
  assert.ok(h2LoadTime(eighteen) < h1LoadTime(eighteen));
});

// ---------- deliveryTimes ----------

test("deliveryTimes: without loss, chunks are sent one by one in turns", () => {
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h2"), [8, 2, 3]);
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h3"), [8, 2, 3]);
});

test("deliveryTimes: three equal streams finish one tick apart", () => {
  assert.deepStrictEqual(deliveryTimes([4, 4, 4], "h3"), [10, 11, 12]);
});

test("deliveryTimes: over TCP (h2) one lost chunk holds back every stream", () => {
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h2", { stream: 0, chunk: 0 }), [9, 9, 9]);
});

test("deliveryTimes: over QUIC (h3) only the stream with the lost chunk waits", () => {
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h3", { stream: 0, chunk: 0 }), [9, 2, 3]);
});

test("deliveryTimes: the retransmit delay can be changed", () => {
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h2", { stream: 0, chunk: 0 }, 3), [8, 4, 4]);
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h3", { stream: 0, chunk: 0 }, 20), [21, 2, 3]);
});

test("deliveryTimes: a lost chunk later in the data only holds back what comes after it", () => {
  // slots: s0c0 s1c0 s2c0 s0c1 ... ; s2c0 is slot 3 and arrives at tick 11
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h2", { stream: 2, chunk: 0 }), [11, 2, 11]);
  assert.deepStrictEqual(deliveryTimes([6, 1, 1], "h3", { stream: 2, chunk: 0 }), [8, 2, 11]);
});

test("deliveryTimes: a loss that is repaired before the data ends costs a stream nothing in h3", () => {
  assert.strictEqual(deliveryTimes([2, 8], "h3", { stream: 0, chunk: 0 })[1], 10);
});

test("deliveryTimes: a stream with no chunks finishes at 0", () => {
  assert.deepStrictEqual(deliveryTimes([0, 2], "h3"), [0, 2]);
});

test("deliveryTimes: HTTP/1.1 is not part of this model", () => {
  assert.throws(() => deliveryTimes([1, 1], "h1"));
  assert.throws(() => deliveryTimes([1, 1], "quic"));
});

test("deliveryTimes: does not change its inputs", () => {
  const counts = [6, 1, 1];
  const lost = { stream: 0, chunk: 0 };
  deliveryTimes(counts, "h2", lost);
  assert.deepStrictEqual(counts, [6, 1, 1]);
  assert.deepStrictEqual(lost, { stream: 0, chunk: 0 });
});

// ---------- pickProtocol ----------

test("pickProtocol: the server's order wins among what the client offers", () => {
  assert.strictEqual(pickProtocol(["h2", "http/1.1"], ["h2", "http/1.1"]), "h2");
  assert.strictEqual(pickProtocol(["http/1.1", "h2"], ["h2", "http/1.1"]), "h2");
  assert.strictEqual(pickProtocol(["h2", "http/1.1"], ["http/1.1", "h2"]), "http/1.1");
});

test("pickProtocol: only what both sides know can be picked", () => {
  assert.strictEqual(pickProtocol(["http/1.1"], ["h2", "http/1.1"]), "http/1.1");
  assert.strictEqual(pickProtocol(["h2", "http/1.1"], ["http/1.1"]), "http/1.1");
});

test("pickProtocol: no answer in common means HTTP/1.1", () => {
  assert.strictEqual(pickProtocol([], ["h2"]), "http/1.1");
  assert.strictEqual(pickProtocol(["h2"], []), "http/1.1");
});

// ---------- parseAltSvc ----------

test("parseAltSvc: the header a real server sends", () => {
  assert.deepStrictEqual(parseAltSvc('h3=":443"; ma=86400'), [{ protocol: "h3", host: "", port: 443, maxAge: 86400 }]);
});

test("parseAltSvc: no ma means 24 hours (86400 seconds)", () => {
  assert.deepStrictEqual(parseAltSvc('h3=":443"'), [{ protocol: "h3", host: "", port: 443, maxAge: 86400 }]);
});

test("parseAltSvc: a host name and a different port", () => {
  assert.deepStrictEqual(parseAltSvc('h2="alt.example.com:8000"; ma=60'), [{ protocol: "h2", host: "alt.example.com", port: 8000, maxAge: 60 }]);
});

test("parseAltSvc: several choices, in the order given", () => {
  const list = parseAltSvc('h3=":443"; ma=3600, h2=":443"; ma=7200');
  assert.deepStrictEqual(list.map((e) => [e.protocol, e.port, e.maxAge]), [["h3", 443, 3600], ["h2", 443, 7200]]);
});

test("parseAltSvc: clear, empty and missing mean no alternatives", () => {
  assert.deepStrictEqual(parseAltSvc("clear"), []);
  assert.deepStrictEqual(parseAltSvc(""), []);
  assert.deepStrictEqual(parseAltSvc(undefined), []);
});

// ---------- nextVisitProtocol ----------

test("nextVisitProtocol: Alt-Svc with h3 moves the next visit to HTTP/3", () => {
  assert.strictEqual(nextVisitProtocol("h2", 'h3=":443"; ma=86400', false), "h3");
});

test("nextVisitProtocol: if UDP is blocked the visit stays on the first protocol", () => {
  assert.strictEqual(nextVisitProtocol("h2", 'h3=":443"; ma=86400', true), "h2");
});

test("nextVisitProtocol: no h3 in the header means no change", () => {
  assert.strictEqual(nextVisitProtocol("h2", 'h2=":443"', false), "h2");
  assert.strictEqual(nextVisitProtocol("http/1.1", undefined, false), "http/1.1");
  assert.strictEqual(nextVisitProtocol("h2", "clear", false), "h2");
});

test("nextVisitProtocol: ma=0 withdraws the offer", () => {
  assert.strictEqual(nextVisitProtocol("h2", 'h3=":443"; ma=0', false), "h2");
});

// ---------- setupRoundTrips ----------

test("setupRoundTrips: HTTP/1.1 and HTTP/2 with TLS 1.3 need 2 round trips", () => {
  assert.strictEqual(setupRoundTrips("h1"), 2);
  assert.strictEqual(setupRoundTrips("h2", { tls: "1.3" }), 2);
});

test("setupRoundTrips: TLS 1.2 needs 3, and a resumed TLS 1.2 session needs 2", () => {
  assert.strictEqual(setupRoundTrips("h2", { tls: "1.2" }), 3);
  assert.strictEqual(setupRoundTrips("h2", { tls: "1.2", resumed: true }), 2);
});

test("setupRoundTrips: HTTP/3 needs 1, because QUIC joins the two handshakes", () => {
  assert.strictEqual(setupRoundTrips("h3"), 1);
});

test("setupRoundTrips: 0-RTT needs a resumed session", () => {
  assert.strictEqual(setupRoundTrips("h3", { zeroRtt: true }), 1);
  assert.strictEqual(setupRoundTrips("h3", { resumed: true, zeroRtt: true }), 0);
  assert.strictEqual(setupRoundTrips("h3", { resumed: true }), 1);
});

test("setupRoundTrips: over TCP, 0-RTT saves only the TLS part, the TCP trip stays", () => {
  assert.strictEqual(setupRoundTrips("h2", { resumed: true, zeroRtt: true }), 1);
  assert.strictEqual(setupRoundTrips("h2", { resumed: true }), 2);
});

test("setupRoundTrips: unknown protocol or TLS version is an error", () => {
  assert.throws(() => setupRoundTrips("spdy"));
  assert.throws(() => setupRoundTrips("h2", { tls: "1.1" }));
});

// ---------- survivesNetworkChange ----------

const wifi = { srcIp: "192.168.1.20", srcPort: 50000, dstIp: "203.0.113.5", dstPort: 443, connectionId: "c0ffee" };
const mobile = { srcIp: "100.64.7.9", srcPort: 41000, dstIp: "203.0.113.5", dstPort: 443, connectionId: "c0ffee" };

test("survivesNetworkChange: a TCP connection is named by the 4 address numbers, so a new address ends it", () => {
  assert.strictEqual(survivesNetworkChange("h2", wifi, mobile), false);
  assert.strictEqual(survivesNetworkChange("h1", wifi, mobile), false);
});

test("survivesNetworkChange: a QUIC connection is named by its connection ID, so it lives on", () => {
  assert.strictEqual(survivesNetworkChange("h3", wifi, mobile), true);
});

test("survivesNetworkChange: a different connection ID is a different QUIC connection", () => {
  assert.strictEqual(survivesNetworkChange("h3", wifi, { ...mobile, connectionId: "other" }), false);
});

test("survivesNetworkChange: nothing moved, TCP lives on", () => {
  assert.strictEqual(survivesNetworkChange("h2", wifi, { ...wifi }), true);
});

test("survivesNetworkChange: only the port changed is also a new TCP connection", () => {
  assert.strictEqual(survivesNetworkChange("h2", wifi, { ...wifi, srcPort: 50001 }), false);
});

test("survivesNetworkChange: unknown protocol is an error", () => {
  assert.throws(() => survivesNetworkChange("spdy", wifi, mobile));
});

// ---------- methodProps ----------

test("methodProps: safe methods only read", () => {
  for (const m of ["GET", "HEAD", "OPTIONS"]) assert.deepStrictEqual(methodProps(m), { safe: true, idempotent: true });
});

test("methodProps: PUT and DELETE change things but are safe to repeat", () => {
  for (const m of ["PUT", "DELETE"]) assert.deepStrictEqual(methodProps(m), { safe: false, idempotent: true });
});

test("methodProps: POST and PATCH are not safe to repeat", () => {
  for (const m of ["POST", "PATCH"]) assert.deepStrictEqual(methodProps(m), { safe: false, idempotent: false });
});

test("methodProps: letter case does not matter, unknown methods throw", () => {
  assert.deepStrictEqual(methodProps("get"), { safe: true, idempotent: true });
  assert.throws(() => methodProps("FETCH"));
});

test("methodProps: the answer is a copy, changing it does not change later answers", () => {
  const a = methodProps("GET");
  a.safe = false;
  assert.strictEqual(methodProps("GET").safe, true);
});

// ---------- statusClass ----------

test("statusClass: the first digit tells the family", () => {
  assert.strictEqual(statusClass(103), "informational");
  assert.strictEqual(statusClass(200), "success");
  assert.strictEqual(statusClass(204), "success");
  assert.strictEqual(statusClass(301), "redirect");
  assert.strictEqual(statusClass(304), "redirect");
  assert.strictEqual(statusClass(404), "client error");
  assert.strictEqual(statusClass(429), "client error");
  assert.strictEqual(statusClass(503), "server error");
});

test("statusClass: the edges of each family", () => {
  assert.strictEqual(statusClass(100), "informational");
  assert.strictEqual(statusClass(199), "informational");
  assert.strictEqual(statusClass(299), "success");
  assert.strictEqual(statusClass(399), "redirect");
  assert.strictEqual(statusClass(499), "client error");
  assert.strictEqual(statusClass(599), "server error");
});

test("statusClass: numbers outside 100 to 599 and non-whole numbers throw", () => {
  assert.throws(() => statusClass(99));
  assert.throws(() => statusClass(600));
  assert.throws(() => statusClass(200.5));
  assert.throws(() => statusClass("200"));
});

// ---------- cacheState ----------

test("cacheState: younger than max-age is fresh", () => {
  assert.strictEqual(cacheState("max-age=60", 10), "fresh");
  assert.strictEqual(cacheState("public, max-age=60", 59), "fresh");
});

test("cacheState: as old as max-age or older is stale", () => {
  assert.strictEqual(cacheState("max-age=60", 60), "stale");
  assert.strictEqual(cacheState("max-age=60", 600), "stale");
});

test("cacheState: max-age=0 and no max-age are stale", () => {
  assert.strictEqual(cacheState("max-age=0", 0), "stale");
  assert.strictEqual(cacheState("public", 0), "stale");
  assert.strictEqual(cacheState("", 0), "stale");
  assert.strictEqual(cacheState(undefined, 0), "stale");
});

test("cacheState: no-store beats everything, nothing may be kept", () => {
  assert.strictEqual(cacheState("no-store", 0), "no-store");
  assert.strictEqual(cacheState("no-store, max-age=600", 1), "no-store");
});

test("cacheState: no-cache means ask the server every time, even when young", () => {
  assert.strictEqual(cacheState("no-cache", 0), "revalidate");
  assert.strictEqual(cacheState("no-cache, max-age=600", 1), "revalidate");
});

test("cacheState: letter case and spaces do not matter", () => {
  assert.strictEqual(cacheState("Max-Age=60 ,  Public", 5), "fresh");
  assert.strictEqual(cacheState("No-Store", 5), "no-store");
});

test("cacheState: a long life with immutable is still just fresh", () => {
  assert.strictEqual(cacheState("max-age=31536000, immutable", 1000), "fresh");
});

test("cacheState: no-store wins when no-cache is also there, in any order", () => {
  assert.strictEqual(cacheState("no-cache, no-store", 0), "no-store");
  assert.strictEqual(cacheState("no-store, no-cache", 0), "no-store");
});
