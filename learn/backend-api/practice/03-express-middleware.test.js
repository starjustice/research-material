const test = require("node:test");
const assert = require("node:assert");
const { createResponse, createApp } = require("./03-express-middleware");

const goodReq = () => ({ method: "POST", path: "/orders", headers: { authorization: "Bearer t-7" }, steps: [] });
const noTokenReq = () => ({ method: "POST", path: "/orders", headers: {}, steps: [] });

// The same jobs as the lesson, written for the tiny copy.
const logger = (req, res, next) => { req.steps.push("logger"); next(); };
const auth = (req, res, next) => {
  req.steps.push("auth");
  if (req.headers.authorization !== "Bearer t-7") return res.status(401).json({ error: "log in first" });
  req.user = { id: 7 };
  next();
};
const route = (req, res, next) => { req.steps.push("route"); res.status(201).json({ ok: true, user: req.user.id }); };
const errorHandler = (err, req, res, next) => { req.steps.push("error: " + err.message); res.status(500).json({ error: "something went wrong" }); };

// ---- Part 1: the res object ----

test("res starts at 200 with nothing sent", () => {
  const res = createResponse();
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body, undefined);
  assert.strictEqual(res.headersSent, false);
});

test("res.status is chainable and json sends", () => {
  const res = createResponse();
  assert.strictEqual(res.status(401), res);
  res.status(401).json({ error: "log in first" });
  assert.strictEqual(res.statusCode, 401);
  assert.deepStrictEqual(res.body, { error: "log in first" });
  assert.strictEqual(res.headersSent, true);
});

test("sending twice throws and keeps the first body", () => {
  const res = createResponse();
  res.json({ first: true });
  assert.throws(() => res.send({ second: true }), /Cannot set headers after they are sent to the client/);
  assert.deepStrictEqual(res.body, { first: true });
});

test("after a send, status changes nothing", () => {
  const res = createResponse();
  res.status(401).json({ error: "log in first" });
  assert.strictEqual(res.status(201), res);
  assert.strictEqual(res.statusCode, 401);
});

// ---- Part 2: the line ----

test("functions run in the order they were added", () => {
  const app = createApp();
  const req = goodReq();
  app.use(logger);
  app.use(auth);
  app.use(route);
  app.handle(req);
  assert.deepStrictEqual(req.steps, ["logger", "auth", "route"]);
});

test("req is shared: auth sets req.user and the route reads it", () => {
  const app = createApp();
  app.use(logger);
  app.use(auth);
  app.use(route);
  assert.deepStrictEqual(app.handle(goodReq()), { status: 201, body: { ok: true, user: 7 } });
});

test("a function that sends and does not call next stops the line", () => {
  const app = createApp();
  const req = noTokenReq();
  app.use(logger);
  app.use(auth);
  app.use(route);
  assert.deepStrictEqual(app.handle(req), { status: 401, body: { error: "log in first" } });
  assert.deepStrictEqual(req.steps, ["logger", "auth"]);
});

test("a function that neither sends nor calls next leaves the request hanging", () => {
  const app = createApp();
  const req = goodReq();
  app.use((req, res, next) => { req.steps.push("forgot next"); });
  app.use(route);
  assert.strictEqual(app.handle(req), "hang");
  assert.deepStrictEqual(req.steps, ["forgot next"]);
});

test("going past the end with nothing sent gives 404", () => {
  const app = createApp();
  app.use(logger);
  assert.deepStrictEqual(app.handle(goodReq()), { status: 404, body: { error: "Not Found" } });
});

test("error functions are skipped when there is no error", () => {
  const app = createApp();
  const req = goodReq();
  app.use(logger);
  app.use(errorHandler);
  app.use((req, res, next) => { req.steps.push("route"); res.json({ ok: true }); });
  assert.deepStrictEqual(app.handle(req), { status: 200, body: { ok: true } });
  assert.deepStrictEqual(req.steps, ["logger", "route"]);
});

test("next(err) skips normal functions and jumps to the error function", () => {
  const app = createApp();
  const req = goodReq();
  app.use((req, res, next) => next(new Error("bad input")));
  app.use(logger);
  app.use(route);
  app.use(errorHandler);
  assert.deepStrictEqual(app.handle(req), { status: 500, body: { error: "something went wrong" } });
  assert.deepStrictEqual(req.steps, ["error: bad input"]);
});

test("a thrown error is treated like next(err)", () => {
  const app = createApp();
  const req = goodReq();
  app.use((req, res, next) => { throw new Error("database is down"); });
  app.use(errorHandler);
  assert.doesNotThrow(() => app.handle(req));
  assert.deepStrictEqual(req.steps, ["error: database is down"]);
});

test("an error function can pass the error on to the next error function", () => {
  const app = createApp();
  const req = goodReq();
  app.use(() => { throw new Error("boom"); });
  app.use((err, req, res, next) => { req.steps.push("log the error"); next(err); });
  app.use(logger);
  app.use(errorHandler);
  app.handle(req);
  assert.deepStrictEqual(req.steps, ["log the error", "error: boom"]);
});

test("an error with no error function left gives 500", () => {
  const app = createApp();
  app.use(() => { throw new Error("boom"); });
  app.use(route);
  assert.deepStrictEqual(app.handle(goodReq()), { status: 500, body: { error: "Internal Server Error" } });
});

test("a function with 3 parameters is not an error function", () => {
  const app = createApp();
  const req = goodReq();
  app.use(() => { throw new Error("boom"); });
  app.use((req, res, next) => { req.steps.push("3-param handler"); res.status(500).json({ error: "safe" }); });
  assert.deepStrictEqual(app.handle(req), { status: 500, body: { error: "Internal Server Error" } });
  assert.deepStrictEqual(req.steps, []);
});

test("an error function added before the route never sees the route's error", () => {
  const app = createApp();
  const req = goodReq();
  app.use(errorHandler);
  app.use(() => { throw new Error("boom"); });
  assert.deepStrictEqual(app.handle(req), { status: 500, body: { error: "Internal Server Error" } });
  assert.deepStrictEqual(req.steps, []);
});

test("a missing return: the first answer stays, but the route still ran", () => {
  const app = createApp();
  const req = noTokenReq();
  app.use((req, res, next) => {
    if (!req.headers.authorization) res.status(401).json({ error: "log in first" }); // no return
    next();
  });
  app.use((req, res, next) => { req.steps.push("route ran anyway"); res.status(201).json({ ok: true }); });
  assert.deepStrictEqual(app.handle(req), { status: 401, body: { error: "log in first" } });
  assert.deepStrictEqual(req.steps, ["route ran anyway"]);
});
