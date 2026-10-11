const test = require("node:test");
const assert = require("node:assert");
const { logOrder, sleep } = require("./11-event-loop");

test("logOrder: sync first, then the microtask, then the task", async () => {
  const calls = [];
  await logOrder(x => calls.push(x));
  assert.deepStrictEqual(calls, ["sync", "micro", "task"]);
});

test("sleep: waits at least the given time", async () => {
  const t0 = Date.now();
  await sleep(50);
  assert.ok(Date.now() - t0 >= 45, "it came back too early");
});

test("sleep: returns a promise", () => {
  const p = sleep(1);
  assert.ok(p && typeof p.then === "function", "sleep must return a promise");
  return p;
});
