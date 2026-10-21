const test = require("node:test");
const assert = require("node:assert");
const { createNotifier } = require("./11-design-a-notification-system");

// A fake provider. It answers with the codes you give it, one per call, then 200 for ever.
// It also keeps every job it was asked to send, so a test can count real sends.
function provider(...codes) {
  const calls = [];
  const send = (job) => {
    calls.push(job.key);
    return codes.length ? codes.shift() : 200;
  };
  return { calls, send };
}

function setup(options) {
  const n = createNotifier(options);
  n.addToken("sari", "tA");
  return n;
}

const approved = { eventId: "evt77", userId: "sari", text: "Your loan L-42 is approved", hour: 14 };

// ---- Checks before anything is queued ----

test("by default a notification goes to push and email, not SMS", () => {
  const n = setup();
  const r = n.notify(approved);
  assert.deepStrictEqual(r.queued, ["evt77:sari:push:tA", "evt77:sari:email:sari"]);
  assert.deepStrictEqual(r.held, []);
  assert.deepStrictEqual(r.skipped, [{ channel: "sms", reason: "off" }]);
  assert.strictEqual(n.queueLength("push"), 1);
  assert.strictEqual(n.queueLength("email"), 1);
  assert.strictEqual(n.queueLength("sms"), 0);
});

test("push makes one job for each device token", () => {
  const n = setup();
  n.addToken("sari", "tB");
  const r = n.notify(approved);
  assert.deepStrictEqual(r.queued, ["evt77:sari:push:tA", "evt77:sari:push:tB", "evt77:sari:email:sari"]);
  assert.strictEqual(n.queueLength("push"), 2);
});

test("a channel the user turned off is skipped", () => {
  const n = setup();
  n.setPrefs("sari", { channels: ["push"] });
  const r = n.notify(approved);
  assert.deepStrictEqual(r.queued, ["evt77:sari:push:tA"]);
  assert.deepStrictEqual(r.skipped, [{ channel: "email", reason: "off" }, { channel: "sms", reason: "off" }]);
});

test("push with no device token is skipped as no device", () => {
  const n = createNotifier();
  const r = n.notify({ eventId: "e1", userId: "budi", text: "hi", hour: 14 });
  assert.deepStrictEqual(r.queued, ["e1:budi:email:budi"]);
  assert.deepStrictEqual(r.skipped, [{ channel: "push", reason: "no device" }, { channel: "sms", reason: "off" }]);
});

test("the event can name its own channels", () => {
  const n = setup();
  const r = n.notify({ ...approved, channels: ["email"] });
  assert.deepStrictEqual(r.queued, ["evt77:sari:email:sari"]);
  assert.deepStrictEqual(r.skipped, []);
});

// ---- The dedupe key ----

test("the same event for the same user is queued only once", () => {
  const n = setup();
  n.notify(approved);
  const again = n.notify(approved);
  assert.deepStrictEqual(again.queued, []);
  assert.deepStrictEqual(again.skipped, [
    { channel: "push", reason: "duplicate" },
    { channel: "email", reason: "duplicate" },
    { channel: "sms", reason: "off" },
  ]);
  assert.strictEqual(n.queueLength("push"), 1);
  assert.strictEqual(n.queueLength("email"), 1);
});

test("a different event for the same user is a new notification", () => {
  const n = setup();
  n.notify(approved);
  const r = n.notify({ ...approved, eventId: "evt78" });
  assert.deepStrictEqual(r.queued, ["evt78:sari:push:tA", "evt78:sari:email:sari"]);
});

test("the queue hands the same job over again after a lost ack: the worker skips it", () => {
  const n = setup();
  n.notify({ ...approved, channels: ["email"] });
  const p = provider();
  const first = n.work("email", p.send);
  assert.strictEqual(first.result, "sent");
  n.redeliver(first.job);                                  // at least once: the job comes back
  const second = n.work("email", p.send);
  assert.strictEqual(second.result, "duplicate");
  assert.deepStrictEqual(p.calls, ["evt77:sari:email:sari"]);   // the provider was called once
});

