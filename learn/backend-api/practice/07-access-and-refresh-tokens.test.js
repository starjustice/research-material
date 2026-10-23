const test = require("node:test");
const assert = require("node:assert");
const { createAuthService, sha256 } = require("./07-access-and-refresh-tokens");

const NOW = 1_700_000_000_000;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

function setup() {
  let t = NOW;
  const service = createAuthService({ secret: "server-secret", now: () => t });
  return { service, move: (ms) => { t += ms; } };
}

// ---- 1 and 2: issuePair, verifyAccess ----

test("login: gives an access token and a different refresh token", () => {
  const { service } = setup();
  const pair = service.login(7);
  assert.ok(pair && pair.accessToken && pair.refreshToken, "login must return { accessToken, refreshToken }");
  assert.notStrictEqual(pair.accessToken, pair.refreshToken);
});

test("login: the access token says who the user is", () => {
  const { service } = setup();
  const { accessToken } = service.login(7);
  const payload = service.verifyAccess(accessToken);
  assert.strictEqual(payload.sub, "7");
});

test("access token: works at 14 minutes, ends at 15 minutes", () => {
  const { service, move } = setup();
  const { accessToken } = service.login(7);
  move(14 * MIN);
  assert.notStrictEqual(service.verifyAccess(accessToken), null);
  move(1 * MIN);
  assert.strictEqual(service.verifyAccess(accessToken), null, "after 15 minutes the access token is over");
});

test("access token: garbage gives null and does not throw", () => {
  const { service } = setup();
  assert.strictEqual(service.verifyAccess("abc"), null);
  assert.strictEqual(service.verifyAccess(undefined), null);
});

test("database: it holds the hash of the refresh token, not the token", () => {
  const { service } = setup();
  const { refreshToken } = service.login(7);
  const keys = service._keys();
  assert.strictEqual(keys.length, 1);
  assert.ok(!keys.includes(refreshToken), "never save the token itself");
  assert.strictEqual(keys[0], sha256(refreshToken), "the key is the SHA-256 hex of the token");
});

test("database: a new row starts active, in a family, with an end date 7 days away", () => {
  const { service } = setup();
  service.login(7);
  const [row] = service._rows();
  assert.strictEqual(row.status, "active");
  assert.strictEqual(row.userId, 7);
  assert.ok(row.familyId);
  assert.strictEqual(row.expiresAt, NOW + 7 * DAY);
});

// ---- 3: refresh with rotation ----

test("refresh: gives a new pair, and the refresh token is NEW", () => {
  const { service } = setup();
  const first = service.login(7);
  const second = service.refresh(first.refreshToken);
  assert.ok(second, "a good refresh token must give a new pair");
  assert.notStrictEqual(second.refreshToken, first.refreshToken, "rotation: a NEW refresh token");
  assert.strictEqual(service.verifyAccess(second.accessToken).sub, "7");
});

test("refresh: the old token is marked used, the new one is active, same family", () => {
  const { service } = setup();
  const first = service.login(7);
  service.refresh(first.refreshToken);
  const rows = service._rows();
  assert.deepStrictEqual(rows.map((r) => r.status).sort(), ["active", "used"]);
  assert.strictEqual(rows[0].familyId, rows[1].familyId);
});

test("refresh: a token works once. The second try gives null", () => {
  const { service } = setup();
  const first = service.login(7);
  assert.ok(service.refresh(first.refreshToken));
  assert.strictEqual(service.refresh(first.refreshToken), null);
});

test("refresh: you can keep going, R1 then R2 then R3", () => {
  const { service } = setup();
  let pair = service.login(7);
  for (let i = 0; i < 3; i++) {
    pair = service.refresh(pair.refreshToken);
    assert.ok(pair, "round " + (i + 1) + " must work");
  }
  assert.strictEqual(service._rows().filter((r) => r.status === "active").length, 1);
});

test("refresh: unknown or broken input gives null and does not throw", () => {
  const { service } = setup();
  assert.strictEqual(service.refresh("not-a-token"), null);
  assert.strictEqual(service.refresh(undefined), null);
  assert.strictEqual(service.refresh(12345), null);
});

test("refresh: a refresh token ends after 7 days", () => {
  const { service, move } = setup();
  const pair = service.login(7);
  move(7 * DAY - 1);
  const ok = service.refresh(pair.refreshToken);
  assert.ok(ok, "still good a moment before 7 days");
  const old = service.login(8);
  move(7 * DAY);
  assert.strictEqual(service.refresh(old.refreshToken), null, "7 days later it is over");
});

// ---- reuse detection ----

test("reuse: an old token coming back cancels the whole family", () => {
  const { service } = setup();
  const r1 = service.login(7);
  const r2 = service.refresh(r1.refreshToken);        // the thief used R1 first
  assert.strictEqual(service.refresh(r1.refreshToken), null);   // Ana sends R1 again: reuse
  assert.strictEqual(service.refresh(r2.refreshToken), null, "R2 must be dead too");
  assert.ok(service._rows().every((r) => r.status === "revoked"));
});

test("reuse: another user's family is not touched", () => {
  const { service } = setup();
  const ana = service.login(7);
  const budi = service.login(8);
  service.refresh(ana.refreshToken);
  service.refresh(ana.refreshToken);                  // reuse in Ana's family
  assert.ok(service.refresh(budi.refreshToken), "Budi must still be able to refresh");
});

test("reuse: another login of the same user is a different family and still works", () => {
  const { service } = setup();
  const phone = service.login(7);
  const laptop = service.login(7);
  service.refresh(phone.refreshToken);
  service.refresh(phone.refreshToken);                // reuse on the phone
  assert.ok(service.refresh(laptop.refreshToken), "the laptop login is a separate family");
});

// ---- 4: logout ----

test("logout: the refresh token stops working at once", () => {
  const { service } = setup();
  const pair = service.login(7);
  service.logout(pair.refreshToken);
  assert.strictEqual(service.refresh(pair.refreshToken), null);
});

test("logout: the access token still works until it ends (the price of a stateless token)", () => {
  const { service, move } = setup();
  const pair = service.login(7);
  service.logout(pair.refreshToken);
  assert.notStrictEqual(service.verifyAccess(pair.accessToken), null);
  move(15 * MIN);
  assert.strictEqual(service.verifyAccess(pair.accessToken), null);
});

test("logout: cancels the newest token of the family too", () => {
  const { service } = setup();
  const r1 = service.login(7);
  const r2 = service.refresh(r1.refreshToken);
  service.logout(r2.refreshToken);
  assert.ok(service._rows().every((r) => r.status === "revoked"));
});

test("logout: an unknown token does nothing and does not throw", () => {
  const { service } = setup();
  const pair = service.login(7);
  service.logout("nope");
  service.logout(undefined);
  assert.ok(service.refresh(pair.refreshToken));
});
