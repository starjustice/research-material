const test = require("node:test");
const assert = require("node:assert");
const { validateSignup, AppError, toProblem, makeErrorHandler, codes } = require("./10-validation-and-error-handling");

const good = { name: "Ana", email: "ana@example.com", age: 30 };

// ---- Task 1: validateSignup ----

test("validateSignup: a good body passes and is cleaned", () => {
  assert.deepStrictEqual(validateSignup(good), { ok: true, value: good });
});

test("validateSignup: it trims the name, trims and lowercases the email, turns '30' into 30", () => {
  const r = validateSignup({ name: "  Ana  ", email: "  Ana@Example.COM ", age: "30" });
  assert.deepStrictEqual(r, { ok: true, value: { name: "Ana", email: "ana@example.com", age: 30 } });
});

test("validateSignup: fields that are not in the rules are dropped", () => {
  const r = validateSignup({ ...good, role: "admin", admin: true });
  assert.deepStrictEqual(r.value, good, "role and admin must not be in the value");
});

test("validateSignup: it reports ALL wrong fields, and only the wrong ones", () => {
  const r = validateSignup({ name: "", email: "ana@", age: "17" });
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(Object.keys(r.errors).sort(), ["age", "email", "name"]);
  for (const key of Object.keys(r.errors)) {
    assert.ok(Array.isArray(r.errors[key]) && r.errors[key].length > 0, `${key} needs at least one message`);
    assert.ok(r.errors[key].every((m) => typeof m === "string" && m.length > 0));
  }
  const r2 = validateSignup({ ...good, age: 12 });
  assert.deepStrictEqual(Object.keys(r2.errors), ["age"], "only age failed");
});

test("validateSignup: email rule", () => {
  for (const email of ["ana", "ana@", "@example.com", "ana@example", "a b@example.com", 5, null, undefined]) {
    assert.strictEqual(validateSignup({ ...good, email }).ok, false, `email ${String(email)} should fail`);
  }
  assert.strictEqual(validateSignup({ ...good, email: "a@b.c" }).ok, true);
});

test("validateSignup: age rule", () => {
  for (const age of ["abc", "30.5", "", 17.5, 17, 121, true, null, undefined, "-30", {}]) {
    assert.strictEqual(validateSignup({ ...good, age }).ok, false, `age ${JSON.stringify(age)} should fail`);
  }
  for (const age of [18, 120, "18", "120", " 40 "]) {
    assert.strictEqual(validateSignup({ ...good, age }).ok, true, `age ${JSON.stringify(age)} should pass`);
  }
});

test("validateSignup: name rule (1 to 50 characters after trim)", () => {
  assert.strictEqual(validateSignup({ ...good, name: "   " }).ok, false);
  assert.strictEqual(validateSignup({ ...good, name: "x".repeat(51) }).ok, false);
  assert.strictEqual(validateSignup({ ...good, name: "x".repeat(50) }).ok, true);
  assert.strictEqual(validateSignup({ ...good, name: 42 }).ok, false);
});

test("validateSignup: it never throws, and a body that is not an object gets errors.body", () => {
  for (const body of [null, undefined, "text", 42, [], [good]]) {
    const r = validateSignup(body);
    assert.strictEqual(r.ok, false);
    assert.deepStrictEqual(Object.keys(r.errors), ["body"]);
  }
});

// ---- Task 2: AppError ----

test("AppError: carries status, message and expose", () => {
  const e = new AppError(409, "That email is already used.");
  assert.ok(e instanceof Error);
  assert.strictEqual(e.status, 409);
  assert.strictEqual(e.message, "That email is already used.");
  assert.strictEqual(e.expose, true);
});

test("AppError: a 5xx error is not safe to show", () => {
  assert.strictEqual(new AppError(500, "db down").expose, false);
  assert.strictEqual(new AppError(503, "busy").expose, false);
});

// ---- Task 3: toProblem ----

test("toProblem: a known error keeps its status and message", () => {
  const p = toProblem(new AppError(409, "That email is already used."));
  assert.strictEqual(p.status, 409);
  assert.deepStrictEqual(p.body, { type: "about:blank", title: "Conflict", status: 409, detail: "That email is already used." });
});

