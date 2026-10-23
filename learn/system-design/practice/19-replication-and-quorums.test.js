const test = require("node:test");
const assert = require("node:assert");
const { createCluster, canBeStale } = require("./19-replication-and-quorums");

test("a new cluster has n copies, all holding v1 and all up", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  assert.deepStrictEqual(c.copies(), [
    { version: 1, value: "v1", up: true },
    { version: 1, value: "v1", up: true },
    { version: 1, value: "v1", up: true },
  ]);
});

test("a write that reaches w copies is ok and only those copies change", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  assert.deepStrictEqual(c.write("v2", [0, 1]), { ok: true, acks: 2 });
  assert.deepStrictEqual(c.copies().map((x) => x.value), ["v2", "v2", "v1"]);
  assert.deepStrictEqual(c.copies().map((x) => x.version), [2, 2, 1]);
});

test("a write that reaches fewer than w copies is refused and changes nothing", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  assert.deepStrictEqual(c.write("v2", [0]), { ok: false, acks: 1 });
  assert.deepStrictEqual(c.copies().map((x) => x.value), ["v1", "v1", "v1"]);
});

test("R=2 and W=2 out of 3: every pair of copies you could ask gives the newest value", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.write("v2", [0, 1]);
  for (const pair of [[0, 1], [0, 2], [1, 2]]) {
    assert.deepStrictEqual(c.read(pair), { ok: true, value: "v2", version: 2, stale: false });
  }
});

test("R=1 can land on the late copy and return an old value", () => {
  const c = createCluster({ n: 3, w: 2, r: 1 });
  c.write("v2", [0, 1]);
  assert.deepStrictEqual(c.read([2]), { ok: true, value: "v1", version: 1, stale: true });
  assert.strictEqual(c.read([0]).stale, false);
});

test("a read needs at least r answers", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  assert.deepStrictEqual(c.read([0]), { ok: false });
});

test("a read that gets more than r answers uses the newest one", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.write("v2", [0, 1]);
  assert.strictEqual(c.read([2, 0, 1]).value, "v2");
});

test("a copy that is down cannot save a write", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.down(1);
  assert.deepStrictEqual(c.write("v2", [0, 1]), { ok: false, acks: 1 });
});

test("a copy that is down cannot answer a read", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.down(0);
  assert.deepStrictEqual(c.read([0, 1]), { ok: false });
});

test("one copy down: with n=3, w=2, r=2 writes and reads still work", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.down(2);
  assert.strictEqual(c.canWrite(), true);
  assert.strictEqual(c.canRead(), true);
  assert.deepStrictEqual(c.write("v2", [0, 1, 2]), { ok: true, acks: 2 });
  assert.strictEqual(c.read([0, 1]).value, "v2");
});

test("two copies down: w=2 and r=2 cannot be reached, but r=1 still can", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.down(1);
  c.down(2);
  assert.strictEqual(c.canWrite(), false);
  assert.strictEqual(c.canRead(), false);
  const fast = createCluster({ n: 3, w: 3, r: 1 });
  fast.down(1);
  fast.down(2);
  assert.strictEqual(fast.canRead(), true);
  assert.strictEqual(fast.canWrite(), false);
});

test("a copy that was down comes back behind, and the newest answer still wins", () => {
  const c = createCluster({ n: 3, w: 2, r: 2 });
  c.down(2);
  c.write("v2", [0, 1]);
  c.up(2);
  assert.strictEqual(c.copies()[2].value, "v1");
  assert.deepStrictEqual(c.read([2, 1]), { ok: true, value: "v2", version: 2, stale: false });
});

test("catchUp gives a late copy the newest value", () => {
  const c = createCluster({ n: 3, w: 2, r: 1 });
  c.write("v2", [0, 1]);
  c.catchUp(2);
  assert.deepStrictEqual(c.copies()[2], { version: 2, value: "v2", up: true });
  assert.strictEqual(c.read([2]).stale, false);
});

test("stale means older than the newest acknowledged write", () => {
  const c = createCluster({ n: 3, w: 2, r: 1 });
  c.write("v2", [0, 1]);
  c.write("v3", [1, 2]);
  assert.deepStrictEqual(c.copies().map((x) => x.value), ["v2", "v3", "v3"]);
  assert.strictEqual(c.read([0]).stale, true);
  assert.strictEqual(c.read([0]).value, "v2");
  assert.strictEqual(c.read([2]).stale, false);
});

test("canBeStale on the famous numbers", () => {
  assert.strictEqual(canBeStale(3, 2, 2), false);
  assert.strictEqual(canBeStale(3, 1, 1), true);
  assert.strictEqual(canBeStale(3, 2, 1), true);
  assert.strictEqual(canBeStale(3, 3, 1), false);
  assert.strictEqual(canBeStale(3, 1, 3), false);
  assert.strictEqual(canBeStale(5, 3, 3), false);
  assert.strictEqual(canBeStale(5, 2, 3), true);
  assert.strictEqual(canBeStale(4, 2, 2), true);
});

test("canBeStale is false exactly when r + w is more than n", () => {
  for (let n = 1; n <= 5; n++)
    for (let w = 1; w <= n; w++)
      for (let r = 1; r <= n; r++)
        assert.strictEqual(canBeStale(n, w, r), !(r + w > n), `n=${n} w=${w} r=${r}`);
});
