const test = require("node:test");
const assert = require("node:assert");
const { requireLogin, createGetOrder } = require("./29-security-in-a-design");

const orders = {
  42: { id: 42, ownerId: "ann", total: 30 },
  43: { id: 43, ownerId: "ben", total: 99 },
};

// A fake response that remembers the status code and the body.
function fakeRes() {
  return {
    code: 200,
    body: undefined,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

// A fake login check. The token "ann-token" belongs to Ann, "ben-token" to Ben.
const users = { "ann-token": { id: "ann", role: "customer" }, "ben-token": { id: "ben", role: "customer" }, "sam-token": { id: "sam", role: "support" } };
function verifyToken(token) {
  if (!users[token]) throw new Error("bad token");
  return users[token];
}

test("requireLogin sets req.user and calls next for a good token", () => {
  const req = { headers: { authorization: "Bearer ann-token" } };
  const res = fakeRes();
  let called = 0;
  requireLogin(verifyToken)(req, res, () => { called += 1; });
  assert.strictEqual(called, 1);
  assert.deepStrictEqual(req.user, { id: "ann", role: "customer" });
});

test("requireLogin answers 401 when there is no token", () => {
  const req = { headers: {} };
  const res = fakeRes();
  let called = 0;
  requireLogin(verifyToken)(req, res, () => { called += 1; });
  assert.strictEqual(called, 0);
  assert.strictEqual(res.code, 401);
  assert.deepStrictEqual(res.body, { error: "login required" });
});

test("requireLogin answers 401 when the token is bad, and never calls next", () => {
  const req = { headers: { authorization: "Bearer made-up" } };
  const res = fakeRes();
  let called = 0;
  requireLogin(verifyToken)(req, res, () => { called += 1; });
  assert.strictEqual(called, 0);
  assert.strictEqual(res.code, 401);
});

test("requireLogin ignores a header that does not start with Bearer", () => {
  const req = { headers: { authorization: "ann-token" } };
  const res = fakeRes();
  requireLogin(verifyToken)(req, res, () => assert.fail("next must not be called"));
  assert.strictEqual(res.code, 401);
});

test("the owner can read their own order", () => {
  const res = fakeRes();
  createGetOrder(orders)({ user: users["ann-token"], params: { id: "42" } }, res);
  assert.strictEqual(res.code, 200);
  assert.deepStrictEqual(res.body, orders[42]);
});

test("user A cannot read user B's order (BOLA)", () => {
  const res = fakeRes();
  createGetOrder(orders)({ user: users["ann-token"], params: { id: "43" } }, res);
  assert.strictEqual(res.code, 404);
  assert.deepStrictEqual(res.body, { error: "not found" });
  assert.notStrictEqual(res.body, orders[43]);
});

test("a missing order and someone else's order look exactly the same", () => {
  const mine = fakeRes();
  const missing = fakeRes();
  createGetOrder(orders)({ user: users["ann-token"], params: { id: "43" } }, mine);
  createGetOrder(orders)({ user: users["ann-token"], params: { id: "999" } }, missing);
  assert.strictEqual(mine.code, missing.code);
  assert.deepStrictEqual(mine.body, missing.body);
});

test("the id in the request body or query cannot change who you are", () => {
  const res = fakeRes();
  const req = { user: users["ann-token"], params: { id: "43" }, query: { userId: "ben" }, body: { userId: "ben", ownerId: "ben" } };
  createGetOrder(orders)(req, res);
  assert.strictEqual(res.code, 404);
});

test("a support user (a role) can read any order", () => {
  const res = fakeRes();
  createGetOrder(orders)({ user: users["sam-token"], params: { id: "43" } }, res);
  assert.strictEqual(res.code, 200);
  assert.deepStrictEqual(res.body, orders[43]);
});

test("without req.user the handler answers 401 and leaks nothing", () => {
  const res = fakeRes();
  createGetOrder(orders)({ params: { id: "42" } }, res);
  assert.strictEqual(res.code, 401);
  assert.deepStrictEqual(res.body, { error: "login required" });
});

test("the two parts work together: Ann with Ann's token, then with Ben's order id", () => {
  const login = requireLogin(verifyToken);
  const getOrder = createGetOrder(orders);
  const run = (token, id) => {
    const req = { headers: { authorization: "Bearer " + token }, params: { id } };
    const res = fakeRes();
    login(req, res, () => getOrder(req, res));
    return res;
  };
  assert.strictEqual(run("ann-token", "42").code, 200);
  assert.strictEqual(run("ann-token", "43").code, 404);
  assert.strictEqual(run("ben-token", "43").code, 200);
  assert.strictEqual(run("nobody", "43").code, 401);
});
