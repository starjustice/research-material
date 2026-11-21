const test = require("node:test");
const assert = require("node:assert");
const {
  layerOf, tcpipLayerFor, encapsulate, decapsulate, routerForward, wireBytes, routeKey, canSeePath,
} = require("./01-the-layers-osi-and-tcp-ip");

const copy = (value) => JSON.parse(JSON.stringify(value));

const addr = {
  srcMac: "aa:aa:aa:aa:aa:01", dstMac: "bb:bb:bb:bb:bb:02",
  srcIp: "192.168.1.20", dstIp: "93.184.216.34",
  srcPort: 51145, dstPort: 443,
};
const server = { mac: "bb:bb:bb:bb:bb:02", ip: "93.184.216.34", port: 443 };

// ---------- layerOf ----------

test("layerOf: HTTP and DNS are application, OSI 7", () => {
  assert.deepStrictEqual(layerOf("http"), { tcpip: "application", osi: 7 });
  assert.deepStrictEqual(layerOf("dns"), { tcpip: "application", osi: 7 });
  assert.deepStrictEqual(layerOf("ssh"), { tcpip: "application", osi: 7 });
  assert.deepStrictEqual(layerOf("smtp"), { tcpip: "application", osi: 7 });
});

test("layerOf: TLS is in the application group, and OSI 6 in this lesson", () => {
  assert.deepStrictEqual(layerOf("tls"), { tcpip: "application", osi: 6 });
});

test("layerOf: TCP, UDP and QUIC are transport, OSI 4", () => {
  for (const p of ["tcp", "udp", "quic"]) assert.deepStrictEqual(layerOf(p), { tcpip: "transport", osi: 4 });
});

test("layerOf: IP and ICMP are internet, OSI 3", () => {
  assert.deepStrictEqual(layerOf("ip"), { tcpip: "internet", osi: 3 });
  assert.deepStrictEqual(layerOf("icmp"), { tcpip: "internet", osi: 3 });
});

test("layerOf: Ethernet and Wi-Fi are link, OSI 2", () => {
  assert.deepStrictEqual(layerOf("ethernet"), { tcpip: "link", osi: 2 });
  assert.deepStrictEqual(layerOf("wifi"), { tcpip: "link", osi: 2 });
});

test("layerOf: letter case does not matter", () => {
  assert.deepStrictEqual(layerOf("HTTP"), { tcpip: "application", osi: 7 });
  assert.deepStrictEqual(layerOf("Tcp"), { tcpip: "transport", osi: 4 });
  assert.deepStrictEqual(layerOf("EtherNet"), { tcpip: "link", osi: 2 });
});

test("layerOf: an unknown protocol throws", () => {
  assert.throws(() => layerOf("carrier-pigeon"), Error);
  assert.throws(() => layerOf(""), Error);
  assert.throws(() => layerOf("constructor"), Error);
});

test("layerOf: changing the answer does not change the next answer", () => {
  const first = layerOf("http");
  first.osi = 1;
  assert.strictEqual(layerOf("http").osi, 7);
});

// ---------- tcpipLayerFor ----------

test("tcpipLayerFor: 7, 6 and 5 are application", () => {
  for (const n of [7, 6, 5]) assert.strictEqual(tcpipLayerFor(n), "application");
});

test("tcpipLayerFor: 4 is transport and 3 is internet", () => {
  assert.strictEqual(tcpipLayerFor(4), "transport");
  assert.strictEqual(tcpipLayerFor(3), "internet");
});

test("tcpipLayerFor: 2 and 1 are link", () => {
  assert.strictEqual(tcpipLayerFor(2), "link");
  assert.strictEqual(tcpipLayerFor(1), "link");
});

test("tcpipLayerFor: bad numbers throw", () => {
  for (const bad of [0, 8, -1, 3.5, "4", null, undefined, NaN]) assert.throws(() => tcpipLayerFor(bad), Error);
});

test("tcpipLayerFor: agrees with layerOf for every protocol", () => {
  for (const p of ["http", "dns", "tls", "tcp", "udp", "quic", "ip", "icmp", "ethernet", "wifi"]) {
    const { tcpip, osi } = layerOf(p);
    assert.strictEqual(tcpipLayerFor(osi), tcpip, p);
  }
});

// ---------- encapsulate ----------

test("encapsulate: the outer box is the link layer with MAC addresses", () => {
  const f = encapsulate("GET /", addr);
  assert.strictEqual(f.layer, "link");
  assert.deepStrictEqual(f.header, { src: addr.srcMac, dst: addr.dstMac });
});

test("encapsulate: next comes the internet layer with IP addresses and ttl 64", () => {
  const p = encapsulate("GET /", addr).payload;
  assert.strictEqual(p.layer, "internet");
  assert.deepStrictEqual(p.header, { src: addr.srcIp, dst: addr.dstIp, ttl: 64 });
});

