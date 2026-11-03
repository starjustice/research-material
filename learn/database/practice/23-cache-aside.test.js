const test = require("node:test");
const assert = require("node:assert");
const { makeCache, cachedGet, makeSharedGetter } = require("./23-cache-aside");

// A clock you can move by hand.
function makeClock() {
  let t = 1000;
  return { now: () => t, tick: ms => { t += ms; } };
}

// A pretend database call that counts how often it runs.
function makeLoader(answer = key => "value-of-" + key, delayMs = 5) {
  const loader = async key => {
    loader.calls.push(key);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return answer(key);
  };
  loader.calls = [];
  return loader;
}

// ---- Task 1: makeCache ----

test("task 1: a missing key gives undefined, a stored key gives its value", () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  assert.strictEqual(cache.get("a"), undefined);
  cache.set("a", { n: 1 }, 1000);
  assert.deepStrictEqual(cache.get("a"), { n: 1 });
  assert.strictEqual(cache.get("b"), undefined);
});

test("task 1: a key is still there just before its time, and gone at its time", () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  cache.set("a", "x", 1000);
  clock.tick(999);
  assert.strictEqual(cache.get("a"), "x");
  clock.tick(1);
  assert.strictEqual(cache.get("a"), undefined);
});

test("task 1: del forgets the key at once, and set again starts a new time", () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  cache.set("a", "x", 1000);
  cache.del("a");
  assert.strictEqual(cache.get("a"), undefined);
  cache.set("a", "y", 1000);
  clock.tick(600);
  cache.set("a", "z", 1000);
  clock.tick(600);
  assert.strictEqual(cache.get("a"), "z", "the second set must start the time again");
});

// ---- Task 2: cachedGet ----

test("task 2: the second read comes from the cache, load runs once", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  const load = makeLoader();
  assert.strictEqual(await cachedGet(cache, "k1", 1000, load), "value-of-k1");
  assert.strictEqual(await cachedGet(cache, "k1", 1000, load), "value-of-k1");
  assert.deepStrictEqual(load.calls, ["k1"]);
});

test("task 2: after the time is over, load runs again", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  const load = makeLoader();
  await cachedGet(cache, "k1", 1000, load);
  clock.tick(1000);
  await cachedGet(cache, "k1", 1000, load);
  assert.deepStrictEqual(load.calls, ["k1", "k1"]);
});

test("task 2: an error is not kept, the next read tries again", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  let fail = true;
  const load = makeLoader(() => { if (fail) throw new Error("db down"); return "ok"; });
  await assert.rejects(cachedGet(cache, "k1", 1000, load), /db down/);
  fail = false;
  assert.strictEqual(await cachedGet(cache, "k1", 1000, load), "ok");
  assert.strictEqual(load.calls.length, 2);
});

test("task 2: undefined from load is not kept", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  const load = makeLoader(() => undefined);
  assert.strictEqual(await cachedGet(cache, "k1", 1000, load), undefined);
  assert.strictEqual(await cachedGet(cache, "k1", 1000, load), undefined);
  assert.strictEqual(load.calls.length, 2);
});

test("task 2: a write to the database is seen after you delete the cache key", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  let price = 100;
  const load = makeLoader(() => price);
  assert.strictEqual(await cachedGet(cache, "p", 60000, load), 100);
  price = 200;
  assert.strictEqual(await cachedGet(cache, "p", 60000, load), 100, "still the old answer: the cache was not told");
  cache.del("p");
  assert.strictEqual(await cachedGet(cache, "p", 60000, load), 200);
});

// ---- Task 3: makeSharedGetter ----

test("task 3: 50 requests at once for a missing key start ONE load", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  const load = makeLoader();
  const get = makeSharedGetter(cache, 1000, load);
  const answers = await Promise.all(Array.from({ length: 50 }, () => get("k1")));
  assert.strictEqual(load.calls.length, 1, "the other 49 must wait for the first load");
  assert.ok(answers.every(a => a === "value-of-k1"));
});

test("task 3: different keys are loaded separately", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  const load = makeLoader();
  const get = makeSharedGetter(cache, 1000, load);
  const answers = await Promise.all([get("a"), get("b"), get("a"), get("b")]);
  assert.deepStrictEqual(answers, ["value-of-a", "value-of-b", "value-of-a", "value-of-b"]);
  assert.deepStrictEqual(load.calls.slice().sort(), ["a", "b"]);
});

test("task 3: after the load, the answer comes from the cache, and it expires as normal", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  const load = makeLoader();
  const get = makeSharedGetter(cache, 1000, load);
  await get("k1");
  await get("k1");
  assert.strictEqual(load.calls.length, 1);
  clock.tick(1000);
  await get("k1");
  assert.strictEqual(load.calls.length, 2);
});

test("task 3: if the shared load fails, everyone waiting gets the error, and the next call tries again", async () => {
  const clock = makeClock();
  const cache = makeCache(clock.now);
  let fail = true;
  const load = makeLoader(() => { if (fail) throw new Error("db down"); return "ok"; });
  const get = makeSharedGetter(cache, 1000, load);
  const results = await Promise.allSettled([get("k1"), get("k1"), get("k1")]);
  assert.ok(results.every(r => r.status === "rejected" && /db down/.test(r.reason.message)));
  assert.strictEqual(load.calls.length, 1);
  fail = false;
  assert.strictEqual(await get("k1"), "ok");
  assert.strictEqual(load.calls.length, 2);
});
