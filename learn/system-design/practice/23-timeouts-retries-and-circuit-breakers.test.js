const test = require("node:test");
const assert = require("node:assert");
const { backoffMs, createCircuitBreaker } = require("./23-timeouts-retries-and-circuit-breakers");

// ---------- backoffMs ----------

test("backoffMs: the ceiling doubles each attempt (random always 1)", () => {
  const top = { random: () => 1 };
  assert.strictEqual(backoffMs(0, top), 100);
  assert.strictEqual(backoffMs(1, top), 200);
  assert.strictEqual(backoffMs(2, top), 400);
  assert.strictEqual(backoffMs(3, top), 800);
});

test("backoffMs: jitter picks a point between 0 and the ceiling", () => {
  assert.strictEqual(backoffMs(2, { random: () => 0 }), 0);
  assert.strictEqual(backoffMs(2, { random: () => 0.5 }), 200);
  assert.strictEqual(backoffMs(3, { random: () => 0.25 }), 200);
});

test("backoffMs: the wait never goes above the cap", () => {
  assert.strictEqual(backoffMs(10, { random: () => 1 }), 5000);
  assert.strictEqual(backoffMs(30, { random: () => 1 }), 5000);
  assert.strictEqual(backoffMs(5, { baseMs: 50, capMs: 1000, random: () => 1 }), 1000);
});

test("backoffMs: baseMs and capMs can be changed", () => {
  assert.strictEqual(backoffMs(0, { baseMs: 20, random: () => 1 }), 20);
  assert.strictEqual(backoffMs(3, { baseMs: 20, random: () => 1 }), 160);
});

test("backoffMs: with the real random, every value is between 0 and the ceiling", () => {
  for (let i = 0; i < 200; i++) {
    const wait = backoffMs(3);
    assert.ok(wait >= 0 && wait < 800, "wait was " + wait);
  }
});

test("backoffMs: jitter spreads 100 clients over many different moments", () => {
  let seed = 7;
  const seeded = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const waits = new Set();
  for (let client = 0; client < 100; client++) waits.add(backoffMs(0, { random: seeded }));
  assert.ok(waits.size > 90, "only " + waits.size + " different waits");
});

// ---------- createCircuitBreaker ----------

function setup(options = {}) {
  const clock = { t: 0 };
  const breaker = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1000, now: () => clock.t, ...options });
  const calls = { n: 0 };
  const ok = async () => { calls.n++; return "ok"; };
  const boom = async () => { calls.n++; throw new Error("provider down"); };
  return { clock, breaker, calls, ok, boom };
}

async function failTimes(breaker, boom, times) {
  for (let i = 0; i < times; i++) await assert.rejects(breaker.call(boom), /provider down/);
}

test("a new breaker is closed", () => {
  const { breaker } = setup();
  assert.strictEqual(breaker.state(), "closed");
  assert.strictEqual(breaker.failures(), 0);
});

test("closed: a good call returns its value", async () => {
  const { breaker, ok } = setup();
  assert.strictEqual(await breaker.call(ok), "ok");
  assert.strictEqual(breaker.state(), "closed");
});

test("closed: a failing call throws the real error and counts one failure", async () => {
  const { breaker, boom } = setup();
  await assert.rejects(breaker.call(boom), /provider down/);
  assert.strictEqual(breaker.failures(), 1);
  assert.strictEqual(breaker.state(), "closed");
});

test("a success resets the count of failures in a row", async () => {
  const { breaker, ok, boom } = setup();
  await failTimes(breaker, boom, 2);
  await breaker.call(ok);
  assert.strictEqual(breaker.failures(), 0);
  await failTimes(breaker, boom, 2);
  assert.strictEqual(breaker.state(), "closed");
});

test("it opens after failureThreshold failures in a row", async () => {
  const { breaker, boom } = setup();
  await failTimes(breaker, boom, 2);
  assert.strictEqual(breaker.state(), "closed");
  await failTimes(breaker, boom, 1);
  assert.strictEqual(breaker.state(), "open");
});

