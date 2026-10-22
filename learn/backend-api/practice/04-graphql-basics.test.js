const test = require("node:test");
const assert = require("node:assert");
const { validate, execute, run } = require("./04-graphql-basics");

const schema = {
  Query: { orders: "[Order]", shop: "Shop" },
  Order: { id: "ID", status: "String", total: "Int", note: "String", shop: "Shop" },
  Shop: { id: "ID", name: "String", city: "String" },
};

const tokoMaju = { id: "3", name: "Toko Maju", city: "Bandung" };
const makeRoot = (calls = []) => ({
  orders: () => {
    calls.push("orders");
    return [
      { id: "41", status: "PAID", total: 250000, note: "leave at gate", shop: tokoMaju },
      { id: "42", status: "NEW", total: 90000, note: null, shop: tokoMaju },
    ];
  },
  shop: () => {
    calls.push("shop");
    return tokoMaju;
  },
});

// ---- Part 1: validate ----

test("a good query has no messages", () => {
  assert.deepStrictEqual(validate(schema, { orders: { id: true, status: true, shop: { name: true } } }), []);
});

test("an unknown field is reported with its type", () => {
  assert.deepStrictEqual(validate(schema, { orders: { id: true, price: true } }), [
    'Cannot query field "price" on type "Order".',
  ]);
});

test("an unknown field at the top is reported on Query", () => {
  assert.deepStrictEqual(validate(schema, { customers: { id: true } }), ['Cannot query field "customers" on type "Query".']);
});

test("an object field selected with true must list its subfields", () => {
  assert.deepStrictEqual(validate(schema, { orders: { id: true, shop: true } }), [
    'Field "shop" of type "Shop" must have a selection of subfields.',
  ]);
});

test("a list field selected with true keeps the brackets in the message", () => {
  assert.deepStrictEqual(validate(schema, { orders: true }), [
    'Field "orders" of type "[Order]" must have a selection of subfields.',
  ]);
});

test("a scalar field cannot have subfields", () => {
  assert.deepStrictEqual(validate(schema, { orders: { id: { value: true } } }), [
    'Field "id" must not have a selection since type "ID" has no subfields.',
  ]);
});

test("every problem is reported, in the order of the query, at any depth", () => {
  assert.deepStrictEqual(validate(schema, { orders: { price: true, shop: { name: true, owner: true } }, shop: true }), [
    'Cannot query field "price" on type "Order".',
    'Cannot query field "owner" on type "Shop".',
    'Field "shop" of type "Shop" must have a selection of subfields.',
  ]);
});

test("validate can start at another type", () => {
  assert.deepStrictEqual(validate(schema, { name: true, phone: true }, "Shop"), ['Cannot query field "phone" on type "Shop".']);
});

// ---- Part 2: execute ----

test("only the asked fields come back, even though the order has more", () => {
  const data = execute(schema, makeRoot(), { orders: { id: true, status: true } });
  assert.deepStrictEqual(data, { orders: [{ id: "41", status: "PAID" }, { id: "42", status: "NEW" }] });
});

test("the answer has the same shape and order as the query", () => {
  const data = execute(schema, makeRoot(), { orders: { status: true, shop: { name: true }, id: true } });
  assert.deepStrictEqual(Object.keys(data.orders[0]), ["status", "shop", "id"]);
  assert.deepStrictEqual(data.orders[0], { status: "PAID", shop: { name: "Toko Maju" }, id: "41" });
});

test("nested objects are filled in one call: no second trip for the shop", () => {
  const calls = [];
  const data = execute(schema, makeRoot(calls), { orders: { id: true, shop: { name: true, city: true } } });
  assert.deepStrictEqual(data.orders[1], { id: "42", shop: { name: "Toko Maju", city: "Bandung" } });
  assert.deepStrictEqual(calls, ["orders"]);
});

test("two top-level fields in one query", () => {
  const calls = [];
  const data = execute(schema, makeRoot(calls), { shop: { name: true }, orders: { id: true } });
  assert.deepStrictEqual(data, { shop: { name: "Toko Maju" }, orders: [{ id: "41" }, { id: "42" }] });
  assert.deepStrictEqual(calls, ["shop", "orders"]);
});

test("null stays null and a missing value becomes null", () => {
  const data = execute(schema, { shop: () => ({ id: "9", name: null }) }, { shop: { id: true, name: true, city: true } });
  assert.deepStrictEqual(data, { shop: { id: "9", name: null, city: null } });
});

test("a function on any object is called, not only on root", () => {
  const root = { shop: { id: "3", name: () => "Toko " + "Maju" } };
  assert.deepStrictEqual(execute(schema, root, { shop: { name: true } }), { shop: { name: "Toko Maju" } });
});

// ---- Part 3: run ----

test("a good query gives { data }", () => {
  assert.deepStrictEqual(run(schema, makeRoot(), { orders: { id: true } }), { data: { orders: [{ id: "41" }, { id: "42" }] } });
});

test("a bad query gives { errors } and no data key", () => {
  const result = run(schema, makeRoot(), { orders: { id: true, price: true } });
  assert.deepStrictEqual(result, { errors: [{ message: 'Cannot query field "price" on type "Order".' }] });
  assert.strictEqual("data" in result, false);
});

test("a bad query runs nothing: no function is called", () => {
  const calls = [];
  const result = run(schema, makeRoot(calls), { shop: { name: true }, orders: { price: true } });
  assert.strictEqual(result.errors.length, 1);
  assert.deepStrictEqual(calls, []);
});
