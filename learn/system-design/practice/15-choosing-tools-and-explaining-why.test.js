const test = require("node:test");
const assert = require("node:assert");
const { decide } = require("./15-choosing-tools-and-explaining-why");

const options = {
  Postgres: { team: 5, safety: 5, shape: 3, scale: 3, ops: 4 },
  Mongo: { team: 3, safety: 3, shape: 5, scale: 4, ops: 3 },
  Dynamo: { team: 2, safety: 3, shape: 2, scale: 5, ops: 5 },
};
const payments = { team: 3, safety: 5, shape: 1, scale: 1, ops: 2 };
const firehose = { team: 1, safety: 1, shape: 3, scale: 5, ops: 3 };

test("totals are the sum of weight times score", () => {
  assert.deepStrictEqual(decide(options, payments).totals, { Postgres: 54, Mongo: 39, Dynamo: 38 });
});

test("the biggest total wins and the second biggest is the runner-up", () => {
  const r = decide(options, payments);
  assert.strictEqual(r.winner, "Postgres");
  assert.strictEqual(r.runnerUp, "Mongo");
});

test("other needs give another winner", () => {
  const r = decide(options, firehose);
  assert.deepStrictEqual(r.totals, { Postgres: 46, Mongo: 50, Dynamo: 51 });
  assert.strictEqual(r.winner, "Dynamo");
  assert.strictEqual(r.runnerUp, "Mongo");
});

test("cost is the criterion where the runner-up is ahead by the most weighted points", () => {
  assert.deepStrictEqual(decide(options, payments).cost, { criterion: "shape", behind: 2, weighted: 2 });
  assert.deepStrictEqual(decide(options, firehose).cost, { criterion: "shape", behind: 3, weighted: 9 });
});

test("flip is the smallest new weight for the cost criterion that makes the runner-up win", () => {
  assert.deepStrictEqual(decide(options, payments).flip, { criterion: "shape", weight: 9 });
  const r = decide(options, { ...payments, shape: 8 });
  assert.strictEqual(r.winner, "Postgres");
  assert.strictEqual(decide(options, { ...payments, shape: 9 }).winner, "Mongo");
});

test("a tie goes to the tool listed first", () => {
  const two = { A: { x: 2 }, B: { x: 2 } };
  const r = decide(two, { x: 1 });
  assert.strictEqual(r.winner, "A");
  assert.strictEqual(r.runnerUp, "B");
  const flipped = decide({ B: two.B, A: two.A }, { x: 1 });
  assert.strictEqual(flipped.winner, "B");
});

test("when the runner-up is never ahead, cost and flip are null", () => {
  const r = decide({ A: { x: 5, y: 5 }, B: { x: 1, y: 2 } }, { x: 1, y: 1 });
  assert.strictEqual(r.winner, "A");
  assert.strictEqual(r.cost, null);
  assert.strictEqual(r.flip, null);
});

test("one tool alone has no runner-up, cost or flip", () => {
  const r = decide({ A: { x: 5 } }, { x: 2 });
  assert.deepStrictEqual(r, { winner: "A", runnerUp: null, totals: { A: 10 }, cost: null, flip: null });
});

test("flip is null when no weight up to +100 can flip the pick", () => {
  const r = decide({ A: { x: 5, y: 5 }, B: { x: 0, y: 5 } }, { x: 1, y: 1 });
  assert.strictEqual(r.winner, "A");
  assert.strictEqual(r.cost, null);
  const r2 = decide({ A: { x: 0, y: 5 }, B: { x: 1, y: 0 } }, { x: 1, y: 1000 });
  assert.strictEqual(r2.winner, "A");
  assert.deepStrictEqual(r2.cost, { criterion: "x", behind: 1, weighted: 1 });
  assert.strictEqual(r2.flip, null);
});

test("a criterion with weight 0 is ignored, and only weighted criteria count", () => {
  const r = decide(options, { team: 0, safety: 0, shape: 1 });
  assert.deepStrictEqual(r.totals, { Postgres: 3, Mongo: 5, Dynamo: 2 });
  assert.strictEqual(r.winner, "Mongo");
});

test("a missing score throws", () => {
  assert.throws(() => decide({ A: { x: 1 }, B: { y: 1 } }, { x: 1 }), Error);
});

test("it does not change what it was given", () => {
  const o = JSON.parse(JSON.stringify(options)), w = { ...payments };
  assert.strictEqual(decide(o, w).winner, "Postgres");
  assert.deepStrictEqual(o, options);
  assert.deepStrictEqual(w, payments);
});