test("toProblem: an error from a library that says expose is true is known (like body-parser)", () => {
  const err = Object.assign(new Error("Unexpected end of JSON input"), { status: 400, type: "entity.parse.failed", expose: true });
  const p = toProblem(err);
  assert.strictEqual(p.status, 400);
  assert.strictEqual(p.body.title, "Bad Request");
  assert.strictEqual(p.body.detail, "Unexpected end of JSON input");
});

test("toProblem: an unknown error becomes a safe 500 and its message never leaks", () => {
  const secret = "connect ECONNREFUSED 10.0.0.5:5432 password=hunter2";
  const p = toProblem(new Error(secret));
  assert.strictEqual(p.status, 500);
  assert.deepStrictEqual(p.body, {
    type: "about:blank", title: "Internal Server Error", status: 500, detail: "Something went wrong. Try again later.",
  });
  assert.ok(!JSON.stringify(p).includes("hunter2"));
});

test("toProblem: a status without expose is NOT trusted", () => {
  const p = toProblem(Object.assign(new Error("secret table name"), { status: 404 }));
  assert.strictEqual(p.status, 500);
  assert.ok(!JSON.stringify(p).includes("secret"));
});

test("toProblem: a 5xx error that says expose is true is still not trusted", () => {
  const p = toProblem(Object.assign(new Error("secret"), { status: 503, expose: true }));
  assert.strictEqual(p.status, 500);
  assert.ok(!JSON.stringify(p).includes("secret"));
});

test("toProblem: it never throws, whatever it gets", () => {
  for (const err of [null, undefined, "a string", 42, {}, [], { status: "400", expose: true }]) {
    const p = toProblem(err);
    assert.strictEqual(p.status, 500, `${JSON.stringify(err)} should give 500`);
    assert.strictEqual(p.body.status, 500);
  }
});

test("toProblem: an unknown title falls back to 'Error'", () => {
  const p = toProblem(new AppError(418, "I am a teapot"));
  assert.strictEqual(p.status, 418);
  assert.strictEqual(p.body.title, "Error");
});

// ---- Task 4: makeErrorHandler ----

function fakeRes(headersSent = false) {
  return {
    headersSent, statusCode: null, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    type(t) { this.headers["content-type"] = t; return this; },
    json(b) { this.body = b; return this; },
  };
}

test("makeErrorHandler: logs the real error, answers with a safe body", () => {
  const logged = [];
  const handler = makeErrorHandler((e) => logged.push(e));
  const err = new Error("password=hunter2");
  const res = fakeRes();
  handler(err, {}, res, () => assert.fail("next must not be called"));
  assert.strictEqual(logged.length, 1);
  assert.strictEqual(logged[0], err, "the log gets the original error");
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.headers["content-type"], "application/problem+json");
  assert.ok(!JSON.stringify(res.body).includes("hunter2"));
});

test("makeErrorHandler: a known error is sent as it is", () => {
  const handler = makeErrorHandler(() => {});
  const res = fakeRes();
  handler(new AppError(422, "Age must be 18 or more"), {}, res, () => {});
  assert.strictEqual(res.statusCode, 422);
  assert.strictEqual(res.body.detail, "Age must be 18 or more");
});

test("makeErrorHandler: if the answer already started, pass the error on", () => {
  const handler = makeErrorHandler(() => {});
  const res = fakeRes(true);
  const err = new Error("late");
  let passed = null;
  handler(err, {}, res, (e) => { passed = e; });
  assert.strictEqual(passed, err);
  assert.strictEqual(res.statusCode, null, "it must not try to answer a second time");
});

test("makeErrorHandler: it has four inputs, so Express knows it is an error handler", () => {
  assert.strictEqual(makeErrorHandler(() => {}).length, 4);
});

// ---- Task 5: codes ----

test("codes: the right status for each case", () => {
  assert.deepStrictEqual(codes, {
    duplicateEmail: 409,
    brokenJson: 400,
    ageTooSmall: 422,
    noToken: 401,
    bugInOurCode: 500,
  });
});
