const test = require("node:test");
const assert = require("node:assert");
const { PERMISSIONS_EXAMPLE, matches, runSelect, prepareInsert, choices } = require("./14-hasura-when-and-when-not");

const ana = { "x-hasura-role": "user", "x-hasura-user-id": "7" };
const budi = { "x-hasura-role": "user", "x-hasura-user-id": "8" };

// ---- Task 1: matches ----

test("matches: _eq compares as text, so 7 equals '7'", () => {
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _eq: 7 } }, {}), true);
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _eq: "7" } }, {}), true);
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _eq: 8 } }, {}), false);
});

test("matches: a value that starts with X-Hasura- is read from the session (any case)", () => {
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _eq: "X-Hasura-User-Id" } }, ana), true);
  assert.strictEqual(matches({ owner_id: 8 }, { owner_id: { _eq: "x-hasura-user-id" } }, ana), false);
  assert.strictEqual(matches({ owner_id: 8 }, { owner_id: { _eq: "X-HASURA-USER-ID" } }, budi), true);
});

test("matches: a missing session variable matches nothing (never more rows)", () => {
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _eq: "X-Hasura-User-Id" } }, {}), false);
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _eq: "X-Hasura-User-Id" } }, undefined), false);
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _neq: "X-Hasura-User-Id" } }, {}), false, "_neq with nothing to compare is also false");
});

test("matches: a row without the column matches nothing, even with a missing session variable", () => {
  assert.strictEqual(matches({ title: "x" }, { owner_id: { _eq: "X-Hasura-User-Id" } }, {}), false);
  assert.strictEqual(matches({ title: "x", owner_id: null }, { owner_id: { _eq: 1 } }, {}), false);
  assert.strictEqual(matches({ title: "x" }, { owner_id: { _neq: 1 } }, {}), false);
});

test("matches: _neq and _in", () => {
  assert.strictEqual(matches({ status: "open" }, { status: { _neq: "closed" } }, {}), true);
  assert.strictEqual(matches({ status: "closed" }, { status: { _neq: "closed" } }, {}), false);
  assert.strictEqual(matches({ status: "open" }, { status: { _in: ["open", "new"] } }, {}), true);
  assert.strictEqual(matches({ status: "done" }, { status: { _in: ["open", "new"] } }, {}), false);
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _in: ["X-Hasura-User-Id", 99] } }, ana), true);
  assert.strictEqual(matches({ owner_id: 7 }, { owner_id: { _in: [] } }, ana), false);
});

test("matches: an empty filter matches every row", () => {
  assert.strictEqual(matches({ id: 1 }, {}, {}), true);
});

test("matches: several columns in one filter are an AND", () => {
  const f = { owner_id: { _eq: 7 }, status: { _eq: "open" } };
  assert.strictEqual(matches({ owner_id: 7, status: "open" }, f, {}), true);
  assert.strictEqual(matches({ owner_id: 7, status: "closed" }, f, {}), false);
});

test("matches: _and, _or, _not", () => {
  const row = { owner_id: 7, is_public: true };
  assert.strictEqual(matches(row, { _or: [{ owner_id: { _eq: 99 } }, { is_public: { _eq: true } }] }, {}), true);
  assert.strictEqual(matches(row, { _or: [{ owner_id: { _eq: 99 } }, { is_public: { _eq: false } }] }, {}), false);
  assert.strictEqual(matches(row, { _and: [{ owner_id: { _eq: 7 } }, { is_public: { _eq: true } }] }, {}), true);
  assert.strictEqual(matches(row, { _and: [{ owner_id: { _eq: 7 } }, { is_public: { _eq: false } }] }, {}), false);
  assert.strictEqual(matches(row, { _not: { owner_id: { _eq: 99 } } }, {}), true);
  assert.strictEqual(matches(row, { _not: { owner_id: { _eq: 7 } } }, {}), false);
});

test("matches: an unknown operator is denied, and it never throws", () => {
  assert.strictEqual(matches({ a: 1 }, { a: { _gt: 0 } }, {}), false);
  for (const [row, filter] of [[null, {}], [undefined, {}], ["text", {}], [{}, null], [{}, "x"], [{ a: 1 }, { a: 5 }], [{ a: 1 }, { _or: "x" }]]) {
    assert.strictEqual(matches(row, filter, {}), false, `${JSON.stringify(row)} with ${JSON.stringify(filter)}`);
  }
});

// ---- Task 2: runSelect ----

const rows = [
  { id: 5, owner_id: 7, title: "shopping list", secret: "s5" },
  { id: 6, owner_id: 8, title: "private diary", secret: "s6" },
  { id: 9, owner_id: 7, title: "ideas", secret: "s9" },
  { id: 10, owner_id: 7, title: "plans", secret: "s10" },
  { id: 11, owner_id: 8, title: "more", secret: "s11" },
];
const select = (role, session) => runSelect({ permissions: PERMISSIONS_EXAMPLE, table: "notes", role, session, rows });

test("runSelect: a user gets only their own rows, only the allowed columns, and no more than the limit", () => {
  const r = select("user", ana);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.rows.map((n) => n.id), [5, 9], "rows 5, 9 and 10 are Ana's, but the limit is 2");
  assert.deepStrictEqual(Object.keys(r.rows[0]).sort(), ["id", "owner_id", "title"], "the secret column is not allowed");
});

test("runSelect: another user gets a different answer (the rule uses the session)", () => {
  assert.deepStrictEqual(select("user", budi).rows.map((n) => n.id), [6, 11]);
});

