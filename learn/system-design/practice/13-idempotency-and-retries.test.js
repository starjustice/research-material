const test = require("node:test");
const assert = require("node:assert");
const { createKeyStore, shouldRetry } = require("./13-idempotency-and-retries");

const pay = { amount: 100000, to: "store-7" };
const paid = { status: 201, body: { paymentId: "pay_1" } };

// ---- Part 1: the key store ----

test("a new key answers run", () => {
  const store = createKeyStore();
  assert.deepStrictEqual(store.start("k-41", pay), { action: "run" });
});

test("a missing key is rejected with 400", () => {
  const store = createKeyStore();
  assert.deepStrictEqual(store.start(undefined, pay), { action: "reject", status: 400 });
  assert.deepStrictEqual(store.start("", pay), { action: "reject", status: 400 });
});

test("the same key while the first is still running answers wait with 409", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  assert.deepStrictEqual(store.start("k-41", pay), { action: "wait", status: 409 });
});

test("the same key after finish replays the saved answer", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  store.finish("k-41", paid);
  assert.deepStrictEqual(store.start("k-41", pay), { action: "replay", response: paid });
});

test("every repeat gets the same saved answer, never run again", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  store.finish("k-41", paid);
  for (let i = 0; i < 3; i++) {
    assert.deepStrictEqual(store.start("k-41", { amount: 100000, to: "store-7" }), { action: "replay", response: paid });
  }
});

test("a different key with the same body is a new request and runs", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  store.finish("k-41", paid);
  assert.deepStrictEqual(store.start("k-42", pay), { action: "run" });
});

test("the same key with a different body is rejected with 422", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  store.finish("k-41", paid);
  assert.deepStrictEqual(store.start("k-41", { amount: 200000, to: "store-7" }), { action: "reject", status: 422 });
});

test("a different body is 422 even while the first is still running", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  assert.deepStrictEqual(store.start("k-41", { amount: 200000, to: "store-7" }), { action: "reject", status: 422 });
});

test("an error answer is saved and replayed too", () => {
  const store = createKeyStore();
  const failed = { status: 500, body: { error: "card network down" } };
  store.start("k-41", pay);
  store.finish("k-41", failed);
  assert.deepStrictEqual(store.start("k-41", pay), { action: "replay", response: failed });
});

test("forget removes the key, so the next try runs again", () => {
  const store = createKeyStore();
  store.start("k-41", pay);
  store.forget("k-41");
  assert.deepStrictEqual(store.start("k-41", pay), { action: "run" });
});

test("removeOld removes keys that are 24 hours old or more and returns how many", () => {
  const store = createKeyStore();
  store.start("k-old", pay, 0);
  store.finish("k-old", paid);
  store.start("k-new", pay, 10);
  store.finish("k-new", paid);
  assert.strictEqual(store.removeOld(24), 1);
  assert.deepStrictEqual(store.start("k-old", pay, 24), { action: "run" });
  assert.deepStrictEqual(store.start("k-new", pay, 24), { action: "replay", response: paid });
});

test("removeOld uses keepHours", () => {
  const store = createKeyStore({ keepHours: 48 });
  store.start("k-41", pay, 0);
  store.finish("k-41", paid);
  assert.strictEqual(store.removeOld(47), 0);
  assert.strictEqual(store.removeOld(48), 1);
});

// ---- Part 2: should the client try again? ----

test("a POST without a key is never retried, even after a timeout", () => {
  assert.strictEqual(shouldRetry({ method: "POST", status: "timeout" }), false);
  assert.strictEqual(shouldRetry({ method: "PATCH", status: 503 }), false);
});

test("a POST with a key is retried after a timeout or a 5xx", () => {
  assert.strictEqual(shouldRetry({ method: "POST", status: "timeout", hasKey: true }), true);
  assert.strictEqual(shouldRetry({ method: "POST", status: 500, hasKey: true }), true);
  assert.strictEqual(shouldRetry({ method: "POST", status: 503, hasKey: true }), true);
});

test("GET, PUT and DELETE are safe to repeat without a key", () => {
  assert.strictEqual(shouldRetry({ method: "GET", status: "timeout" }), true);
  assert.strictEqual(shouldRetry({ method: "PUT", status: 502 }), true);
  assert.strictEqual(shouldRetry({ method: "DELETE", status: 504 }), true);
});

test("4xx answers are not retried, even with a key", () => {
  for (const status of [400, 401, 403, 404, 422]) {
    assert.strictEqual(shouldRetry({ method: "POST", status, hasKey: true }), false, "status " + status);
  }
});

test("409 and 429 mean ask again later", () => {
  assert.strictEqual(shouldRetry({ method: "POST", status: 409, hasKey: true }), true);
  assert.strictEqual(shouldRetry({ method: "GET", status: 429 }), true);
});

test("a 2xx answer is never retried", () => {
  assert.strictEqual(shouldRetry({ method: "GET", status: 200 }), false);
  assert.strictEqual(shouldRetry({ method: "POST", status: 201, hasKey: true }), false);
});
