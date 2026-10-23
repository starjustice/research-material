const test = require("node:test");
const assert = require("node:assert");
const { createHmac } = require("node:crypto");
const { createSessionStore, signToken, verifyToken, facts, encode, decode } = require("./06-sessions-vs-jwt");

// ---- Task 1: session store ----

test("session: create returns a random id of 32 letters or digits", () => {
  const store = createSessionStore();
  const a = store.create({ userId: 7 });
  const b = store.create({ userId: 7 });
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notStrictEqual(a, b, "two sessions must not share an id");
});

test("session: get returns the data kept on the server", () => {
  const store = createSessionStore();
  const id = store.create({ userId: 7, role: "user" });
  assert.deepStrictEqual(store.get(id), { userId: 7, role: "user" });
});

test("session: an unknown id gives null", () => {
  const store = createSessionStore();
  assert.strictEqual(store.get("nope"), null);
});

test("session: destroy blocks the user at once", () => {
  const store = createSessionStore();
  const id = store.create({ userId: 7 });
  store.destroy(id);
  assert.strictEqual(store.get(id), null);
});

test("session: it runs out after ttlMs", () => {
  let t = 1_000_000;
  const store = createSessionStore({ ttlMs: 1000, now: () => t });
  const id = store.create({ userId: 7 });
  t += 999;
  assert.deepStrictEqual(store.get(id), { userId: 7 });
  t += 1;
  assert.strictEqual(store.get(id), null, "at exactly ttlMs the session is over");
});

test("session: two stores are separate notebooks (two servers)", () => {
  const serverA = createSessionStore();
  const serverB = createSessionStore();
  const id = serverA.create({ userId: 7 });
  assert.strictEqual(serverB.get(id), null);
});

// ---- Task 2: sign and verify ----

const SECRET = "server-secret";
const NOW = 1_700_000_000_000;          // a fixed time in milliseconds

// A signer written in the test, to prove your token is a normal HS256 token.
function referenceToken(header, payload, secret) {
  const body = encode(header) + "." + encode(payload);
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + sig;
}

test("token: has three parts and a header that says HS256", () => {
  const token = signToken({ sub: "7", role: "user" }, SECRET, { now: () => NOW });
  const parts = token.split(".");
  assert.strictEqual(parts.length, 3);
  assert.strictEqual(decode(parts[0]).alg, "HS256");
});

test("token: payload keeps your facts and gets an exp in seconds", () => {
  const token = signToken({ sub: "7", role: "user" }, SECRET, { now: () => NOW, expiresInSeconds: 900 });
  const payload = decode(token.split(".")[1]);
  assert.strictEqual(payload.sub, "7");
  assert.strictEqual(payload.role, "user");
  assert.strictEqual(payload.exp, NOW / 1000 + 900);
});

test("token: a good token comes back as the payload", () => {
  const token = signToken({ sub: "7", role: "user" }, SECRET, { now: () => NOW });
  const payload = verifyToken(token, SECRET, { now: () => NOW + 1000 });
  assert.strictEqual(payload.sub, "7");
  assert.strictEqual(payload.role, "user");
});

test("token: it accepts a normal HS256 token made by another signer", () => {
  const token = referenceToken({ alg: "HS256", typ: "JWT" }, { sub: "9", exp: NOW / 1000 + 60 }, SECRET);
  assert.strictEqual(verifyToken(token, SECRET, { now: () => NOW }).sub, "9");
});

test("token: it makes the same stamp as a normal HS256 signer", () => {
  const mine = signToken({ sub: "7" }, SECRET, { now: () => NOW });
  const [h, p, s] = mine.split(".");
  const expected = createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");
  assert.strictEqual(s, expected);
});

test("token: a changed payload is rejected (the stamp no longer fits)", () => {
  const token = signToken({ sub: "7", role: "user" }, SECRET, { now: () => NOW });
  const [h, , s] = token.split(".");
  const evil = h + "." + encode({ sub: "7", role: "admin", exp: NOW / 1000 + 900 }) + "." + s;
  assert.strictEqual(verifyToken(evil, SECRET, { now: () => NOW }), null);
});

test("token: a wrong secret is rejected", () => {
  const token = signToken({ sub: "7" }, SECRET, { now: () => NOW });
  assert.strictEqual(verifyToken(token, "other-secret", { now: () => NOW }), null);
});

test("token: an expired token is rejected", () => {
  const token = signToken({ sub: "7" }, SECRET, { now: () => NOW, expiresInSeconds: 60 });
  assert.notStrictEqual(verifyToken(token, SECRET, { now: () => NOW + 59_000 }), null);
  assert.strictEqual(verifyToken(token, SECRET, { now: () => NOW + 60_000 }), null, "at exp the token is over");
});

test("token: alg none is rejected", () => {
  const body = encode({ alg: "none", typ: "JWT" }) + "." + encode({ sub: "7", role: "admin", exp: NOW / 1000 + 900 });
  assert.strictEqual(verifyToken(body + ".", SECRET, { now: () => NOW }), null);
});

test("token: another algorithm is rejected even with a good stamp", () => {
  const body = encode({ alg: "HS512", typ: "JWT" }) + "." + encode({ sub: "7", exp: NOW / 1000 + 900 });
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  assert.strictEqual(verifyToken(body + "." + sig, SECRET, { now: () => NOW }), null);
});

test("token: garbage never throws, it gives null", () => {
  for (const bad of ["", "abc", "a.b", "a.b.c.d", null, undefined, 42, "....", "e30.e30.xx"]) {
    assert.strictEqual(verifyToken(bad, SECRET, { now: () => NOW }), null, "input: " + String(bad));
  }
});

// ---- Task 3: facts ----

const expected = {
  canBeBlockedAtOnce: "session",
  noLookupOnEachRequest: "jwt",
  manyServersNeedASharedStore: "session",
  anyoneCanReadTheContent: "jwt",
  browserHoldsOnlyARandomId: "session",
  factsCanGoStaleUntilItRunsOut: "jwt",
};

for (const key of Object.keys(expected)) {
  test(`fact: ${key}`, () => {
    assert.ok(facts[key], "write \"session\" or \"jwt\" first");
    assert.strictEqual(facts[key], expected[key], "Think about where the facts live, and who can cancel them.");
  });
}
