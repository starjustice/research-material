const test = require("node:test");
const assert = require("node:assert");
const { createLog, assign } = require("./21-streams-vs-queues");

// A fake hash so we know the partition: the key "k7" has the number 7.
const fake = (s) => Number(s.slice(1));
const small = () => createLog({ partitions: 2, hash: fake });   // even numbers -> partition 0, odd -> partition 1

test("append says which partition and which offset the message got, and offsets start at 0", () => {
  const log = small();
  assert.deepStrictEqual(log.append("k0", "a"), { partition: 0, offset: 0 });
  assert.deepStrictEqual(log.append("k2", "b"), { partition: 0, offset: 1 });
  assert.deepStrictEqual(log.append("k1", "c"), { partition: 1, offset: 0 });
  assert.strictEqual(log.size(0), 2);
  assert.strictEqual(log.size(1), 1);
});

test("order exists only inside one partition: both partitions have an offset 0", () => {
  const log = small();
  const first = log.append("k0", "first in time");
  const second = log.append("k1", "second in time");
  assert.strictEqual(first.offset, 0);
  assert.strictEqual(second.offset, 0);
  assert.notStrictEqual(first.partition, second.partition);
});

test("the same key always goes to the same partition, and its messages keep their order", () => {
  const log = createLog({ partitions: 4 });
  const results = ["created", "paid", "shipped"].map((v) => log.append("order-42", v));
  assert.ok(results.every((r) => r.partition === results[0].partition));
  assert.deepStrictEqual(results.map((r) => r.offset), [0, 1, 2]);
  assert.strictEqual(log.partitionOf("order-42"), results[0].partition);
});

test("many different keys use all the partitions", () => {
  const log = createLog({ partitions: 4 });
  const used = new Set();
  for (let i = 0; i < 100; i++) used.add(log.append("order-" + i, "x").partition);
  assert.strictEqual(used.size, 4);
});

test("read starts at the group's saved position, which is 0 at first, and does not move it", () => {
  const log = small();
  ["a", "b", "c"].forEach((v, i) => log.append("k" + i * 2, v));   // all in partition 0
  const first = log.read("email", 0);
  assert.deepStrictEqual(first.map((m) => m.value), ["a", "b", "c"]);
  assert.deepStrictEqual(first[1], { partition: 0, offset: 1, key: "k2", value: "b" });
  assert.deepStrictEqual(log.read("email", 0).map((m) => m.value), ["a", "b", "c"]);
  assert.strictEqual(log.position("email", 0), 0);
});

test("read respects max", () => {
  const log = small();
  ["a", "b", "c"].forEach((v, i) => log.append("k" + i * 2, v));
  assert.deepStrictEqual(log.read("email", 0, 2).map((m) => m.value), ["a", "b"]);
});

test("commit moves the saved position, so the next read starts there", () => {
  const log = small();
  ["a", "b", "c"].forEach((v, i) => log.append("k" + i * 2, v));
  assert.strictEqual(log.commit("email", 0, 2), true);
  assert.strictEqual(log.position("email", 0), 2);
  assert.deepStrictEqual(log.read("email", 0).map((m) => m.value), ["c"]);
});

test("each group keeps its own position", () => {
  const log = small();
  ["a", "b", "c", "d"].forEach((v, i) => log.append("k" + i * 2, v));
  log.commit("email", 0, 3);
  assert.strictEqual(log.position("email", 0), 3);
  assert.strictEqual(log.position("analytics", 0), 0);
  assert.deepStrictEqual(log.read("analytics", 0).map((m) => m.value), ["a", "b", "c", "d"]);
  assert.deepStrictEqual(log.read("email", 0).map((m) => m.value), ["d"]);
});

test("a position is saved for each partition separately", () => {
  const log = small();
  log.append("k0", "a");
  log.append("k1", "b");
  log.commit("email", 0, 1);
  assert.strictEqual(log.position("email", 0), 1);
  assert.strictEqual(log.position("email", 1), 0);
});

test("reading and committing deletes nothing", () => {
  const log = small();
  ["a", "b"].forEach((v, i) => log.append("k" + i * 2, v));
  log.commit("email", 0, 2);
  assert.strictEqual(log.size(0), 2);
  assert.deepStrictEqual(log.read("late-reader", 0).map((m) => m.value), ["a", "b"]);
});

test("replay: commit an earlier offset and read the old messages again", () => {
  const log = small();
  ["a", "b", "c"].forEach((v, i) => log.append("k" + i * 2, v));
  log.commit("analytics", 0, 3);
  assert.deepStrictEqual(log.read("analytics", 0), []);
  log.commit("analytics", 0, 0);
  assert.deepStrictEqual(log.read("analytics", 0).map((m) => m.value), ["a", "b", "c"]);
});

test("a crash before the commit means the same messages come again", () => {
  const log = small();
  ["a", "b"].forEach((v, i) => log.append("k" + i * 2, v));
  const handled = [];
  log.read("email", 0).forEach((m) => handled.push(m.value));   // handled, then the worker crashes before commit
  log.read("email", 0).forEach((m) => handled.push(m.value));   // after the restart the same messages return
  assert.deepStrictEqual(handled, ["a", "b", "a", "b"]);
});

test("commit refuses an offset below 0 or above the size, and keeps the old position", () => {
  const log = small();
  log.append("k0", "a");
  log.commit("email", 0, 1);
  assert.strictEqual(log.commit("email", 0, 5), false);
  assert.strictEqual(log.commit("email", 0, -1), false);
  assert.strictEqual(log.position("email", 0), 1);
});

test("reading an empty partition gives an empty array", () => {
  assert.deepStrictEqual(small().read("email", 1), []);
});

test("lag is the number of messages a group has not committed past, over all partitions", () => {
  const log = small();
  ["k0", "k2", "k4", "k1", "k3"].forEach((k) => log.append(k, k));   // 3 in partition 0, 2 in partition 1
  assert.strictEqual(log.lag("email"), 5);
  log.commit("email", 0, 3);
  log.commit("email", 1, 1);
  assert.strictEqual(log.lag("email"), 1);
  assert.strictEqual(log.lag("analytics"), 5);
});

test("assign gives each partition to one member, round robin", () => {
  assert.deepStrictEqual(assign(4, ["m1", "m2"]), { m1: [0, 2], m2: [1, 3] });
  assert.deepStrictEqual(assign(3, ["only"]), { only: [0, 1, 2] });
});

test("assign: a member beyond the number of partitions gets nothing", () => {
  assert.deepStrictEqual(assign(2, ["a", "b", "c"]), { a: [0], b: [1], c: [] });
});

test("assign with no members gives nobody a partition", () => {
  assert.deepStrictEqual(assign(3, []), {});
});
