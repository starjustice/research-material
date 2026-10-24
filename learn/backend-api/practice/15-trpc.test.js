const test = require("node:test");
const assert = require("node:assert");
const { TRPCError, httpStatusFor, parseRpcUrl, callProcedure, batchStatus, answers } = require("./15-trpc");

// ---- Task 1: httpStatusFor ----

const TABLE = {
  PARSE_ERROR: 400, BAD_REQUEST: 400, UNAUTHORIZED: 401, PAYMENT_REQUIRED: 402, FORBIDDEN: 403, NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405, TIMEOUT: 408, CONFLICT: 409, PRECONDITION_FAILED: 412, PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415, UNPROCESSABLE_CONTENT: 422, PRECONDITION_REQUIRED: 428, TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499, INTERNAL_SERVER_ERROR: 500, NOT_IMPLEMENTED: 501, BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503, GATEWAY_TIMEOUT: 504,
};

test("httpStatusFor: every code in the docs table", () => {
  for (const [code, status] of Object.entries(TABLE)) assert.strictEqual(httpStatusFor(code), status, code);
});

test("httpStatusFor: anything else is 500, and it never throws", () => {
  for (const code of ["NOPE", "toString", "__proto__", "constructor", "", undefined, null, 404, {}]) {
    assert.strictEqual(httpStatusFor(code), 500, String(code));
  }
});

// ---- Task 2: parseRpcUrl ----

test("parseRpcUrl: a query reads the input from the URL", () => {
  const r = parseRpcUrl({ method: "GET", url: "/trpc/user.byId?input=%7B%22id%22%3A1%7D" });
  assert.deepStrictEqual(r, { batch: false, calls: [{ path: "user.byId", input: { id: 1 } }] });
});

test("parseRpcUrl: a query with no input has input undefined", () => {
  const r = parseRpcUrl({ method: "GET", url: "/trpc/post.list" });
  assert.deepStrictEqual(r, { batch: false, calls: [{ path: "post.list", input: undefined }] });
});

test("parseRpcUrl: a mutation reads the input from the body", () => {
  const r = parseRpcUrl({ method: "POST", url: "/trpc/user.rename", body: '{"id":1,"name":"Anna"}' });
  assert.deepStrictEqual(r, { batch: false, calls: [{ path: "user.rename", input: { id: 1, name: "Anna" } }] });
  assert.deepStrictEqual(parseRpcUrl({ method: "POST", url: "/trpc/ping", body: "" }).calls[0].input, undefined);
});

test("parseRpcUrl: the input of a mutation is not read from the URL", () => {
  const r = parseRpcUrl({ method: "POST", url: "/trpc/x?input=%7B%22a%22%3A1%7D", body: '{"b":2}' });
  assert.deepStrictEqual(r.calls[0].input, { b: 2 });
});

test("parseRpcUrl: a batch of queries (the example from the tRPC docs)", () => {
  const url = "/trpc/postById,relatedPosts?batch=1&input=%7B%220%22%3A%221%22%2C%221%22%3A%221%22%7D";
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url }), {
    batch: true,
    calls: [{ path: "postById", input: "1" }, { path: "relatedPosts", input: "1" }],
  });
});

test("parseRpcUrl: in a batch, a call with no key has input undefined", () => {
  const url = "/trpc/user.byId,post.list?batch=1&input=" + encodeURIComponent('{"0":{"id":1}}');
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url }).calls, [
    { path: "user.byId", input: { id: 1 } },
    { path: "post.list", input: undefined },
  ]);
});

test("parseRpcUrl: a batch of mutations reads the keyed body", () => {
  const r = parseRpcUrl({ method: "POST", url: "/trpc/a,b?batch=1", body: '{"0":{"x":1},"1":{"y":2}}' });
  assert.deepStrictEqual(r, { batch: true, calls: [{ path: "a", input: { x: 1 } }, { path: "b", input: { y: 2 } }] });
});

