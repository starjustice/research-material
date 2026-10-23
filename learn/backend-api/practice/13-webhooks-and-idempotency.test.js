const test = require("node:test");
const assert = require("node:assert");
const { createHmac } = require("node:crypto");
const {
  sign, verifySignature, createWebhookReceiver, applyRefund, withIdempotencyKey, statuses,
} = require("./13-webhooks-and-idempotency");

const SECRET = "whsec_test";
// The tests make their own codes, so a wrong sign() cannot hide a wrong verifySignature().
const mac = (t, body, secret = SECRET) => createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
const body = '{"id":"evt_1","type":"order.shipped"}';

// ---- Task 1: sign ----

test("sign: the value from the lesson", () => {
  assert.strictEqual(sign(SECRET, 1000, body), "0d6ad67886695b09bcdf96b5fce4b65694bd16faa4e6ae9c0daed287c1c2ab6a");
});

test("sign: a string and a Buffer of the same text give the same code", () => {
  const fromString = sign(SECRET, 1000, body);
  assert.match(fromString, /^[0-9a-f]{64}$/, "64 lower-case hex letters");
  assert.strictEqual(sign(SECRET, 1000, Buffer.from(body)), fromString);
});

test("sign: the time and the secret are part of the code", () => {
  assert.notStrictEqual(sign(SECRET, 1001, body), sign(SECRET, 1000, body));
  assert.notStrictEqual(sign("other", 1000, body), sign(SECRET, 1000, body));
});

// ---- Task 2: verifySignature ----

const check = (header, rawBody = body, nowSec = 1010, extra = {}) => verifySignature({ secret: SECRET, header, rawBody, nowSec, ...extra });

test("verifySignature: a good message passes", () => {
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`), true);
});

test("verifySignature: a Buffer body passes too", () => {
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, Buffer.from(body)), true);
});

test("verifySignature: a changed body fails", () => {
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, body.replace("shipped", "paid")), false);
});

test("verifySignature: the same JSON with different spaces fails (the raw bytes matter)", () => {
  const spaced = '{ "id": "evt_1", "type": "order.shipped" }';
  assert.strictEqual(check(`t=1000,v1=${mac(1000, spaced)}`, JSON.stringify(JSON.parse(spaced))), false);
  assert.strictEqual(check(`t=1000,v1=${mac(1000, spaced)}`, spaced), true);
});

test("verifySignature: a wrong secret fails", () => {
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body, "other")}`), false);
});

test("verifySignature: an old message fails, and so does one from the future", () => {
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, body, 1300), true, "300 s is still inside the limit");
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, body, 1301), false, "301 s is too old");
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, body, 600), false, "400 s in the future is too far");
});

test("verifySignature: the tolerance can be changed", () => {
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, body, 1100, { toleranceSec: 60 }), false);
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, body, 1100, { toleranceSec: 120 }), true);
});

test("verifySignature: several v1 values, and other schemes are ignored", () => {
  const good = mac(1000, body);
  assert.strictEqual(check(`t=1000,v1=${"0".repeat(64)},v1=${good}`), true, "any one v1 may match");
  assert.strictEqual(check(`t=1000,v0=${good}`), false, "v0 is not a scheme we accept");
  assert.strictEqual(check(`t=1000, v1=${good}`), true, "a space after the comma is fine");
});

test("verifySignature: it never throws, whatever it gets", () => {
  const bad = [undefined, null, "", "garbage", "t=abc,v1=zz", "t=1000", "t=1000,v1=", "t=1000,v1=abc", 42, {}];
  for (const header of bad) assert.strictEqual(check(header), false, `header ${JSON.stringify(header)}`);
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, null), false);
  assert.strictEqual(check(`t=1000,v1=${mac(1000, body)}`, 42), false);
});

// ---- Task 3: createWebhookReceiver ----