// ---- Quiet hours ----

test("in quiet hours push and SMS are held, email goes now", () => {
  const n = setup();
  n.setPrefs("sari", { channels: ["push", "email", "sms"], quietStart: 22, quietEnd: 7 });
  const r = n.notify({ ...approved, hour: 23 });
  assert.deepStrictEqual(r.queued, ["evt77:sari:email:sari"]);
  assert.deepStrictEqual(r.held, ["evt77:sari:push:tA", "evt77:sari:sms:sari"]);
  assert.strictEqual(n.status("evt77:sari:push:tA"), "held");
  assert.strictEqual(n.queueLength("push"), 0);
});

test("quiet hours can cross midnight", () => {
  const n = setup();
  n.setPrefs("sari", { channels: ["push"], quietStart: 22, quietEnd: 7 });
  const at = (eventId, hour) => n.notify({ ...approved, eventId, hour });
  assert.deepStrictEqual(at("a", 3).held.length, 1);       // 3 am is quiet
  assert.deepStrictEqual(at("b", 22).held.length, 1);      // 10 pm is quiet
  assert.deepStrictEqual(at("c", 7).queued.length, 1);     // 7 am is not
  assert.deepStrictEqual(at("d", 21).queued.length, 1);    // 9 pm is not
});

test("release moves held jobs into their queues", () => {
  const n = setup();
  n.setPrefs("sari", { channels: ["push"], quietStart: 22, quietEnd: 7 });
  n.notify({ ...approved, hour: 23 });
  n.release();
  assert.strictEqual(n.queueLength("push"), 1);
  assert.strictEqual(n.status("evt77:sari:push:tA"), "queued");
});

// ---- Priority and limits ----

test("urgent ignores quiet hours and channel choices, like an OTP", () => {
  const n = setup();
  n.setPrefs("sari", { channels: ["push"], quietStart: 22, quietEnd: 7 });
  const r = n.notify({ eventId: "otp1", userId: "sari", text: "Code 4821", hour: 23, priority: "urgent", channels: ["sms"] });
  assert.deepStrictEqual(r.queued, ["otp1:sari:sms:sari"]);
  assert.deepStrictEqual(r.held, []);
});

test("an urgent job jumps ahead of bulk jobs in the same queue", () => {
  const n = createNotifier();
  for (const u of ["u1", "u2", "u3"]) n.notify({ eventId: "promo", userId: u, text: "New rates", hour: 14, priority: "bulk", channels: ["email"] });
  n.notify({ eventId: "otp1", userId: "sari", text: "Code 4821", hour: 14, priority: "urgent", channels: ["email"] });
  const p = provider();
  assert.strictEqual(n.work("email", p.send).job.key, "otp1:sari:email:sari");
  assert.strictEqual(n.work("email", p.send).job.key, "promo:u1:email:u1");
});

test("normal jobs go before bulk jobs", () => {
  const n = createNotifier();
  n.notify({ eventId: "promo", userId: "u1", text: "New rates", hour: 14, priority: "bulk", channels: ["email"] });
  n.notify({ eventId: "evt77", userId: "sari", text: "Approved", hour: 14, channels: ["email"] });
  assert.strictEqual(n.work("email", provider().send).job.key, "evt77:sari:email:sari");
});

test("bulk has a daily limit per user, other priorities do not", () => {
  const n = createNotifier({ bulkPerDay: 2 });
  const bulk = (eventId, userId) => n.notify({ eventId, userId, text: "promo", hour: 14, priority: "bulk", channels: ["email"] });
  assert.strictEqual(bulk("p1", "sari").queued.length, 1);
  assert.strictEqual(bulk("p2", "sari").queued.length, 1);
  assert.deepStrictEqual(bulk("p3", "sari").skipped, [{ channel: "email", reason: "limit" }]);
  assert.strictEqual(bulk("p3", "budi").queued.length, 1);   // the limit is per user
  const normal = n.notify({ eventId: "evt77", userId: "sari", text: "Approved", hour: 14, channels: ["email"] });
  assert.strictEqual(normal.queued.length, 1);
});