test("runSelect: with no user id in the session, nothing comes back (but it is not an error)", () => {
  assert.deepStrictEqual(select("user", {}), { ok: true, rows: [] });
  assert.deepStrictEqual(select("user", undefined), { ok: true, rows: [] });
});

test("runSelect: a role with an empty filter sees all rows, with its own columns", () => {
  const r = select("viewer", {});
  assert.strictEqual(r.rows.length, 5);
  assert.deepStrictEqual(Object.keys(r.rows[0]).sort(), ["id", "title"]);
});

test("runSelect: admin sees everything: all rows, all columns, no limit", () => {
  const r = select("admin", {});
  assert.strictEqual(r.rows.length, 5);
  assert.ok("secret" in r.rows[0]);
});

test("runSelect: a role with no rule gets an error", () => {
  assert.deepStrictEqual(select("anonymous", {}), { ok: false, error: "no access" });
  assert.deepStrictEqual(runSelect({ permissions: PERMISSIONS_EXAMPLE, table: "orders", role: "user", session: ana, rows }), { ok: false, error: "no access" });
});

test("runSelect: a role with no select rule (only insert) gets an error", () => {
  const permissions = { notes: { writer: { insert: { check: {}, columns: "*" } } } };
  assert.strictEqual(runSelect({ permissions, table: "notes", role: "writer", session: ana, rows }).ok, false);
});

test("runSelect: role names like toString or __proto__ are not rules", () => {
  for (const role of ["toString", "__proto__", "constructor", "hasOwnProperty"]) {
    assert.strictEqual(select(role, ana).ok, false, role);
  }
});

test("runSelect: columns '*' gives all columns, and a rule without a limit gives all matching rows", () => {
  const permissions = { notes: { staff: { select: { filter: { owner_id: { _eq: 7 } }, columns: "*" } } } };
  const r = runSelect({ permissions, table: "notes", role: "staff", session: {}, rows });
  assert.deepStrictEqual(r.rows.map((n) => n.id), [5, 9, 10]);
  assert.ok("secret" in r.rows[0]);
});

test("runSelect: it does not change the rows that came in", () => {
  const before = JSON.stringify(rows);
  const r = select("user", ana);
  r.rows[0].title = "changed";
  assert.strictEqual(JSON.stringify(rows), before);
});

// ---- Task 3: prepareInsert ----

const insert = (role, session, input) => prepareInsert({ permissions: PERMISSIONS_EXAMPLE, table: "notes", role, session, input });

test("prepareInsert: the preset sets the owner", () => {
  assert.deepStrictEqual(insert("user", ana, { title: "milk" }), { ok: true, row: { title: "milk", owner_id: "7" } });
});

test("prepareInsert: the client cannot choose the owner. The preset wins.", () => {
  assert.deepStrictEqual(insert("user", ana, { title: "milk", owner_id: 8 }), { ok: true, row: { title: "milk", owner_id: "7" } });
});

test("prepareInsert: a column that is not allowed is an error", () => {
  assert.deepStrictEqual(insert("user", ana, { title: "milk", id: 99 }), { ok: false, error: "column not allowed: id" });
});

test("prepareInsert: with no user id in the session, the check fails", () => {
  assert.deepStrictEqual(insert("user", {}, { title: "milk" }), { ok: false, error: "check failed" });
});

test("prepareInsert: a check that depends on the input", () => {
  const permissions = { notes: { editor: { insert: { check: { _or: [{ title: { _eq: "ok" } }, { title: { _eq: "fine" } }] }, columns: ["title"] } } } };
  const go = (title) => prepareInsert({ permissions, table: "notes", role: "editor", session: {}, input: { title } });
  assert.deepStrictEqual(go("ok"), { ok: true, row: { title: "ok" } });
  assert.deepStrictEqual(go("bad"), { ok: false, error: "check failed" });
});

test("prepareInsert: a role with no insert rule gets an error", () => {
  assert.deepStrictEqual(insert("viewer", ana, { title: "milk" }), { ok: false, error: "no access" });
  assert.deepStrictEqual(insert("anonymous", ana, { title: "milk" }), { ok: false, error: "no access" });
  assert.deepStrictEqual(insert("toString", ana, { title: "milk" }), { ok: false, error: "no access" });
});

test("prepareInsert: admin may insert any column", () => {
  assert.deepStrictEqual(insert("admin", {}, { id: 1, title: "x", owner_id: 8 }), { ok: true, row: { id: 1, title: "x", owner_id: 8 } });
});

test("prepareInsert: columns '*' allows any column", () => {
  const permissions = { notes: { staff: { insert: { check: {}, columns: "*" } } } };
  assert.deepStrictEqual(prepareInsert({ permissions, table: "notes", role: "staff", session: {}, input: { a: 1, b: 2 } }), { ok: true, row: { a: 1, b: 2 } });
});

test("prepareInsert: it does not change the input", () => {
  const input = { title: "milk", owner_id: 8 };
  assert.strictEqual(insert("user", ana, input).ok, true);
  assert.deepStrictEqual(input, { title: "milk", owner_id: 8 });
});

// ---- Task 4: choices ----

test("choices: where each job belongs", () => {
  assert.deepStrictEqual(choices, {
    adminPanelForOnePostgresTeam: "hasura",
    redeemPointsCallingAThirdPartyApi: "action",
    sendEmailAfterAnOrderRowIsInserted: "event trigger",
    checkoutWithManyStepsAndMoneyRules: "own service",
    rateLimitingOnFreeSelfHostedHasura: "gateway",
  });
});