test("open: it fails fast and does not call the provider", async () => {
  const { breaker, ok, boom, calls } = setup();
  await failTimes(breaker, boom, 3);
  const before = calls.n;
  await assert.rejects(breaker.call(ok), (err) => err.code === "CIRCUIT_OPEN");
  assert.strictEqual(calls.n, before);
});

test("open: a rejected call is not counted as a failure and does not restart the cooldown", async () => {
  const { breaker, clock, ok, boom } = setup();
  await failTimes(breaker, boom, 3);
  clock.t = 900;
  await assert.rejects(breaker.call(ok), (err) => err.code === "CIRCUIT_OPEN");
  assert.strictEqual(breaker.failures(), 3);
  clock.t = 1000;
  assert.strictEqual(breaker.state(), "half-open");
});

test("it stays open until the cooldown is over", async () => {
  const { breaker, clock, boom } = setup();
  await failTimes(breaker, boom, 3);
  clock.t = 999;
  assert.strictEqual(breaker.state(), "open");
  clock.t = 1000;
  assert.strictEqual(breaker.state(), "half-open");
});

test("half open: a good test call closes the breaker and resets the count", async () => {
  const { breaker, clock, ok, boom } = setup();
  await failTimes(breaker, boom, 3);
  clock.t = 1000;
  assert.strictEqual(await breaker.call(ok), "ok");
  assert.strictEqual(breaker.state(), "closed");
  assert.strictEqual(breaker.failures(), 0);
});

test("half open: a failing test call opens it again and restarts the cooldown", async () => {
  const { breaker, clock, boom } = setup();
  await failTimes(breaker, boom, 3);
  clock.t = 1000;
  await assert.rejects(breaker.call(boom), /provider down/);
  assert.strictEqual(breaker.state(), "open");
  clock.t = 1999;
  assert.strictEqual(breaker.state(), "open");
  clock.t = 2000;
  assert.strictEqual(breaker.state(), "half-open");
});

test("half open: only one test call at a time", async () => {
  const { breaker, clock, boom } = setup();
  await failTimes(breaker, boom, 3);
  clock.t = 1000;
  let finish;
  const slow = () => new Promise((resolve) => { finish = resolve; });
  const trial = breaker.call(slow);                                   // the test call is still running
  await assert.rejects(breaker.call(async () => "second"), (err) => err.code === "CIRCUIT_OPEN");
  finish("done");
  assert.strictEqual(await trial, "done");
  assert.strictEqual(breaker.state(), "closed");
});

test("the defaults are 3 failures and a 30 second cooldown", async () => {
  const clock = { t: 0 };
  const breaker = createCircuitBreaker({ now: () => clock.t });
  const boom = async () => { throw new Error("provider down"); };
  await failTimes(breaker, boom, 3);
  assert.strictEqual(breaker.state(), "open");
  clock.t = 29999;
  assert.strictEqual(breaker.state(), "open");
  clock.t = 30000;
  assert.strictEqual(breaker.state(), "half-open");
});

test("the story from lesson 23: down, open, a failed test, then a good test", async () => {
  const { breaker, clock } = setup({ cooldownMs: 10000 });
  const down = () => clock.t < 15000;                                  // the provider is down until t = 15 s
  const provider = async () => { if (down()) throw new Error("provider down"); return "ok"; };
  const seen = [];
  for (const t of [0, 1000, 2000, 3000, 8000, 12000, 13000, 22000, 23000]) {
    clock.t = t;
    try { await breaker.call(provider); seen.push("ok"); }
    catch (err) { seen.push(err.code === "CIRCUIT_OPEN" ? "fast" : "fail"); }
  }
  assert.deepStrictEqual(seen, ["fail", "fail", "fail", "fast", "fast", "fail", "fast", "ok", "ok"]);
  assert.strictEqual(breaker.state(), "closed");
});
