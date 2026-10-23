const test = require("node:test");
const assert = require("node:assert");
const { createQueue } = require("./06-message-queues");

test("push returns ids 1, 2, 3 and length counts the waiting jobs", () => {
  const q = createQueue();
  assert.strictEqual(q.push("a"), 1);
  assert.strictEqual(q.push("b"), 2);
  assert.strictEqual(q.push("c"), 3);
  assert.strictEqual(q.length(), 3);
});

test("take gives jobs in the order they were pushed", () => {
  const q = createQueue();
  q.push("a");
  q.push("b");
  assert.deepStrictEqual(q.take(), { id: 1, payload: "a", tries: 1 });
  assert.deepStrictEqual(q.take(), { id: 2, payload: "b", tries: 1 });
});

test("take on an empty line returns null", () => {
  const q = createQueue();
  assert.strictEqual(q.take(), null);
});

test("a taken job is hidden: not waiting, and another take cannot get it", () => {
  const q = createQueue();
  q.push("a");
  q.take();
  assert.strictEqual(q.length(), 0);
  assert.strictEqual(q.heldCount(), 1);
  assert.strictEqual(q.take(), null);
});

test("ack deletes the job for good", () => {
  const q = createQueue();
  const id = q.push("a");
  q.take();
  assert.strictEqual(q.ack(id), true);
  assert.strictEqual(q.heldCount(), 0);
  assert.strictEqual(q.length(), 0);
  assert.strictEqual(q.take(), null);
});

test("ack of an unknown id or a second ack returns false", () => {
  const q = createQueue();
  const id = q.push("a");
  q.take();
  assert.strictEqual(q.ack(99), false);
  assert.strictEqual(q.ack(id), true);
  assert.strictEqual(q.ack(id), false);
});

test("a job that is still waiting cannot be acked", () => {
  const q = createQueue();
  const id = q.push("a");
  assert.strictEqual(q.ack(id), false);
  assert.strictEqual(q.length(), 1);
});

test("fail with tries left sends the job to the end of the line and counts the try", () => {
  const q = createQueue({ maxTries: 3 });
  q.push("a");
  q.push("b");
  const first = q.take();
  assert.strictEqual(q.fail(first.id), "retry");
  assert.strictEqual(q.heldCount(), 0);
  assert.strictEqual(q.length(), 2);
  assert.strictEqual(q.take().payload, "b");
  assert.deepStrictEqual(q.take(), { id: 1, payload: "a", tries: 2 });
});

test("at least once: a job that was taken and never acked runs again", () => {
  const q = createQueue();
  const seen = [];
  q.push("send receipt 71");
  const job = q.take();
  seen.push(job.payload);          // the worker did the work, then crashed before the ack
  q.fail(job.id);                  // the timer ends: the queue shows the job again
  seen.push(q.take().payload);     // another worker takes it
  assert.deepStrictEqual(seen, ["send receipt 71", "send receipt 71"]);
});

test("a job that fails maxTries times goes to the dead letters and never returns", () => {
  const q = createQueue({ maxTries: 3 });
  q.push("bad");
  assert.strictEqual(q.fail(q.take().id), "retry");
  assert.strictEqual(q.fail(q.take().id), "retry");
  assert.strictEqual(q.fail(q.take().id), "dead");
  assert.strictEqual(q.length(), 0);
  assert.strictEqual(q.heldCount(), 0);
  assert.strictEqual(q.take(), null);
  assert.deepStrictEqual(q.deadLetters(), [{ id: 1, payload: "bad", tries: 3 }]);
});

test("the default is 3 tries", () => {
  const q = createQueue();
  q.push("bad");
  q.fail(q.take().id);
  q.fail(q.take().id);
  assert.strictEqual(q.fail(q.take().id), "dead");
});

test("a bad job does not block the good jobs", () => {
  const q = createQueue({ maxTries: 2 });
  q.push("bad");
  q.push("good 1");
  q.push("good 2");
  const done = [];
  for (let job = q.take(); job; job = q.take()) {
    if (job.payload === "bad") q.fail(job.id);
    else { done.push(job.payload); q.ack(job.id); }
  }
  assert.deepStrictEqual(done, ["good 1", "good 2"]);
  assert.deepStrictEqual(q.deadLetters().map((j) => j.payload), ["bad"]);
  assert.strictEqual(q.length(), 0);
});

test("fail of an id that is not hidden returns false and changes nothing", () => {
  const q = createQueue();
  q.push("a");
  assert.strictEqual(q.fail(1), false);
  assert.strictEqual(q.fail(42), false);
  assert.strictEqual(q.length(), 1);
  assert.deepStrictEqual(q.deadLetters(), []);
});

test("maxTries 1 parks a job after its first failure", () => {
  const q = createQueue({ maxTries: 1 });
  q.push("a");
  assert.strictEqual(q.fail(q.take().id), "dead");
  assert.strictEqual(q.deadLetters().length, 1);
});
