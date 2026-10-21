const test = require("node:test");
const assert = require("node:assert");
const { percentile, createRecorder } = require("./14-observability");

// The slow checkout from the lesson: four spans in one trace.
function slowCheckout(rec, traceId = "4bf92f35") {
  rec.span({ traceId, spanId: "a1", parentId: null, service: "api", name: "POST /checkout", start: 0, ms: 3000 });
  rec.span({ traceId, spanId: "a2", parentId: "a1", service: "api", name: "SELECT cart", start: 5, ms: 20 });
  rec.span({ traceId, spanId: "p1", parentId: "a1", service: "payment", name: "POST /charge", start: 30, ms: 2960 });
  rec.span({ traceId, spanId: "p2", parentId: "p1", service: "payment", name: "SELECT payments", start: 40, ms: 2900 });
}

// 100 checkouts from the lesson: 90 at 100 ms, 8 at 400 ms, 2 at 3000 ms.
function hundredCheckouts() {
  return [...Array(90).fill(100), ...Array(8).fill(400), ...Array(2).fill(3000)];
}

// ---- percentile ----

test("percentile uses the nearest rank: p50 of five values is the middle one", () => {
  assert.strictEqual(percentile([5, 1, 3, 2, 4], 50), 3);
});

test("percentile on the lesson's 100 checkouts: p50 is 100, p95 is 400, p99 is 3000", () => {
  const times = hundredCheckouts();
  assert.strictEqual(percentile(times, 50), 100);
  assert.strictEqual(percentile(times, 95), 400);
  assert.strictEqual(percentile(times, 99), 3000);
});

test("percentile rounds the rank up: p99 of 10 values is the biggest one", () => {
  assert.strictEqual(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 99), 10);
  assert.strictEqual(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90), 9);
});

test("percentile of one value is that value, and p100 is the biggest", () => {
  assert.strictEqual(percentile([42], 50), 42);
  assert.strictEqual(percentile([7, 300, 12], 100), 300);
});

test("percentile of an empty list is null", () => {
  assert.strictEqual(percentile([], 99), null);
});

test("percentile does not change the order of the input array", () => {
  const times = [300, 100, 200];
  assert.strictEqual(percentile(times, 50), 200);
  assert.deepStrictEqual(times, [300, 100, 200]);
});

// ---- spans and the slowest step ----

test("slowestStep finds the database query, not the first span that only waits", () => {
  const rec = createRecorder();
  slowCheckout(rec);
  const slow = rec.slowestStep("4bf92f35");
  assert.strictEqual(slow.name, "SELECT payments");
  assert.strictEqual(slow.service, "payment");
  assert.strictEqual(slow.ownMs, 2900);
});

test("slowestStep returns a copy of the span with ownMs added", () => {
  const rec = createRecorder();
  slowCheckout(rec);
  assert.deepStrictEqual(rec.slowestStep("4bf92f35"), {
    traceId: "4bf92f35", spanId: "p2", parentId: "p1", service: "payment",
    name: "SELECT payments", start: 40, ms: 2900, ownMs: 2900,
  });
});

test("own time is the span's time minus its direct children only", () => {
  const rec = createRecorder();
  rec.span({ traceId: "t1", spanId: "a", parentId: null, service: "api", name: "root", start: 0, ms: 1000 });
  rec.span({ traceId: "t1", spanId: "b", parentId: "a", service: "api", name: "child", start: 10, ms: 300 });
  rec.span({ traceId: "t1", spanId: "c", parentId: "b", service: "db", name: "grandchild", start: 20, ms: 250 });
  // root own time 1000 - 300 = 700, child 300 - 250 = 50, grandchild 250
  const slow = rec.slowestStep("t1");
  assert.strictEqual(slow.name, "root");
  assert.strictEqual(slow.ownMs, 700);
});

test("slowestStep looks only at spans of the given trace id", () => {
  const rec = createRecorder();
  slowCheckout(rec, "4bf92f35");
  rec.span({ traceId: "other", spanId: "x1", parentId: null, service: "api", name: "GET /products", start: 0, ms: 9000 });
  assert.strictEqual(rec.slowestStep("4bf92f35").name, "SELECT payments");
  assert.strictEqual(rec.slowestStep("other").name, "GET /products");
});

test("slowestStep of an unknown trace id is null", () => {
  const rec = createRecorder();
  slowCheckout(rec);
  assert.strictEqual(rec.slowestStep("nope"), null);
});

// ---- structured logs ----

test("log returns one JSON line with level, traceId, service, msg, then the fields", () => {
  const rec = createRecorder();
  const line = rec.log("4bf92f35", "payment", "warn", "slow query", { ms: 2900 });
  assert.strictEqual(line, '{"level":"warn","traceId":"4bf92f35","service":"payment","msg":"slow query","ms":2900}');
});

test("log hides secret fields as a safety net", () => {
  const rec = createRecorder();
  const line = rec.log("t1", "api", "info", "login", { userId: 7, password: "hunter2", Authorization: "Bearer abc", cardNumber: "4111" });
  assert.deepStrictEqual(JSON.parse(line), {
    level: "info", traceId: "t1", service: "api", msg: "login",
    userId: 7, password: "[hidden]", Authorization: "[hidden]", cardNumber: "[hidden]",
  });
});

test("logsFor returns only the lines of one trace, oldest first", () => {
  const rec = createRecorder();
  rec.log("4bf92f35", "api", "info", "checkout started");
  rec.log("9e1c0a77", "api", "info", "products listed");
  rec.log("4bf92f35", "payment", "warn", "slow query", { ms: 2900 });
  assert.deepStrictEqual(rec.logsFor("4bf92f35"), [
    '{"level":"info","traceId":"4bf92f35","service":"api","msg":"checkout started"}',
    '{"level":"warn","traceId":"4bf92f35","service":"payment","msg":"slow query","ms":2900}',
  ]);
  assert.deepStrictEqual(rec.logsFor("nope"), []);
});

// ---- request numbers: rate, errors, duration ----

test("request counts requests and errors per route: 5xx is an error, 4xx is not", () => {
  const rec = createRecorder();
  rec.request("POST /checkout", 201, 100);
  rec.request("POST /checkout", 400, 50);
  rec.request("POST /checkout", 503, 3000);
  rec.request("POST /checkout", 201, 120);
  const s = rec.stats("POST /checkout");
  assert.strictEqual(s.requests, 4);
  assert.strictEqual(s.errors, 1);
  assert.strictEqual(s.errorRate, 0.25);
});

test("stats gives p50 and p99 from the route's durations", () => {
  const rec = createRecorder();
  for (const ms of hundredCheckouts()) rec.request("POST /checkout", 201, ms);
  assert.deepStrictEqual(rec.stats("POST /checkout"), { requests: 100, errors: 0, errorRate: 0, p50: 100, p99: 3000 });
});

test("each route has its own numbers", () => {
  const rec = createRecorder();
  rec.request("POST /checkout", 201, 3000);
  rec.request("GET /products", 200, 40);
  rec.request("GET /products", 500, 60);
  assert.deepStrictEqual(rec.stats("POST /checkout"), { requests: 1, errors: 0, errorRate: 0, p50: 3000, p99: 3000 });
  assert.deepStrictEqual(rec.stats("GET /products"), { requests: 2, errors: 1, errorRate: 0.5, p50: 40, p99: 60 });
});

test("stats for a route with no requests is all zero and null", () => {
  const rec = createRecorder();
  assert.deepStrictEqual(rec.stats("POST /checkout"), { requests: 0, errors: 0, errorRate: 0, p50: null, p99: null });
});
