const test = require("node:test");
const assert = require("node:assert");
const { createTelemetry, handleRequest } = require("./14-observability");

// A fake clock. advance(12) means "12 ms of work happened".
function setup() {
  let now = 1000;
  const advance = (ms) => { now += ms; };
  const t = createTelemetry({ clock: () => now });
  return { t, advance };
}

test("log returns one line of JSON with traceId, msg and the fields", () => {
  const { t } = setup();
  const line = t.log("abc123", "order created", { orderId: 42, ms: 87 });
  assert.strictEqual(typeof line, "string");
  assert.deepStrictEqual(JSON.parse(line), { traceId: "abc123", msg: "order created", orderId: 42, ms: 87 });
});

test("log works without fields, and lines() keeps the lines oldest first", () => {
  const { t } = setup();
  t.log("t1", "first");
  t.log("t2", "second");
  const lines = t.lines();
  assert.strictEqual(lines.length, 2);
  assert.deepStrictEqual(JSON.parse(lines[0]), { traceId: "t1", msg: "first" });
  assert.deepStrictEqual(JSON.parse(lines[1]), { traceId: "t2", msg: "second" });
});

test("count builds the key from the name and the labels sorted by label name", () => {
  const { t } = setup();
  t.count("requests", { status: "ok", route: "/orders" });
  assert.deepStrictEqual(t.counters(), { "requests{route=/orders,status=ok}": 1 });
});

test("labels in a different order give the same key, and the counter adds up", () => {
  const { t } = setup();
  t.count("requests", { route: "/orders", status: "ok" });
  t.count("requests", { status: "ok", route: "/orders" });
  t.count("requests", { route: "/orders", status: "error" });
  assert.deepStrictEqual(t.counters(), {
    "requests{route=/orders,status=ok}": 2,
    "requests{route=/orders,status=error}": 1,
  });
  assert.strictEqual(t.seriesCount(), 2);
});

test("count with no labels uses only the name", () => {
  const { t } = setup();
  t.count("logins");
  t.count("logins");
  assert.deepStrictEqual(t.counters(), { logins: 2 });
});

test("a label named userId, orderId, traceId or email is refused and changes nothing", () => {
  const { t } = setup();
  for (const bad of ["userId", "orderId", "traceId", "email"]) {
    assert.throws(() => t.count("requests", { route: "/orders", [bad]: "x" }), Error);
  }
  assert.deepStrictEqual(t.counters(), {});
  assert.strictEqual(t.seriesCount(), 0);
});

test("span returns what fn returns and saves { traceId, name, ms } from the clock", () => {
  const { t, advance } = setup();
  const answer = t.span("abc123", "db", () => { advance(12); return "rows"; });
  assert.strictEqual(answer, "rows");
  assert.deepStrictEqual(t.spans(), [{ traceId: "abc123", name: "db", ms: 12 }]);
});

test("span saves the span even when fn throws, then throws the same error", () => {
  const { t, advance } = setup();
  const boom = new Error("timeout");
  assert.throws(() => t.span("abc123", "email", () => { advance(900); throw boom; }), (err) => err === boom);
  assert.deepStrictEqual(t.spans(), [{ traceId: "abc123", name: "email", ms: 900 }]);
});

test("spans are saved in the order they ended", () => {
  const { t, advance } = setup();
  t.span("t1", "outer", () => {
    advance(5);
    t.span("t1", "inner", () => advance(12));
    advance(3);
  });
  assert.deepStrictEqual(t.spans().map((s) => [s.name, s.ms]), [["inner", 12], ["outer", 20]]);
});

test("handleRequest: the log line and the span have the same trace id, the counter has none", () => {
  const { t, advance } = setup();
  const status = handleRequest(t, { traceId: "abc123", route: "/orders", steps: [["db", () => advance(12)]] });
  assert.strictEqual(status, "ok");
  assert.deepStrictEqual(t.spans(), [{ traceId: "abc123", name: "db", ms: 12 }]);
  assert.deepStrictEqual(JSON.parse(t.lines()[0]), { traceId: "abc123", msg: "request done", route: "/orders", status: "ok" });
  assert.deepStrictEqual(t.counters(), { "requests{route=/orders,status=ok}": 1 });
  assert.ok(!Object.keys(t.counters()).join("").includes("abc123"));
});

test("handleRequest: a step that throws gives status error, keeps its span, and skips the next steps", () => {
  const { t, advance } = setup();
  const status = handleRequest(t, {
    traceId: "def456",
    route: "/orders",
    steps: [
      ["db", () => advance(12)],
      ["email", () => { advance(900); throw new Error("timeout"); }],
      ["audit", () => advance(1)],
    ],
  });
  assert.strictEqual(status, "error");
  assert.deepStrictEqual(t.spans(), [
    { traceId: "def456", name: "db", ms: 12 },
    { traceId: "def456", name: "email", ms: 900 },
  ]);
  assert.deepStrictEqual(t.counters(), { "requests{route=/orders,status=error}": 1 });
  assert.strictEqual(JSON.parse(t.lines()[0]).status, "error");
});

test("1000 different users still make only 2 series, because the user id stays out of the labels", () => {
  const { t, advance } = setup();
  for (let u = 1; u <= 1000; u++) {
    handleRequest(t, {
      traceId: "trace-" + u,
      route: "/orders",
      steps: [["db", () => { advance(1); if (u % 10 === 0) throw new Error("fail"); }]],
    });
  }
  assert.strictEqual(t.seriesCount(), 2);
  assert.strictEqual(t.counters()["requests{route=/orders,status=ok}"], 900);
  assert.strictEqual(t.counters()["requests{route=/orders,status=error}"], 100);
  assert.strictEqual(t.lines().length, 1000);
});