// ---- The worker and the provider's answer ----

test("work on an empty queue returns null", () => {
  const n = setup();
  assert.strictEqual(n.work("push", provider().send), null);
});

test("200 means sent", () => {
  const n = setup();
  n.notify(approved);
  const p = provider(200);
  const r = n.work("push", p.send);
  assert.strictEqual(r.result, "sent");
  assert.strictEqual(r.job.to, "tA");
  assert.strictEqual(r.job.text, "Your loan L-42 is approved");
  assert.strictEqual(n.status("evt77:sari:push:tA"), "sent");
  assert.strictEqual(n.queueLength("push"), 0);
});

test("503 is a short problem: the job goes back with a wait that doubles", () => {
  const n = setup();
  n.notify(approved);
  const p = provider(503, 503);
  const a = n.work("push", p.send);
  assert.deepStrictEqual([a.result, a.job.tries, a.job.waitMs], ["retry", 1, 1000]);
  assert.strictEqual(n.queueLength("push"), 1);
  const b = n.work("push", p.send);
  assert.deepStrictEqual([b.result, b.job.tries, b.job.waitMs], ["retry", 2, 2000]);
  const c = n.work("push", p.send);
  assert.strictEqual(c.result, "sent");
  assert.strictEqual(n.status("evt77:sari:push:tA"), "sent");
});

test("429 and 500 are retried too", () => {
  const n = setup();
  n.notify(approved);
  const p = provider(429, 500);
  assert.strictEqual(n.work("push", p.send).result, "retry");
  assert.strictEqual(n.work("push", p.send).result, "retry");
  assert.strictEqual(n.work("push", p.send).result, "sent");
});

test("a retried job goes to the back, so other jobs are not blocked", () => {
  const n = setup();
  n.notify(approved);
  n.notify({ eventId: "e2", userId: "budi", text: "hi", hour: 14, channels: ["email"] });
  n.notify({ ...approved, eventId: "e3", channels: ["email"] });
  const p = provider(503);
  assert.strictEqual(n.work("email", p.send).result, "retry");          // evt77 for sari fails
  assert.strictEqual(n.work("email", p.send).job.key, "e2:budi:email:budi");
});

test("after maxTries short problems the job goes to the dead letters", () => {
  const n = setup();
  n.notify(approved);
  const p = provider(503, 503, 503);
  n.work("push", p.send);
  n.work("push", p.send);
  const last = n.work("push", p.send);
  assert.strictEqual(last.result, "dead");
  assert.strictEqual(n.status("evt77:sari:push:tA"), "failed");
  assert.deepStrictEqual(n.deadLetters().map((j) => [j.key, j.tries, j.reason]), [["evt77:sari:push:tA", 3, 503]]);
  assert.strictEqual(n.queueLength("push"), 0);
});

test("maxTries can be changed", () => {
  const n = setup({ maxTries: 1 });
  n.notify(approved);
  assert.strictEqual(n.work("push", provider(503).send).result, "dead");
});

test("410 or 404 means the token is dead: remove it and do not retry", () => {
  const n = setup();
  n.addToken("sari", "tB");
  n.notify(approved);
  const p = provider(410, 404);
  assert.strictEqual(n.work("push", p.send).result, "token removed");
  assert.strictEqual(n.work("push", p.send).result, "token removed");
  assert.deepStrictEqual(n.tokensOf("sari"), []);
  assert.strictEqual(n.status("evt77:sari:push:tA"), "failed");
  assert.strictEqual(n.queueLength("push"), 0);
  assert.deepStrictEqual(n.deadLetters(), []);
});

test("400 is a bug in the request: straight to the dead letters, no retry", () => {
  const n = setup();
  n.notify(approved);
  const p = provider(400);
  const r = n.work("push", p.send);
  assert.strictEqual(r.result, "dead");
  assert.strictEqual(r.job.tries, 1);
  assert.deepStrictEqual(n.deadLetters().map((j) => j.reason), [400]);
  assert.deepStrictEqual(p.calls.length, 1);
});
