const test = require("node:test");
const assert = require("node:assert");
const { createDispatcher } = require("./11-design-a-notification-system");

const msg = (over = {}) => ({ user: "ana", event: "otp", channel: "sms", body: "Your code is 4821", ...over });
const later = () => new Promise((resolve) => setImmediate(resolve));   // lets other work run: a slow provider

test("a new message is sent once, on the first try", async () => {
  const calls = [];
  const d = createDispatcher({ send: async (m) => { calls.push(m.channel); } });
  const result = await d.dispatch(msg());
  assert.deepStrictEqual(result, { status: "sent", tries: 1, waits: [] });
  assert.deepStrictEqual(calls, ["sms"]);
});

test("the same message again is a duplicate and the provider is not called", async () => {
  let calls = 0;
  const d = createDispatcher({ send: async () => { calls++; } });
  await d.dispatch(msg());
  const second = await d.dispatch(msg());
  assert.deepStrictEqual(second, { status: "duplicate", tries: 0, waits: [] });
  assert.strictEqual(calls, 1);
});

test("the key is user + event + channel: another channel or another user is sent", async () => {
  const calls = [];
  const d = createDispatcher({ send: async (m) => { calls.push(m.user + ":" + m.event + ":" + m.channel); } });
  await d.dispatch(msg());
  await d.dispatch(msg({ channel: "email" }));
  await d.dispatch(msg({ user: "budi" }));
  await d.dispatch(msg({ event: "shipped" }));
  assert.deepStrictEqual(calls, ["ana:otp:sms", "ana:otp:email", "budi:otp:sms", "ana:shipped:sms"]);
});

test("a temporary error is retried, and the waits double: 100, 200", async () => {
  let n = 0;
  const slept = [];
  const d = createDispatcher({
    send: async () => { if (++n < 3) throw new Error("503 provider busy"); },
    sleep: async (ms) => { slept.push(ms); },
  });
  const result = await d.dispatch(msg());
  assert.deepStrictEqual(result, { status: "sent", tries: 3, waits: [100, 200] });
  assert.deepStrictEqual(slept, [100, 200]);
});

test("baseMs sets the first wait", async () => {
  let n = 0;
  const d = createDispatcher({ baseMs: 50, send: async () => { if (++n < 3) throw new Error("503"); } });
  const result = await d.dispatch(msg());
  assert.deepStrictEqual(result.waits, [50, 100]);
});

test("after maxTries temporary errors the message is a dead letter, with no wait after the last try", async () => {
  const d = createDispatcher({ maxTries: 3, send: async () => { throw new Error("503 provider busy"); } });
  const result = await d.dispatch(msg());
  assert.deepStrictEqual(result, { status: "dead", tries: 3, waits: [100, 200] });
  const dead = d.deadLetters();
  assert.strictEqual(dead.length, 1);
  assert.strictEqual(dead[0].msg.user, "ana");
  assert.strictEqual(dead[0].error, "503 provider busy");
  assert.strictEqual(dead[0].tries, 3);
});

test("a permanent error is not retried: it goes straight to the dead letters", async () => {
  let calls = 0;
  const d = createDispatcher({
    send: async () => { calls++; throw Object.assign(new Error("token is not registered"), { permanent: true }); },
  });
  const result = await d.dispatch(msg({ channel: "push" }));
  assert.deepStrictEqual(result, { status: "dead", tries: 1, waits: [] });
  assert.strictEqual(calls, 1);
  assert.strictEqual(d.deadLetters().length, 1);
});

test("a dead message can be replayed later, because it was never marked as sent", async () => {
  let providerUp = false;
  const d = createDispatcher({ maxTries: 2, send: async () => { if (!providerUp) throw new Error("503"); } });
  assert.strictEqual((await d.dispatch(msg())).status, "dead");
  providerUp = true;
  assert.strictEqual((await d.dispatch(msg())).status, "sent");
});

test("two copies at the same moment: the provider is called once", async () => {
  let calls = 0;
  const d = createDispatcher({ send: async () => { calls++; await later(); } });
  const [a, b] = await Promise.all([d.dispatch(msg()), d.dispatch(msg())]);
  assert.strictEqual(calls, 1);
  assert.deepStrictEqual([a.status, b.status].sort(), ["duplicate", "sent"]);
});

test("a sent message stays blocked: a later copy is still a duplicate", async () => {
  let calls = 0;
  const d = createDispatcher({ send: async () => { calls++; } });
  await d.dispatch(msg());
  await d.dispatch(msg());
  await d.dispatch(msg());
  assert.strictEqual(calls, 1);
});