test("parseRpcUrl: batch=1 with a single path is still a batch of one", () => {
  const url = "/trpc/user.byId?batch=1&input=" + encodeURIComponent('{"0":{"id":5}}');
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url }), { batch: true, calls: [{ path: "user.byId", input: { id: 5 } }] });
});

test("parseRpcUrl: another basePath", () => {
  const r = parseRpcUrl({ method: "GET", url: "/api/trpc/hello?input=%22world%22", basePath: "/api/trpc/" });
  assert.deepStrictEqual(r.calls, [{ path: "hello", input: "world" }]);
});

test("parseRpcUrl: errors are returned, not thrown", () => {
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url: "/trpc/x?input={broken" }), { error: "parse error" });
  assert.deepStrictEqual(parseRpcUrl({ method: "POST", url: "/trpc/x", body: "not json" }), { error: "parse error" });
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url: "/other/x" }), { error: "bad request" });
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url: "/trpc/" }), { error: "bad request" });
  assert.deepStrictEqual(parseRpcUrl({ method: "GET", url: "/trpc/a,b" }), { error: "bad request" }, "several paths need batch=1");
});

// ---- Task 3: callProcedure ----

const users = [{ id: 1, name: "Ana" }, { id: 2, name: "Budi" }];
const wholeId = (raw) =>
  raw && Number.isInteger(raw.id) ? { ok: true, value: { id: raw.id } } : { ok: false, message: "id must be a whole number" };