function makeStore() {
  const ids = new Set();
  return { ids, insertIfNew(id) { if (ids.has(id)) return false; ids.add(id); return true; }, remove(id) { ids.delete(id); } };
}
function makeQueue() {
  const q = { jobs: [], down: false, add(e) { if (q.down) throw new Error("redis is down"); q.jobs.push(e); } };
  return q;
}
function setup() {
  const store = makeStore(), queue = makeQueue();
  const r = createWebhookReceiver({ secret: SECRET, store, queue });
  const send = (b, t = 1000, now = 1010, sig) => r.receive({
    headers: { "x-signature": sig ?? `t=${t},v1=${mac(t, b)}` }, rawBody: b, nowSec: now,
  });
  return { store, queue, send, r };
}

test("receiver: a new event is saved, queued, and answered with 200", async () => {
  const { store, queue, send } = setup();
  assert.deepStrictEqual(await send(body), { status: 200 });
  assert.deepStrictEqual(queue.jobs, [{ id: "evt_1", type: "order.shipped" }]);
  assert.ok(store.ids.has("evt_1"));
});

test("receiver: a retry gets 200 and queues nothing more", async () => {
  const { queue, send } = setup();
  await send(body);
  assert.deepStrictEqual(await send(body), { status: 200 });
  assert.strictEqual(queue.jobs.length, 1);
});

test("receiver: two copies at the same moment queue one job", async () => {
  const { queue, send } = setup();
  const results = await Promise.all([send(body), send(body)]);
  assert.deepStrictEqual(results, [{ status: 200 }, { status: 200 }]);
  assert.strictEqual(queue.jobs.length, 1);
});

test("receiver: a different event id is a different event", async () => {
  const { queue, send } = setup();
  await send(body);
  await send('{"id":"evt_2","type":"order.shipped"}');
  assert.deepStrictEqual(queue.jobs.map((j) => j.id), ["evt_1", "evt_2"]);
});

test("receiver: a wrong signature gets 400, and nothing is saved or queued", async () => {
  const { store, queue, send } = setup();
  assert.deepStrictEqual(await send(body, 1000, 1010, `t=1000,v1=${"0".repeat(64)}`), { status: 400 });
  assert.strictEqual(queue.jobs.length, 0);
  assert.strictEqual(store.ids.size, 0);
});

test("receiver: a missing header gets 400", async () => {
  const { queue, r } = setup();
  assert.deepStrictEqual(await r.receive({ headers: {}, rawBody: body, nowSec: 1010 }), { status: 400 });
  assert.strictEqual(queue.jobs.length, 0);
});

test("receiver: a correct signature on an old message gets 400", async () => {
  const { queue, send } = setup();
  assert.deepStrictEqual(await send(body, 1000, 5000), { status: 400 });
  assert.strictEqual(queue.jobs.length, 0);
});

test("receiver: a body that is not JSON, or has no string id, gets 400 (even if signed)", async () => {
  const { queue, send } = setup();
  assert.deepStrictEqual(await send("not json"), { status: 400 });
  assert.deepStrictEqual(await send('{"type":"order.shipped"}'), { status: 400 });
  assert.deepStrictEqual(await send('{"id":42}'), { status: 400 });
  assert.deepStrictEqual(await send("null"), { status: 400 });
  assert.strictEqual(queue.jobs.length, 0);
});

test("receiver: a Buffer body works", async () => {
  const { queue, r } = setup();
  const res = await r.receive({ headers: { "x-signature": `t=1000,v1=${mac(1000, body)}` }, rawBody: Buffer.from(body), nowSec: 1010 });
  assert.deepStrictEqual(res, { status: 200 });
  assert.strictEqual(queue.jobs.length, 1);
});

test("receiver: if the queue is down, answer 500 and forget the id, so the retry is processed", async () => {
  const { store, queue, send } = setup();
  queue.down = true;
  assert.deepStrictEqual(await send(body), { status: 500 });
  assert.ok(!store.ids.has("evt_1"), "the id must be removed, or the retry would look like a repeat");
  queue.down = false;
  assert.deepStrictEqual(await send(body), { status: 200 });
  assert.strictEqual(queue.jobs.length, 1, "the retry is processed");
});

