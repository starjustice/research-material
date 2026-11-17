const test = require("node:test");
const assert = require("node:assert");
const { SCHEMA, quoteIdent, buildSelect, choices } = require("./27-orms-and-query-tools-compared");

// ---- Task 1: quoteIdent ----

test("quoteIdent: a known name is put in double quotes", () => {
  assert.strictEqual(quoteIdent("id", ["id", "status"]), '"id"');
  assert.strictEqual(quoteIdent("status", ["id", "status"]), '"status"');
});

test("quoteIdent: a name that is not allowed throws", () => {
  assert.strictEqual(quoteIdent("id", ["id"]), '"id"', "first the plain yes");
  assert.throws(() => quoteIdent("total_cent", ["id", "total_cents"]), Error, "a typo must throw");
  assert.throws(() => quoteIdent("id; DROP TABLE orders", ["id"]), Error, "injection must throw");
  assert.throws(() => quoteIdent('id"', ["id"]), Error);
});

test("quoteIdent: bad input throws and never gives back a name", () => {
  assert.strictEqual(quoteIdent("id", ["id"]), '"id"', "first the plain yes");
  assert.throws(() => quoteIdent(undefined, ["id"]), Error);
  assert.throws(() => quoteIdent("id", undefined), Error);
  assert.throws(() => quoteIdent("toString", ["id"]), Error);
});

// ---- Task 2: buildSelect ----

test("buildSelect: the same SQL that Kysely printed in the lesson", () => {
  const out = buildSelect({
    table: "orders", columns: ["id", "total_cents"],
    where: { store_id: 1, status: "paid" },
    orderBy: { column: "id", direction: "desc" }, limit: 10,
  }, SCHEMA);
  assert.deepStrictEqual(out, {
    sql: 'select "id", "total_cents" from "orders" where "store_id" = $1 and "status" = $2 order by "id" desc limit $3',
    params: [1, "paid", 10],
  });
});

test("buildSelect: parts that are not asked for are left out", () => {
  assert.deepStrictEqual(
    buildSelect({ table: "stores", columns: ["id", "name"] }, SCHEMA),
    { sql: 'select "id", "name" from "stores"', params: [] }
  );
  assert.deepStrictEqual(
    buildSelect({ table: "orders", columns: ["id"], limit: 5 }, SCHEMA),
    { sql: 'select "id" from "orders" limit $1', params: [5] }
  );
  assert.deepStrictEqual(
    buildSelect({ table: "orders", columns: ["id"], where: { status: "open" } }, SCHEMA),
    { sql: 'select "id" from "orders" where "status" = $1', params: ["open"] }
  );
});

test("buildSelect: values are never put into the SQL text", () => {
  const out = buildSelect({ table: "orders", columns: ["id"], where: { status: "paid'; DROP TABLE orders; --" } }, SCHEMA);
  assert.strictEqual(out.sql, 'select "id" from "orders" where "status" = $1', "first the plain yes");
  assert.deepStrictEqual(out.params, ["paid'; DROP TABLE orders; --"]);
});

test("buildSelect: an unknown table or column throws before any SQL is made", () => {
  assert.strictEqual(buildSelect({ table: "orders", columns: ["id"] }, SCHEMA).sql, 'select "id" from "orders"', "first the plain yes");
  assert.throws(() => buildSelect({ table: "users", columns: ["id"] }, SCHEMA), Error);
  assert.throws(() => buildSelect({ table: "orders", columns: ["id", "total_cent"] }, SCHEMA), Error);
  assert.throws(() => buildSelect({ table: "orders", columns: ["name"] }, SCHEMA), Error, "name is a column of stores, not orders");
  assert.throws(() => buildSelect({ table: "orders", columns: ["id"], where: { storeid: 1 } }, SCHEMA), Error);
  assert.throws(() => buildSelect({ table: "orders", columns: ["id"], orderBy: { column: "nope", direction: "asc" } }, SCHEMA), Error);
});

test("buildSelect: a bad direction or limit throws", () => {
  const ok = { table: "orders", columns: ["id"], orderBy: { column: "id", direction: "asc" }, limit: 3 };
  assert.deepStrictEqual(buildSelect(ok, SCHEMA), { sql: 'select "id" from "orders" order by "id" asc limit $1', params: [3] }, "first the plain yes");
  assert.throws(() => buildSelect({ ...ok, orderBy: { column: "id", direction: "sideways" } }, SCHEMA), Error);
  assert.throws(() => buildSelect({ ...ok, orderBy: { column: "id", direction: "asc; DROP TABLE orders" } }, SCHEMA), Error);
  assert.throws(() => buildSelect({ ...ok, limit: 0 }, SCHEMA), Error);
  assert.throws(() => buildSelect({ ...ok, limit: -1 }, SCHEMA), Error);
  assert.throws(() => buildSelect({ ...ok, limit: 2.5 }, SCHEMA), Error);
  assert.throws(() => buildSelect({ ...ok, limit: "10; DROP TABLE orders" }, SCHEMA), Error);
});

// ---- Task 3: choices ----

test("choices: pick the right tool for each situation", () => {
  assert.deepStrictEqual(choices, {
    oneHeavyReportWithWindowFunctions: "raw-sql",
    typedQueriesThatStillReadLikeSql: "query-builder",
    modelsRelationsAndMigrationsFromOneSchemaFile: "orm",
    quickCrudApiWithRowRulesAndNoResolverCode: "hasura",
  });
});
