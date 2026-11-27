const test = require("node:test");
const assert = require("node:assert");
const { decodeScrambled, pickFields, makeWeatherHandler } = require("./21-what-the-browser-can-see");

test("decodeScrambled: base64 is not secret", () => {
  const scrambled = Buffer.from('{"city":"Jakarta","temp":31}').toString("base64");
  assert.deepStrictEqual(decodeScrambled(scrambled), { city: "Jakarta", temp: 31 });
});

test("pickFields keeps only the allowed keys", () => {
  assert.deepStrictEqual(pickFields({ city: "A", temp: 1, internalCost: 9 }, ["city", "temp"]), { city: "A", temp: 1 });
});

test("pickFields leaves out keys that are missing", () => {
  const out = pickFields({ city: "A" }, ["city", "temp"]);
  assert.deepStrictEqual(out, { city: "A" });
  assert.ok(!("temp" in out));
});

test("pickFields does not change the original", () => {
  const original = { a: 1, b: 2 };
  assert.deepStrictEqual(pickFields(original, ["a"]), { a: 1 });
  assert.deepStrictEqual(original, { a: 1, b: 2 });
});

function setup(overrides = {}) {
  const calls = [];
  const handle = makeWeatherHandler({
    apiKey: "sk_live_SECRET",
    callThirdParty: async (city, key) => { calls.push({ city, key }); return { city, temp: 31, internalCost: 0.02, key }; },
    getUserId: (req) => (req.headers.cookie === "session=abc" ? "u1" : null),
    allowRequest: () => true,
    ...overrides,
  });
  return { handle, calls };
}
const loggedIn = { headers: { cookie: "session=abc" }, query: { city: "Jakarta" } };

test("handler: no login gives 401 and never calls the third party", async () => {
  const { handle, calls } = setup();
  const res = await handle({ headers: {}, query: { city: "Jakarta" } });
  assert.deepStrictEqual(res, { status: 401, body: { error: "login first" } });
  assert.strictEqual(calls.length, 0);
});

test("handler: too many requests gives 429 and never calls the third party", async () => {
  const { handle, calls } = setup({ allowRequest: () => false });
  const res = await handle(loggedIn);
  assert.deepStrictEqual(res, { status: 429, body: { error: "slow down" } });
  assert.strictEqual(calls.length, 0);
});

test("handler: the login check comes before the rate limit", async () => {
  let asked = false;
  const { handle } = setup({ allowRequest: () => { asked = true; return false; } });
  const res = await handle({ headers: {}, query: { city: "X" } });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(asked, false);
});

test("handler: the key goes to the third party", async () => {
  const { handle, calls } = setup();
  await handle(loggedIn);
  assert.deepStrictEqual(calls, [{ city: "Jakarta", key: "sk_live_SECRET" }]);
});

test("handler: the answer holds only city and temp, and never the key", async () => {
  const { handle } = setup();
  const res = await handle(loggedIn);
  assert.deepStrictEqual(res, { status: 200, body: { city: "Jakarta", temp: 31 } });
  assert.ok(!JSON.stringify(res).includes("sk_live_SECRET"));
});

test("handler: allowRequest gets the user id", async () => {
  let got;
  const { handle } = setup({ allowRequest: (id) => { got = id; return true; } });
  await handle(loggedIn);
  assert.strictEqual(got, "u1");
});