const seen = [];
const router = {
  user: {
    byId: {
      type: "query",
      input: wholeId,
      handler: ({ input }) => {
        const u = users.find((x) => x.id === input.id);
        if (!u) throw new TRPCError("NOT_FOUND", "No user with that id");
        return u;
      },
    },
    rename: {
      type: "mutation",
      middlewares: [(ctx) => { if (!ctx.user) throw new TRPCError("UNAUTHORIZED"); }],
      input: (raw) => (raw && typeof raw.name === "string" && raw.name ? { ok: true, value: { name: raw.name } } : { ok: false, message: "name is required" }),
      handler: ({ input, ctx }) => ({ by: ctx.user.id, name: input.name }),
    },
  },
  boom: { type: "query", handler: () => { throw new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"); } },
  ping: { type: "query", handler: () => undefined },
  withCtx: {
    type: "query",
    middlewares: [(ctx) => { seen.push("one"); return { ...ctx, step: 1 }; }, (ctx) => { seen.push("two"); return { ...ctx, step: ctx.step + 1 }; }, () => { seen.push("three, returns nothing"); }],
    handler: ({ ctx }) => ctx.step,
  },
  asyncOne: { type: "query", middlewares: [async (ctx) => ({ ...ctx, loaded: true })], handler: async ({ ctx }) => ctx.loaded },
};
const call = (path, method, rawInput, ctx = {}) => callProcedure({ router, path, method, rawInput, ctx });

test("callProcedure: a good query returns the data", async () => {
  assert.deepStrictEqual(await call("user.byId", "GET", { id: 1 }), { ok: true, data: { id: 1, name: "Ana" } });
});

test("callProcedure: the validator's cleaned value is what the handler gets", async () => {
  const r = await call("user.byId", "GET", { id: 2, extra: "dropped" });
  assert.deepStrictEqual(r, { ok: true, data: { id: 2, name: "Budi" } });
});

test("callProcedure: bad input is BAD_REQUEST with the validator's message", async () => {
  assert.deepStrictEqual(await call("user.byId", "GET", { id: "x" }), {
    ok: false, error: { code: "BAD_REQUEST", message: "id must be a whole number" },
  });
});

test("callProcedure: a thrown TRPCError keeps its code and message", async () => {
  assert.deepStrictEqual(await call("user.byId", "GET", { id: 99 }), {
    ok: false, error: { code: "NOT_FOUND", message: "No user with that id" },
  });
});

test("callProcedure: an unknown error is hidden", async () => {
  const r = await call("boom", "GET");
  assert.deepStrictEqual(r, { ok: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong. Try again later." } });
  assert.ok(!JSON.stringify(r).includes("hunter2"), "the real message must not be in the answer");
});

test("callProcedure: a missing path is NOT_FOUND, also tricky paths", async () => {
  for (const path of ["nope", "user.nope", "user", "user.byId.x", "__proto__", "constructor", "user.constructor", "toString", ""]) {
    const r = await call(path, "GET", {});
    assert.strictEqual(r.ok, false, path);
    assert.strictEqual(r.error.code, "NOT_FOUND", path);
  }
});

test("callProcedure: GET for a query, POST for a mutation, else METHOD_NOT_SUPPORTED", async () => {
  assert.strictEqual((await call("user.byId", "POST", { id: 1 })).error.code, "METHOD_NOT_SUPPORTED");
  assert.strictEqual((await call("user.rename", "GET", { name: "A" }, { user: { id: 1 } })).error.code, "METHOD_NOT_SUPPORTED");
  assert.strictEqual((await call("user.rename", "POST", { name: "A" }, { user: { id: 1 } })).ok, true);
});

test("callProcedure: middleware stops the call, and the handler is not reached", async () => {
  const r = await call("user.rename", "POST", { name: "Anna" }, {});
  assert.deepStrictEqual(r, { ok: false, error: { code: "UNAUTHORIZED", message: "UNAUTHORIZED" } });
});

test("callProcedure: the login check comes BEFORE the validator", async () => {
  const r = await call("user.rename", "POST", { name: "" }, {});
  assert.strictEqual(r.error.code, "UNAUTHORIZED", "a stranger must not learn about the input rules");
  const r2 = await call("user.rename", "POST", { name: "" }, { user: { id: 1 } });
  assert.strictEqual(r2.error.code, "BAD_REQUEST", "a logged-in user does get the input error");
});

test("callProcedure: the handler sees the ctx from the middleware", async () => {
  assert.deepStrictEqual(await call("user.rename", "POST", { name: "Anna" }, { user: { id: 7 } }), { ok: true, data: { by: 7, name: "Anna" } });
});

test("callProcedure: middlewares run in order, a returned ctx replaces the old one, no return keeps it", async () => {
  seen.length = 0;
  const r = await call("withCtx", "GET", undefined, { start: true });
  assert.deepStrictEqual(r, { ok: true, data: 2 });
  assert.deepStrictEqual(seen, ["one", "two", "three, returns nothing"]);
});

test("callProcedure: async middleware and async handler work", async () => {
  assert.deepStrictEqual(await call("asyncOne", "GET"), { ok: true, data: true });
});

test("callProcedure: a handler that returns nothing gives ok with undefined data", async () => {
  assert.deepStrictEqual(await call("ping", "GET"), { ok: true, data: undefined });
});

test("callProcedure: it never throws, even for odd input", async () => {
  for (const args of [{ router, path: undefined, method: "GET" }, { router: null, path: "a", method: "GET" }, { router, path: 42, method: "GET" }]) {
    const r = await callProcedure(args);
    assert.strictEqual(r.ok, false);
  }
});

// ---- Task 4: batchStatus ----

test("batchStatus: one status when all agree, 207 when they differ", () => {
  assert.strictEqual(batchStatus([200, 200, 200]), 200);
  assert.strictEqual(batchStatus([404, 404]), 404);
  assert.strictEqual(batchStatus([200, 404]), 207);
  assert.strictEqual(batchStatus([401, 404]), 207);
  assert.strictEqual(batchStatus([500]), 500);
  assert.strictEqual(batchStatus([]), 200);
});

// ---- Task 5: answers ----

test("answers: the five short answers", () => {
  assert.deepStrictEqual(answers, {
    typesExistAtRuntime: false,
    needsRuntimeValidator: true,
    queryHttpMethod: "GET",
    mutationHttpMethod: "POST",
    publicApiForOtherCompanies: "rest",
  });
});