test("encapsulate: then the transport layer with ports, and the message in the middle", () => {
  const s = encapsulate("GET /", addr).payload.payload;
  assert.strictEqual(s.layer, "transport");
  assert.deepStrictEqual(s.header, { src: 51145, dst: 443 });
  assert.strictEqual(s.payload, "GET /");
});

test("encapsulate: the message is kept as it is", () => {
  const msg = "GET /api?x=1 HTTP/1.1\r\nHost: shop.test\r\n\r\n";
  assert.strictEqual(encapsulate(msg, addr).payload.payload.payload, msg);
});

test("encapsulate: does not change the addresses it is given", () => {
  const a = copy(addr);
  assert.ok(encapsulate("x", a));
  assert.deepStrictEqual(a, addr);
});

test("encapsulate: the whole frame has exactly this shape", () => {
  assert.deepStrictEqual(encapsulate("hi", addr), {
    layer: "link",
    header: { src: addr.srcMac, dst: addr.dstMac },
    payload: {
      layer: "internet",
      header: { src: addr.srcIp, dst: addr.dstIp, ttl: 64 },
      payload: { layer: "transport", header: { src: 51145, dst: 443 }, payload: "hi" },
    },
  });
});

// ---------- decapsulate ----------

test("decapsulate: all three addresses match, the message comes out", () => {
  assert.deepStrictEqual(decapsulate(encapsulate("GET /", addr), server), { ok: true, message: "GET /" });
});

test("decapsulate: a wrong MAC address stops at the link layer", () => {
  const r = decapsulate(encapsulate("GET /", addr), { ...server, mac: "bb:bb:bb:bb:bb:99" });
  assert.deepStrictEqual(r, { ok: false, droppedAt: "link", reason: "not my MAC address" });
});

test("decapsulate: a wrong IP address stops at the internet layer", () => {
  const r = decapsulate(encapsulate("GET /", addr), { ...server, ip: "10.0.0.9" });
  assert.deepStrictEqual(r, { ok: false, droppedAt: "internet", reason: "not my IP address" });
});

test("decapsulate: a wrong port stops at the transport layer", () => {
  const r = decapsulate(encapsulate("GET /", addr), { ...server, port: 80 });
  assert.deepStrictEqual(r, { ok: false, droppedAt: "transport", reason: "nothing listens on that port" });
});

test("decapsulate: the outside layer is checked first", () => {
  const r = decapsulate(encapsulate("GET /", addr), { mac: "x", ip: "y", port: 1 });
  assert.strictEqual(r.droppedAt, "link");
  const r2 = decapsulate(encapsulate("GET /", addr), { mac: server.mac, ip: "y", port: 1 });
  assert.strictEqual(r2.droppedAt, "internet");
});

test("decapsulate: the source addresses are not checked", () => {
  const frame = encapsulate("hello", { ...addr, srcPort: 1, srcIp: "1.2.3.4", srcMac: "zz" });
  assert.strictEqual(decapsulate(frame, server).ok, true);
});

test("decapsulate: does not change the frame", () => {
  const f = encapsulate("GET /", addr);
  const before = copy(f);
  decapsulate(f, server);
  decapsulate(f, { ...server, port: 1 });
  assert.deepStrictEqual(f, before);
});

// ---------- routerForward ----------

const routerMac = "cc:cc:cc:cc:cc:03";
const nextMac = "dd:dd:dd:dd:dd:04";

test("routerForward: the link header is new, src is the router and dst is the next stop", () => {
  const r = routerForward(encapsulate("GET /", addr), routerMac, nextMac);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.frame.header, { src: routerMac, dst: nextMac });
});

test("routerForward: the IP addresses stay the same and ttl goes down by 1", () => {
  const r = routerForward(encapsulate("GET /", addr), routerMac, nextMac);
  assert.deepStrictEqual(r.frame.payload.header, { src: addr.srcIp, dst: addr.dstIp, ttl: 63 });
});

test("routerForward: ports and message stay the same", () => {
  const r = routerForward(encapsulate("GET /", addr), routerMac, nextMac);
  assert.deepStrictEqual(r.frame.payload.payload, encapsulate("GET /", addr).payload.payload);
});

test("routerForward: the layers keep their names", () => {
  const f = routerForward(encapsulate("x", addr), routerMac, nextMac).frame;
  assert.strictEqual(f.layer, "link");
  assert.strictEqual(f.payload.layer, "internet");
  assert.strictEqual(f.payload.payload.layer, "transport");
});

test("routerForward: ttl 1 is dropped, because it would reach 0", () => {
  const f = encapsulate("x", addr);
  f.payload.header.ttl = 1;
  assert.deepStrictEqual(routerForward(f, routerMac, nextMac), { ok: false, reason: "ttl expired" });
});

test("routerForward: ttl 2 still goes on, with ttl 1", () => {
  const f = encapsulate("x", addr);
  f.payload.header.ttl = 2;
  const r = routerForward(f, routerMac, nextMac);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.frame.payload.header.ttl, 1);
});

test("routerForward: ttl 0 is dropped too", () => {
  const f = encapsulate("x", addr);
  f.payload.header.ttl = 0;
  assert.strictEqual(routerForward(f, routerMac, nextMac).ok, false);
});

