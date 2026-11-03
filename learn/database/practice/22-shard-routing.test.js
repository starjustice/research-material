const test = require("node:test");
const assert = require("node:assert");
const { countMoved, shardOf, makeBucketRouter, addShard } = require("./22-shard-routing");

const ids = Array.from({ length: 100000 }, (_, i) => "user-" + (i + 1));
const BUCKETS = 1024;
const owners4 = Array.from({ length: BUCKETS }, (_, b) => b % 4);
const spread = (router, n) => {
  const counts = Array(n).fill(0);
  ids.forEach(id => counts[router(id)]++);
  return counts;
};

// ---- Task 1: shardOf ----

test("task 1: the shard is a whole number from 0 to shardCount - 1", () => {
  for (const id of ids.slice(0, 500)) {
    const shard = shardOf(id, 4);
    assert.ok(Number.isInteger(shard) && shard >= 0 && shard < 4, `bad shard for ${id}: ${shard}`);
  }
});

test("task 1: the same id always gives the same shard", () => {
  assert.ok(Number.isInteger(shardOf("user-42", 4)));
  assert.strictEqual(shardOf("user-42", 4), shardOf("user-42", 4));
});

test("task 1: 100,000 ids are spread evenly over 4 shards", () => {
  const counts = spread(id => shardOf(id, 4), 4);
  for (const c of counts) assert.ok(c > 24000 && c < 26000, "uneven spread: " + counts);
});

test("task 1: going from 4 to 5 shards moves about 80% of the rows (the problem)", () => {
  const moved = countMoved(ids, id => shardOf(id, 4), id => shardOf(id, 5));
  assert.ok(moved > 78000 && moved < 82000, "moved " + moved);
});

// ---- Task 2: makeBucketRouter ----

test("task 2: the router sends an id to the owner of its bucket", () => {
  const router = makeBucketRouter(owners4);
  const counts = spread(router, 4);
  for (const c of counts) assert.ok(c > 24000 && c < 26000, "uneven spread: " + counts);
  assert.strictEqual(router("user-7"), router("user-7"));
});

test("task 2: the router follows the owners list it was given", () => {
  const everyoneOnShard3 = Array(BUCKETS).fill(3);
  const router = makeBucketRouter(everyoneOnShard3);
  assert.strictEqual(router("user-1"), 3);
  assert.strictEqual(router("user-99999"), 3);
});

// ---- Task 3: addShard ----

test("task 3: addShard does not change the list it was given", () => {
  const copy = owners4.slice();
  const result = addShard(owners4, 4);
  assert.ok(Array.isArray(result) && result !== owners4, "return a new list");
  assert.deepStrictEqual(owners4, copy);
});

test("task 3: the new shard owns every 5th bucket, the rest keep their owner", () => {
  const owners5 = addShard(owners4, 4);
  assert.strictEqual(owners5.length, BUCKETS);
  owners5.forEach((owner, b) => {
    if (b % 5 === 4) assert.strictEqual(owner, 4, "bucket " + b);
    else assert.strictEqual(owner, owners4[b], "bucket " + b);
  });
});

test("task 3: going from 4 to 5 shards now moves about 20% of the rows, not 80%", () => {
  const before = makeBucketRouter(owners4);
  const after = makeBucketRouter(addShard(owners4, 4));
  const moved = countMoved(ids, before, after);
  assert.ok(moved > 18000 && moved < 22000, "moved " + moved);
});

test("task 3: with 5 shards the spread is still even", () => {
  const counts = spread(makeBucketRouter(addShard(owners4, 4)), 5);
  for (const c of counts) assert.ok(c > 19000 && c < 21000, "uneven spread: " + counts);
});
