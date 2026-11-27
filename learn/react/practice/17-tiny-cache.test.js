const test = require("node:test");
const assert = require("node:assert");
const { createCache } = require("./17-tiny-cache");

// A fake clock and a fake data source that counts its calls.
function setup() {
  let time = 0;
  const cache = createCache(() => time);
  let calls = 0;
  const load = cache.wrap(async (id) => { calls++; return `${id}-v${calls}`; }, { tag: "posts", revalidate: 1000 });
  return { cache, load, calls: () => calls, tick: (ms) => { time += ms; } };
}
const flush = () => new Promise((r) => setImmediate(r)); // lets background work finish

test("a fresh result is returned without calling the function again", async () => {
  const t = setup();
  assert.strictEqual(await t.load("a"), "a-v1");
  t.tick(999);
  assert.strictEqual(await t.load("a"), "a-v1");
  assert.strictEqual(t.calls(), 1);
});

test("a result older than revalidate is fetched again", async () => {
  const t = setup();
  await t.load("a");
  t.tick(1000);
  assert.strictEqual(await t.load("a"), "a-v2");
  assert.strictEqual(t.calls(), 2);
});

test("different arguments make different cache entries", async () => {
  const t = setup();
  assert.strictEqual(await t.load("a"), "a-v1");
  assert.strictEqual(await t.load("b"), "b-v2");
  assert.strictEqual(await t.load("a"), "a-v1");
  assert.strictEqual(t.calls(), 2);
});

test("updateTag: the next call waits for fresh data", async () => {
  const t = setup();
  await t.load("a");
  t.cache.updateTag("posts");
  assert.strictEqual(await t.load("a"), "a-v2");
});

test("updateTag only touches entries with that tag", async () => {
  const t = setup();
  const other = t.cache.wrap(async () => "other", { tag: "users", revalidate: 1000 });
  await other();
  await t.load("a");
  t.cache.updateTag("posts");
  assert.strictEqual(await other(), "other");
});

test("revalidateTag: the next call returns the OLD value at once", async () => {
  const t = setup();
  await t.load("a");
  t.cache.revalidateTag("posts");
  assert.strictEqual(await t.load("a"), "a-v1", "stale while revalidate: serve the old value first");
});

test("revalidateTag: the call after that returns the NEW value", async () => {
  const t = setup();
  await t.load("a");
  t.cache.revalidateTag("posts");
  await t.load("a");
  await flush();
  assert.strictEqual(await t.load("a"), "a-v2");
  assert.strictEqual(t.calls(), 2, "the background refresh must run only once");
});

test("a second call during the background refresh does not start another refresh", async () => {
  const t = setup();
  await t.load("a");
  t.cache.revalidateTag("posts");
  await t.load("a");
  await t.load("a");
  await flush();
  assert.strictEqual(t.calls(), 2);
});
