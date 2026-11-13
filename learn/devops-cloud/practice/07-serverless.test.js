const test = require("node:test");
const assert = require("node:assert");
const { billedMs, expireIdle, runPlatform, monthlyCost, breakEvenCalls } = require("./07-serverless");

const cfg = { coldStartMs: 400, idleTimeoutMs: 10000, maxInstances: 3, billColdStart: false };
const req = (at, durationMs = 100) => ({ at, durationMs });
const kinds = (results) => results.map((r) => r.kind);

// ---------- billedMs ----------

test("billedMs: rounds up to the next whole millisecond", () => {
  assert.strictEqual(billedMs(933.59), 934);
  assert.strictEqual(billedMs(0.2), 1);
  assert.strictEqual(billedMs(1000.0001), 1001);
});

test("billedMs: a whole number stays the same", () => {
  assert.strictEqual(billedMs(100), 100);
  assert.strictEqual(billedMs(0), 0);
});

// ---------- expireIdle ----------

test("expireIdle: a busy instance is never removed", () => {
  const list = [{ id: 1, busyUntil: 50000 }];
  assert.deepStrictEqual(expireIdle(list, 100, 10), list);
});

test("expireIdle: an instance idle for less than the timeout stays", () => {
  const list = [{ id: 1, busyUntil: 1000 }];
  assert.deepStrictEqual(expireIdle(list, 1999, 1000), list);
});

test("expireIdle: idle for exactly the timeout is removed", () => {
  assert.deepStrictEqual(expireIdle([{ id: 1, busyUntil: 1000 }], 2000, 1000), []);
});

test("expireIdle: idle for longer than the timeout is removed, others stay", () => {
  const list = [{ id: 1, busyUntil: 100 }, { id: 2, busyUntil: 5000 }, { id: 3, busyUntil: 9000 }];
  assert.deepStrictEqual(expireIdle(list, 6000, 3000).map((i) => i.id), [2, 3]);
});

test("expireIdle: with a timeout of 0, idle instances go at once and busy ones stay", () => {
  const list = [{ id: 1, busyUntil: 1000 }, { id: 2, busyUntil: 1001 }];
  assert.deepStrictEqual(expireIdle(list, 1000, 0).map((i) => i.id), [2]);
});

test("expireIdle: an empty list gives an empty list", () => {
  assert.deepStrictEqual(expireIdle([], 5, 5), []);
});

test("expireIdle: returns a new list and does not change the old one", () => {
  const list = [{ id: 1, busyUntil: 0 }, { id: 2, busyUntil: 900 }];
  const out = expireIdle(list, 1000, 500);
  assert.deepStrictEqual(out.map((i) => i.id), [2]);
  assert.strictEqual(list.length, 2);
  assert.notStrictEqual(out, list);
});

// ---------- runPlatform ----------

test("runPlatform: the first request is cold and pays the cold start", () => {
  const [a] = runPlatform(cfg, [req(0, 100)]);
  assert.strictEqual(a.kind, "cold");
  assert.strictEqual(a.instance, 1);
  assert.strictEqual(a.latencyMs, 500);
});

test("runPlatform: the next request reuses the instance and is warm", () => {
  const out = runPlatform(cfg, [req(0), req(1000)]);
  assert.deepStrictEqual(kinds(out), ["cold", "warm"]);
  assert.strictEqual(out[1].instance, 1);
  assert.strictEqual(out[1].latencyMs, 100);
  assert.strictEqual(out[1].billedMs, 100);
});

test("runPlatform: a request that arrives exactly when the instance is free is warm", () => {
  const out = runPlatform(cfg, [req(0, 100), req(500, 100)]);   // instance 1 is busy until 500
  assert.strictEqual(out[1].kind, "warm");
});

test("runPlatform: a request that arrives while the instance is busy needs a second instance", () => {
  const out = runPlatform(cfg, [req(0, 100), req(499, 100)]);   // instance 1 is busy until 500
  assert.deepStrictEqual(kinds(out), ["cold", "cold"]);
  assert.deepStrictEqual(out.map((r) => r.instance), [1, 2]);
});

test("runPlatform: a warm request makes the instance busy again", () => {
  const out = runPlatform(cfg, [req(0, 100), req(1000, 1000), req(1500, 100)]);   // instance 1 is busy from 1000 to 2000
  assert.deepStrictEqual(kinds(out), ["cold", "warm", "cold"]);
  assert.strictEqual(out[2].instance, 2);
});

test("runPlatform: waiting less than the idle timeout keeps the instance warm", () => {
  const out = runPlatform(cfg, [req(0, 100), req(10499, 100)]);   // idle from 500, for 9999 ms
  assert.strictEqual(out[1].kind, "warm");
});

test("runPlatform: scale to zero. After the idle timeout the next request is cold with a new instance", () => {
  const out = runPlatform(cfg, [req(0, 100), req(10500, 100)]);   // idle from 500, for exactly 10000 ms
  assert.deepStrictEqual(kinds(out), ["cold", "cold"]);
  assert.deepStrictEqual(out.map((r) => r.instance), [1, 2]);
});

test("runPlatform: a free instance is used before a new one is made, the first free one wins", () => {
  const out = runPlatform(cfg, [req(0), req(0), req(5000)]);    // instances 1 and 2 are both free at 5000
  assert.deepStrictEqual(kinds(out), ["cold", "cold", "warm"]);
  assert.strictEqual(out[2].instance, 1);
});

