const test = require("node:test");
const assert = require("node:assert");
const { createCache } = require("./04-caching");

// A fake clock. A test moves time by changing clock.t. No test waits for real time.
function setup(options) {
  const clock = { t: 0 };
  const cache = createCache({ ...options, now: () => clock.t });
  return { cache, clock };
}

test("set then get returns the value, and a missing key gives undefined", () => {
  const { cache } = setup({ capacity: 3, ttlMs: 100 });
  cache.set("a", "A");
  assert.strictEqual(cache.get("a"), "A");
  assert.strictEqual(cache.get("zzz"), undefined);
});

test("a copy lives until ttlMs has passed, and not one millisecond longer", () => {
  const { cache, clock } = setup({ capacity: 3, ttlMs: 100 });
  cache.set("a", "A");
  clock.t = 99;
  assert.strictEqual(cache.get("a"), "A");
  clock.t = 100;
  assert.strictEqual(cache.get("a"), undefined);
});

test("a get does not make the copy live longer", () => {
  const { cache, clock } = setup({ capacity: 3, ttlMs: 100 });
  cache.set("a", "A");
  clock.t = 60;
  assert.strictEqual(cache.get("a"), "A");
  clock.t = 100;
  assert.strictEqual(cache.get("a"), undefined);
});

test("set on a key that is already there replaces the value and starts the time again", () => {
  const { cache, clock } = setup({ capacity: 3, ttlMs: 100 });
  cache.set("a", "old");
  clock.t = 60;
  cache.set("a", "new");
  clock.t = 130;
  assert.strictEqual(cache.get("a"), "new");
  clock.t = 160;
  assert.strictEqual(cache.get("a"), undefined);
});

test("when full, the copy used longest ago is dropped", () => {
  const { cache } = setup({ capacity: 2, ttlMs: 1000 });
  cache.set("a", "A");
  cache.set("b", "B");
  cache.get("a");                    // a is used just now, so b is the oldest use
  cache.set("c", "C");
  assert.strictEqual(cache.get("b"), undefined);
  assert.strictEqual(cache.get("a"), "A");
  assert.strictEqual(cache.get("c"), "C");
});

test("setting a key that is already there does not drop another key", () => {
  const { cache } = setup({ capacity: 2, ttlMs: 1000 });
  cache.set("a", "A");
  cache.set("b", "B");
  cache.set("a", "A2");
  assert.strictEqual(cache.get("a"), "A2");
  assert.strictEqual(cache.get("b"), "B");
});

test("when full, a copy whose time is over goes first, even if a live copy was used longer ago", () => {
  const { cache, clock } = setup({ capacity: 2, ttlMs: 100 });
  cache.set("a", "A");               // lives until 100
  clock.t = 50;
  cache.set("b", "B");               // lives until 150
  clock.t = 60;
  cache.get("a");                    // a is used just now, so b was used longest ago
  clock.t = 110;                     // a is over now, b is still alive
  cache.set("c", "C");
  assert.strictEqual(cache.get("b"), "B", "b is alive and must stay. The over copy a should go.");
  assert.strictEqual(cache.get("c"), "C");
  assert.strictEqual(cache.get("a"), undefined);
});

test("size counts only copies that are alive", () => {
  const { cache, clock } = setup({ capacity: 5, ttlMs: 100 });
  cache.set("a", "A");
  clock.t = 50;
  cache.set("b", "B");
  assert.strictEqual(cache.size(), 2);
  clock.t = 110;
  assert.strictEqual(cache.size(), 1);
  clock.t = 160;
  assert.strictEqual(cache.size(), 0);
});

test("the cache never holds more than capacity, and keeps the newest keys", () => {
  const { cache } = setup({ capacity: 3, ttlMs: 1000 });
  for (let i = 1; i <= 10; i++) cache.set("k" + i, i);
  assert.strictEqual(cache.size(), 3);
  assert.strictEqual(cache.get("k8"), 8);
  assert.strictEqual(cache.get("k9"), 9);
  assert.strictEqual(cache.get("k10"), 10);
  assert.strictEqual(cache.get("k7"), undefined);
});

test("without a now function it uses the real clock", () => {
  const cache = createCache({ capacity: 2, ttlMs: 5000 });
  cache.set("a", "A");
  assert.strictEqual(cache.get("a"), "A");
});