// ---- Task 4: applyRefund ----

test("applyRefund: the same event twice adds the points once", () => {
  const state = { points: 100, applied: new Set() };
  assert.strictEqual(applyRefund(state, { id: "evt_1", points: 50 }), true);
  assert.strictEqual(applyRefund(state, { id: "evt_1", points: 50 }), false);
  assert.strictEqual(state.points, 150);
});

test("applyRefund: different events both apply", () => {
  const state = { points: 0, applied: new Set() };
  applyRefund(state, { id: "a", points: 10 });
  applyRefund(state, { id: "b", points: 20 });
  assert.strictEqual(state.points, 30);
  assert.deepStrictEqual([...state.applied].sort(), ["a", "b"]);
});

// ---- Task 5: withIdempotencyKey ----

test("idempotency key: the first request runs the handler, a retry gets the saved answer", () => {
  const store = new Map();
  let runs = 0;
  const handler = () => { runs++; return { status: 201, body: { id: runs } }; };
  const first = withIdempotencyKey(store, "K1", '{"amount":50}', handler);
  const retry = withIdempotencyKey(store, "K1", '{"amount":50}', handler);
  assert.deepStrictEqual(first, { status: 201, body: { id: 1 }, replayed: false });
  assert.deepStrictEqual(retry, { status: 201, body: { id: 1 }, replayed: true });
  assert.strictEqual(runs, 1, "the handler must run once");
});

test("idempotency key: the same key with a different body is refused", () => {
  const store = new Map();
  let runs = 0;
  const handler = () => { runs++; return { status: 201, body: { ok: true } }; };
  withIdempotencyKey(store, "K1", '{"amount":50}', handler);
  const other = withIdempotencyKey(store, "K1", '{"amount":9999}', handler);
  assert.strictEqual(other.status, 422);
  assert.strictEqual(other.replayed, false);
  assert.strictEqual(runs, 1);
});

test("idempotency key: different keys are different actions", () => {
  const store = new Map();
  let runs = 0;
  const handler = () => { runs++; return { status: 201, body: { n: runs } }; };
  withIdempotencyKey(store, "K1", "x", handler);
  const second = withIdempotencyKey(store, "K2", "x", handler);
  assert.strictEqual(second.body.n, 2);
  assert.strictEqual(runs, 2);
});

test("idempotency key: with no key, nothing is saved and the handler runs every time", () => {
  const store = new Map();
  let runs = 0;
  const handler = () => { runs++; return { status: 200, body: {} }; };
  withIdempotencyKey(store, undefined, "x", handler);
  withIdempotencyKey(store, "", "x", handler);
  assert.strictEqual(runs, 2);
  assert.strictEqual(store.size, 0);
});

test("idempotency key: an error answer is saved too, like Stripe does", () => {
  const store = new Map();
  let runs = 0;
  const handler = () => { runs++; return { status: 500, body: { title: "boom" } }; };
  withIdempotencyKey(store, "K1", "x", handler);
  const retry = withIdempotencyKey(store, "K1", "x", handler);
  assert.deepStrictEqual(retry, { status: 500, body: { title: "boom" }, replayed: true });
  assert.strictEqual(runs, 1);
});

// ---- Task 6: statuses ----

test("statuses: the right status for each case", () => {
  assert.ok([400, 401, 403].includes(statuses.badSignature), "a wrong signature is refused with 400, 401 or 403");
  assert.strictEqual(statuses.firstDelivery, 200);
  assert.strictEqual(statuses.duplicateDelivery, 200);
  assert.strictEqual(statuses.ourDatabaseIsDown, 500);
  assert.strictEqual(statuses.eventTypeWeDoNotUse, 200);
});