test("runPlatform: at the instance limit, extra requests are throttled", () => {
  const out = runPlatform(cfg, [req(0), req(0), req(0), req(0), req(0)]);
  assert.deepStrictEqual(kinds(out), ["cold", "cold", "cold", "throttled", "throttled"]);
  assert.deepStrictEqual(out[3], { kind: "throttled", instance: null, latencyMs: 0, billedMs: 0 });
});

test("runPlatform: a throttled request does not create an instance", () => {
  const one = { ...cfg, maxInstances: 1 };
  const out = runPlatform(one, [req(0, 1000), req(0), req(2000)]);
  assert.deepStrictEqual(kinds(out), ["cold", "throttled", "warm"]);
  assert.strictEqual(out[2].instance, 1);
});

test("runPlatform: a new instance can be made again after an old one is removed, even at the limit", () => {
  const one = { ...cfg, maxInstances: 1 };
  const out = runPlatform(one, [req(0, 100), req(20000, 100)]);
  assert.deepStrictEqual(kinds(out), ["cold", "cold"]);
});

test("runPlatform: the cold start is not billed when billColdStart is false", () => {
  const [a] = runPlatform({ ...cfg, billColdStart: false }, [req(0, 100)]);
  assert.strictEqual(a.latencyMs, 500);
  assert.strictEqual(a.billedMs, 100);
});

test("runPlatform: the cold start is billed when billColdStart is true", () => {
  const [a] = runPlatform({ ...cfg, billColdStart: true }, [req(0, 100)]);
  assert.strictEqual(a.latencyMs, 500);
  assert.strictEqual(a.billedMs, 500);
});

test("runPlatform: a warm request is billed for its own time only, even when billColdStart is true", () => {
  const out = runPlatform({ ...cfg, billColdStart: true }, [req(0, 100), req(1000, 100)]);
  assert.strictEqual(out[1].billedMs, 100);
});

test("runPlatform: billed time is rounded up to whole milliseconds", () => {
  const out = runPlatform({ ...cfg, billColdStart: true }, [req(0, 100.4), req(1000, 99.2)]);
  assert.strictEqual(out[0].billedMs, 501);    // 400 + 100.4 = 500.4
  assert.strictEqual(out[1].billedMs, 100);    // 99.2
});

test("runPlatform: no requests gives no results, and the requests are not changed", () => {
  assert.deepStrictEqual(runPlatform(cfg, []), []);
  const reqs = [req(0), req(1)];
  runPlatform(cfg, reqs);
  assert.deepStrictEqual(reqs, [req(0), req(1)]);
});

test("runPlatform: every call starts with an empty pool", () => {
  const a = runPlatform(cfg, [req(0)]);
  const b = runPlatform(cfg, [req(0)]);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(b[0].kind, "cold");
});

// ---------- monthlyCost ----------

const price = { calls: 1000000, avgMs: 200, memoryMb: 512, pricePerGbSecond: 0.0000166667, pricePerMillionCalls: 0.2 };

test("monthlyCost: 1 million calls of 200 ms at 512 MB", () => {
  assert.strictEqual(monthlyCost(price), 1.87);        // 100000 GB-s * 0.0000166667 = 1.67, plus 0.20
});

test("monthlyCost: less memory costs less", () => {
  assert.strictEqual(monthlyCost({ ...price, memoryMb: 128 }), 0.62);
});

test("monthlyCost: fewer calls cost less", () => {
  assert.strictEqual(monthlyCost({ ...price, calls: 100000 }), 0.19);
  assert.strictEqual(monthlyCost({ ...price, calls: 100000000 }), 186.67);
});

test("monthlyCost: zero calls cost nothing", () => {
  assert.strictEqual(monthlyCost({ ...price, calls: 0 }), 0);
});

test("monthlyCost: the request price and the time price are both counted", () => {
  assert.strictEqual(monthlyCost({ ...price, pricePerGbSecond: 0 }), 0.2);
  assert.strictEqual(monthlyCost({ ...price, pricePerMillionCalls: 0 }), 1.67);
});

test("monthlyCost: the time is rounded up to whole milliseconds before it is priced", () => {
  const slow = { calls: 1000000, memoryMb: 1024, pricePerGbSecond: 1, pricePerMillionCalls: 0 };
  assert.strictEqual(monthlyCost({ ...slow, avgMs: 0.2 }), 1000);      // billed as 1 ms: 1,000,000 * 0.001 s
  assert.strictEqual(monthlyCost({ ...slow, avgMs: 100.5 }), 101000);  // billed as 101 ms
});

// ---------- breakEvenCalls ----------

test("breakEvenCalls: the fewest calls where serverless costs as much as the fixed price", () => {
  assert.strictEqual(breakEvenCalls(20, 4), 5000000);
  assert.strictEqual(breakEvenCalls(20, 1.87), 10695188);
});

test("breakEvenCalls: a part of a call rounds up, not down", () => {
  assert.strictEqual(breakEvenCalls(10, 3), 3333334);
});

test("breakEvenCalls: a more expensive call means fewer calls to break even", () => {
  assert.ok(breakEvenCalls(20, 8) < breakEvenCalls(20, 4));
});