test("routerForward: does not change the frame it is given", () => {
  const f = encapsulate("GET /", addr);
  const before = copy(f);
  routerForward(f, routerMac, nextMac);
  assert.deepStrictEqual(f, before);
});

test("routerForward: three routers in a row lower ttl by 3, and the last stop can read it", () => {
  let frame = encapsulate("GET /", addr);
  for (const mac of ["r1", "r2", "r3"]) frame = routerForward(frame, mac, "next-" + mac).frame;
  assert.strictEqual(frame.payload.header.ttl, 61);
  frame.header.dst = server.mac;
  assert.deepStrictEqual(decapsulate(frame, server), { ok: true, message: "GET /" });
});

test("routerForward: a packet that was sent to another MAC is not readable until the router rewrites it", () => {
  const f = encapsulate("GET /", { ...addr, dstMac: routerMac });
  assert.strictEqual(decapsulate(f, server).droppedAt, "link");
  const out = routerForward(f, routerMac, server.mac).frame;
  assert.strictEqual(decapsulate(out, server).ok, true);
});

// ---------- wireBytes ----------

test("wireBytes: a small message in one segment adds 54 bytes", () => {
  assert.deepStrictEqual(wireBytes(100), { segments: 1, totalBytes: 154 });
});

test("wireBytes: 1460 bytes still fits in one segment", () => {
  assert.deepStrictEqual(wireBytes(1460), { segments: 1, totalBytes: 1514 });
});

test("wireBytes: 1461 bytes needs two segments", () => {
  assert.deepStrictEqual(wireBytes(1461), { segments: 2, totalBytes: 1461 + 108 });
});

test("wireBytes: 4000 bytes needs three segments", () => {
  assert.deepStrictEqual(wireBytes(4000), { segments: 3, totalBytes: 4162 });
});

test("wireBytes: 0 bytes is still one segment with headers", () => {
  assert.deepStrictEqual(wireBytes(0), { segments: 1, totalBytes: 54 });
});

test("wireBytes: exact multiples do not add an extra segment", () => {
  assert.deepStrictEqual(wireBytes(2920), { segments: 2, totalBytes: 2920 + 108 });
});

test("wireBytes: bad input throws", () => {
  for (const bad of [-1, 1.5, "100", null, undefined, NaN]) assert.throws(() => wireBytes(bad), Error);
});

// ---------- routeKey ----------

const req = { srcIp: "203.0.113.7", srcPort: 52000, dstIp: "198.51.100.10", dstPort: 443, host: "shop.test", path: "/api/cart" };

test("routeKey: a layer 4 balancer reads addresses and ports only", () => {
  assert.strictEqual(routeKey("l4-load-balancer", req), "203.0.113.7:52000->198.51.100.10:443");
});

test("routeKey: a layer 7 balancer reads the host and path", () => {
  assert.strictEqual(routeKey("l7-load-balancer", req), "shop.test/api/cart");
});

test("routeKey: layer 4 gives the same key for two paths on one connection", () => {
  const key = routeKey("l4-load-balancer", req);
  assert.strictEqual(typeof key, "string");
  assert.strictEqual(key, routeKey("l4-load-balancer", { ...req, path: "/images/a.png" }));
});

test("routeKey: layer 7 gives different keys for different paths", () => {
  assert.notStrictEqual(routeKey("l7-load-balancer", req), routeKey("l7-load-balancer", { ...req, path: "/images/a.png" }));
});

test("routeKey: layer 4 gives different keys for different source ports", () => {
  assert.notStrictEqual(routeKey("l4-load-balancer", req), routeKey("l4-load-balancer", { ...req, srcPort: 52001 }));
});

test("routeKey: layer 7 ignores ports and source address", () => {
  const key = routeKey("l7-load-balancer", req);
  assert.strictEqual(typeof key, "string");
  assert.strictEqual(key, routeKey("l7-load-balancer", { ...req, srcPort: 1, srcIp: "1.1.1.1" }));
});

test("routeKey: another device throws", () => {
  assert.throws(() => routeKey("router", req), Error);
  assert.throws(() => routeKey(undefined, req), Error);
});

// ---------- canSeePath ----------

test("canSeePath: a layer 7 balancer that ends the HTTPS can read the path", () => {
  assert.strictEqual(canSeePath("l7-load-balancer", { tlsEndsHere: true }), true);
});

test("canSeePath: a layer 7 balancer that passes the encrypted bytes on cannot", () => {
  assert.strictEqual(canSeePath("l7-load-balancer", { tlsEndsHere: false }), false);
});

test("canSeePath: a layer 4 balancer, a router and a switch never can", () => {
  for (const d of ["l4-load-balancer", "router", "switch"]) {
    assert.strictEqual(canSeePath(d, { tlsEndsHere: true }), false, d);
    assert.strictEqual(canSeePath(d, { tlsEndsHere: false }), false, d);
  }
});
