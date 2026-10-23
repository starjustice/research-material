const test = require("node:test");
const assert = require("node:assert");
const { createGateway } = require("./17-proxies-and-api-gateways");

const routes = { "/orders": "orders-service", "/orders/admin": "admin-service", "/auth": "auth-service" };
const tokens = { "t-sam": "sam", "t-mia": "mia" };

function setup(extra = {}) {
  const clock = { t: 0 };
  const gateway = createGateway({ routes, tokens, limit: 2, windowMs: 60000, now: () => clock.t, ...extra });
  return { gateway, clock };
}

test("a missing token or an unknown token gets 401", () => {
  const { gateway } = setup();
  assert.deepStrictEqual(gateway.handle({ path: "/orders" }), { status: 401 });
  assert.deepStrictEqual(gateway.handle({ path: "/orders", token: "nope" }), { status: 401 });
});

test("names that every object has are not tokens", () => {
  const { gateway } = setup();
  assert.strictEqual(gateway.handle({ path: "/orders", token: "constructor" }).status, 401);
  assert.strictEqual(gateway.handle({ path: "/orders", token: "toString" }).status, 401);
});

test("a good token and a known path go to the right service", () => {
  const { gateway } = setup();
  const answer = gateway.handle({ path: "/orders/42", token: "t-sam" });
  assert.strictEqual(answer.status, 200);
  assert.strictEqual(answer.service, "orders-service");
  const other = gateway.handle({ path: "/auth/login", token: "t-sam" });
  assert.strictEqual(other.service, "auth-service");
});

test("a route matches the exact path and paths below it, but not a longer word", () => {
  const { gateway } = setup({ limit: 10 });
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 200);
  assert.strictEqual(gateway.handle({ path: "/orders/42", token: "t-sam" }).status, 200);
  assert.strictEqual(gateway.handle({ path: "/ordersX", token: "t-sam" }).status, 404);
});

test("the longest matching start wins", () => {
  const { gateway } = setup({ limit: 10 });
  assert.strictEqual(gateway.handle({ path: "/orders/admin/users", token: "t-sam" }).service, "admin-service");
  assert.strictEqual(gateway.handle({ path: "/orders/adminX", token: "t-sam" }).service, "orders-service");
});

test("a path with no route gets 404", () => {
  const { gateway } = setup();
  assert.deepStrictEqual(gateway.handle({ path: "/shop", token: "t-sam" }), { status: 404 });
});

test("the third request in one window gets 429 with the seconds left", () => {
  const { gateway, clock } = setup();
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 200);
  clock.t = 1000;
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 200);
  clock.t = 1500;
  assert.deepStrictEqual(gateway.handle({ path: "/orders", token: "t-sam" }), { status: 429, retryAfter: 59 });
});

test("retryAfter is rounded up to whole seconds", () => {
  const { gateway, clock } = setup({ limit: 1 });
  gateway.handle({ path: "/orders", token: "t-sam" });
  clock.t = 59001;
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).retryAfter, 1);
});

test("a new window starts after windowMs and the count starts again", () => {
  const { gateway, clock } = setup();
  gateway.handle({ path: "/orders", token: "t-sam" });
  gateway.handle({ path: "/orders", token: "t-sam" });
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 429);
  clock.t = 59999;
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 429);
  clock.t = 60000;
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 200);
});

test("every user has their own count", () => {
  const { gateway } = setup();
  gateway.handle({ path: "/orders", token: "t-sam" });
  gateway.handle({ path: "/orders", token: "t-sam" });
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 429);
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-mia" }).status, 200);
});

test("a request that ends in 404 still counts for the limit", () => {
  const { gateway } = setup();
  assert.strictEqual(gateway.handle({ path: "/nothing", token: "t-sam" }).status, 404);
  assert.strictEqual(gateway.handle({ path: "/nothing", token: "t-sam" }).status, 404);
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 429);
});

test("a refused ticket does not count for anybody", () => {
  const { gateway } = setup();
  for (let i = 0; i < 5; i++) gateway.handle({ path: "/orders", token: "nope" });
  assert.strictEqual(gateway.handle({ path: "/orders", token: "t-sam" }).status, 200);
});

test("the gateway sets x-user-id from the token and keeps the other headers", () => {
  const { gateway } = setup();
  const answer = gateway.handle({ path: "/orders", token: "t-mia", headers: { accept: "application/json" } });
  assert.deepStrictEqual(answer.headers, { accept: "application/json", "x-user-id": "mia" });
});

test("a caller cannot fake x-user-id, and the caller's headers object is not changed", () => {
  const { gateway } = setup();
  const headers = { "x-user-id": "boss" };
  const answer = gateway.handle({ path: "/orders", token: "t-mia", headers });
  assert.strictEqual(answer.headers["x-user-id"], "mia");
  assert.deepStrictEqual(headers, { "x-user-id": "boss" });
});

test("a 200 answer without headers in the request still has the x-user-id header", () => {
  const { gateway } = setup();
  assert.deepStrictEqual(gateway.handle({ path: "/auth", token: "t-sam" }).headers, { "x-user-id": "sam" });
});
