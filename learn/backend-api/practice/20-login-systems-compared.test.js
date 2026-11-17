const test = require("node:test");
const assert = require("node:assert");
const { pkceChallenge, checkIdToken, redirectAllowed, choices } = require("./20-login-systems-compared");

// ---- Task 1: pkceChallenge ----

test("pkceChallenge: the RFC 7636 example", () => {
  assert.strictEqual(
    pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
});

test("pkceChallenge: base64url has no +, / or = and is 43 characters for SHA-256", () => {
  const out = pkceChallenge("some-other-verifier-with-enough-length-1234567890");
  assert.strictEqual(typeof out, "string");
  assert.strictEqual(out.length, 43);
  assert.ok(!/[+/=]/.test(out), "must be base64url, not plain base64");
});

test("pkceChallenge: a different verifier gives a different challenge", () => {
  const a = pkceChallenge("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const b = pkceChallenge("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.strictEqual(typeof a, "string");
  assert.notStrictEqual(a, b);
});

// ---- Task 2: checkIdToken ----

const expected = { issuer: "https://accounts.example.com", clientId: "app-123", nonce: "n-0S6_WzA2Mj", now: 1000 };
const good = { iss: "https://accounts.example.com", aud: "app-123", exp: 2000, nonce: "n-0S6_WzA2Mj", sub: "user-7" };

test("checkIdToken: a good token passes", () => {
  assert.deepStrictEqual(checkIdToken(good, expected), { ok: true });
});

test("checkIdToken: aud may be a list that contains the client id", () => {
  assert.deepStrictEqual(checkIdToken({ ...good, aud: ["other", "app-123"] }, expected), { ok: true });
});

test("checkIdToken: each wrong thing gives its own reason", () => {
  assert.deepStrictEqual(checkIdToken(good, expected), { ok: true }, "first the plain yes");
  assert.deepStrictEqual(checkIdToken({ ...good, iss: "https://evil.example.com" }, expected), { ok: false, reason: "issuer" });
  assert.deepStrictEqual(checkIdToken({ ...good, aud: "someone-else" }, expected), { ok: false, reason: "audience" });
  assert.deepStrictEqual(checkIdToken({ ...good, aud: ["x", "y"] }, expected), { ok: false, reason: "audience" });
  assert.deepStrictEqual(checkIdToken({ ...good, exp: 900 }, expected), { ok: false, reason: "expired" });
  assert.deepStrictEqual(checkIdToken({ ...good, nonce: "other" }, expected), { ok: false, reason: "nonce" });
});

test("checkIdToken: exp equal to now is already expired", () => {
  assert.deepStrictEqual(checkIdToken(good, expected), { ok: true }, "first the plain yes");
  assert.deepStrictEqual(checkIdToken({ ...good, exp: 1000 }, expected), { ok: false, reason: "expired" });
});

test("checkIdToken: the first failing check is the one reported", () => {
  assert.deepStrictEqual(checkIdToken(good, expected), { ok: true }, "first the plain yes");
  assert.deepStrictEqual(
    checkIdToken({ ...good, iss: "https://evil.example.com", aud: "x", exp: 1 }, expected),
    { ok: false, reason: "issuer" }
  );
  assert.deepStrictEqual(checkIdToken({ ...good, aud: "x", exp: 1 }, expected), { ok: false, reason: "audience" });
});

test("checkIdToken: a missing nonce fails, and bad input never throws", () => {
  assert.deepStrictEqual(checkIdToken(good, expected), { ok: true }, "first the plain yes");
  const { nonce, ...noNonce } = good;
  assert.deepStrictEqual(checkIdToken(noNonce, expected), { ok: false, reason: "nonce" });
  assert.strictEqual(checkIdToken(undefined, expected).ok, false);
  assert.strictEqual(checkIdToken(null, expected).ok, false);
  assert.strictEqual(checkIdToken({}, expected).ok, false);
  assert.strictEqual(checkIdToken("a string", expected).ok, false);
});

// ---- Task 3: redirectAllowed ----

const registered = ["https://app.example.com/callback", "http://localhost:3000/callback"];

test("redirectAllowed: an exact match is allowed", () => {
  assert.strictEqual(redirectAllowed("https://app.example.com/callback", registered), true);
  assert.strictEqual(redirectAllowed("http://localhost:3000/callback", registered), true);
});

test("redirectAllowed: anything that is only similar is not allowed", () => {
  assert.strictEqual(redirectAllowed("https://app.example.com/callback", registered), true, "first the plain yes");
  assert.strictEqual(redirectAllowed("https://app.example.com/callback/evil", registered), false, "starts with, but not equal");
  assert.strictEqual(redirectAllowed("https://app.example.com/callback?next=x", registered), false);
  assert.strictEqual(redirectAllowed("https://app.example.com.evil.io/callback", registered), false);
  assert.strictEqual(redirectAllowed("https://app.example.com/Callback", registered), false, "case matters");
  assert.strictEqual(redirectAllowed("https://app.example.com", registered), false);
});

test("redirectAllowed: bad input is a plain no", () => {
  assert.strictEqual(redirectAllowed("https://app.example.com/callback", registered), true, "first the plain yes");
  assert.strictEqual(redirectAllowed(undefined, registered), false);
  assert.strictEqual(redirectAllowed("https://app.example.com/callback", undefined), false);
  assert.strictEqual(redirectAllowed("https://app.example.com/callback", []), false);
  assert.strictEqual(redirectAllowed("", registered), false);
});

// ---- Task 4: choices ----

test("choices: pick the right system for each situation", () => {
  assert.deepStrictEqual(choices, {
    stayLoggedInOnMyOwnWebsite: "session",
    signInWithGoogleButton: "oidc",
    partnerAppMayReadOneUsersFilesOnly: "oauth",
    buildScriptCallsMyApi: "api-key",
    customerItSaysWeOnlySupportSaml: "saml",
  });
});
