const test = require("node:test");
const assert = require("node:assert");
const { batchLoader } = require("./05-resolvers-and-the-n-1-problem");

test("one load triggers one batch", async () => {
  const calls = [];
  const loader = batchLoader((keys) => {
    calls.push(keys);
    return keys.map((k) => k * 10);
  });
  const value = await loader.load(3);
  assert.strictEqual(value, 30);
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], [3]);
});

test("many loads in the same tick are batched once", async () => {
  const calls = [];
  const loader = batchLoader((keys) => {
    calls.push(keys);
    return keys.map((k) => "v" + k);
  });
  const [a, b, c] = await Promise.all([loader.load(1), loader.load(2), loader.load(3)]);
  assert.strictEqual(a, "v1");
  assert.strictEqual(b, "v2");
  assert.strictEqual(c, "v3");
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], [1, 2, 3]);
});

test("duplicate keys in the same tick are deduplicated for fn", async () => {
  const calls = [];
  const loader = batchLoader((keys) => {
    calls.push(keys);
    return keys.map((k) => k.toUpperCase());
  });
  const [a, b, c] = await Promise.all([loader.load("x"), loader.load("y"), loader.load("x")]);
  assert.strictEqual(a, "X");
  assert.strictEqual(b, "Y");
  assert.strictEqual(c, "X");
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], ["x", "y"]);
});

test("loads in different ticks create different batches", async () => {
  const calls = [];
  const loader = batchLoader((keys) => {
    calls.push(keys);
    return keys.map((k) => k + 1);
  });
  const first = await loader.load(10);
  assert.strictEqual(first, 11);
  const second = await loader.load(20);
  assert.strictEqual(second, 21);
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(calls[0], [10]);
  assert.deepStrictEqual(calls[1], [20]);
});

test("the batch function may return a Promise", async () => {
  const loader = batchLoader((keys) => Promise.resolve(keys.map((k) => k * 2)));
  const [a, b] = await Promise.all([loader.load(5), loader.load(6)]);
  assert.strictEqual(a, 10);
  assert.strictEqual(b, 12);
});

test("order of returned values matches order of keys", async () => {
  const loader = batchLoader((keys) => keys.map((k) => ({ id: k })));
  const [a, b] = await Promise.all([loader.load("b"), loader.load("a")]);
  assert.deepStrictEqual(a, { id: "b" });
  assert.deepStrictEqual(b, { id: "a" });
});

test("a rejected batch rejects every load in that batch", async () => {
  const loader = batchLoader(() => Promise.reject(new Error("db down")));
  const [a, b] = [loader.load(1), loader.load(2)];
  await assert.rejects(a, /db down/);
  await assert.rejects(b, /db down/);
});

test("one batch failure does not break a later batch", async () => {
  let ok = true;
  const loader = batchLoader((keys) => {
    if (ok) return Promise.resolve(keys.map(() => "old"));
    return Promise.reject(new Error("later"));
  });
  assert.strictEqual(await loader.load(1), "old");
  ok = false;
  await assert.rejects(loader.load(2), /later/);
});

test("a second load for the same key returns the same promise", async () => {
  const calls = [];
  const loader = batchLoader((keys) => {
    calls.push(keys);
    return keys.map((k) => k + 1);
  });
  const p1 = loader.load(7);
  const p2 = loader.load(7);
  assert.strictEqual(p1, p2);
  assert.strictEqual(await p1, 8);
  assert.strictEqual(await p2, 8);
  assert.strictEqual(calls.length, 1);
});

test("different loaders do not share state", async () => {
  const fn = (keys) => keys.map((k) => k * 100);
  const loader1 = batchLoader(fn);
  const loader2 = batchLoader(fn);
  const [a, b] = await Promise.all([loader1.load(2), loader2.load(3)]);
  assert.strictEqual(a, 200);
  assert.strictEqual(b, 300);
});
