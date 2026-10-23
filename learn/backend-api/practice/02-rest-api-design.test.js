const test = require("node:test");
const assert = require("node:assert");
const { cursorPage, routeFor, isBreakingChange } = require("./02-rest-api-design");

// orders 30, 29, ..., 1: newest first
const make = (from, to) => {
  const list = [];
  for (let id = from; id >= to; id--) list.push({ id });
  return list;
};
const ids = (page) => page.data.map((o) => o.id);

// ---- Part 1: cursor paging ----

test("page 1 with no cursor starts from the top", () => {
  const page = cursorPage(make(30, 1), { limit: 5 });
  assert.deepStrictEqual(ids(page), [30, 29, 28, 27, 26]);
  assert.strictEqual(page.has_more, true);
  assert.strictEqual(page.next_cursor, 26);
});

test("the default limit is 20", () => {
  const page = cursorPage(make(30, 1));
  assert.strictEqual(page.data.length, 20);
  assert.strictEqual(page.next_cursor, 11);
});

test("page 2 starts after the cursor", () => {
  const page = cursorPage(make(30, 1), { after: 26, limit: 5 });
  assert.deepStrictEqual(ids(page), [25, 24, 23, 22, 21]);
  assert.strictEqual(page.next_cursor, 21);
});

test("a new order at the top does not change page 2", () => {
  const items = [{ id: 31 }, ...make(30, 1)];
  const page = cursorPage(items, { after: 26, limit: 5 });
  assert.deepStrictEqual(ids(page), [25, 24, 23, 22, 21]);
});

test("the cursor still works when that order was deleted", () => {
  const items = make(30, 1).filter((o) => o.id !== 26);
  const page = cursorPage(items, { after: 26, limit: 5 });
  assert.deepStrictEqual(ids(page), [25, 24, 23, 22, 21]);
});

test("the last page has has_more false and next_cursor null", () => {
  const page = cursorPage(make(30, 1), { after: 3, limit: 5 });
  assert.deepStrictEqual(page, { data: [{ id: 2 }, { id: 1 }], next_cursor: null, has_more: false });
});

test("a full last page still says there is no more", () => {
  const page = cursorPage(make(30, 1), { after: 6, limit: 5 });
  assert.deepStrictEqual(ids(page), [5, 4, 3, 2, 1]);
  assert.strictEqual(page.has_more, false);
  assert.strictEqual(page.next_cursor, null);
});

test("after the very last order, or on an empty list, data is empty", () => {
  const empty = { data: [], next_cursor: null, has_more: false };
  assert.deepStrictEqual(cursorPage(make(30, 1), { after: 1, limit: 5 }), empty);
  assert.deepStrictEqual(cursorPage([], { limit: 5 }), empty);
});

test("after: null starts from the top too", () => {
  assert.deepStrictEqual(ids(cursorPage(make(30, 1), { after: null, limit: 2 })), [30, 29]);
});

test("a limit above maxLimit is cut down to maxLimit", () => {
  assert.strictEqual(cursorPage(make(300, 1), { limit: 100000 }).data.length, 100);
  assert.strictEqual(cursorPage(make(300, 1), { limit: 50, maxLimit: 10 }).data.length, 10);
});

test("a limit below 1 throws a RangeError", () => {
  assert.throws(() => cursorPage(make(30, 1), { limit: 0 }), RangeError);
  assert.throws(() => cursorPage(make(30, 1), { limit: -5 }), RangeError);
});

test("the items array is not changed", () => {
  const items = make(10, 1);
  const page = cursorPage(items, { after: 8, limit: 3 });
  assert.deepStrictEqual(ids(page), [7, 6, 5]);
  assert.deepStrictEqual(items, make(10, 1));
});

// ---- Part 2: method, path and status ----

test("list and create use the collection path", () => {
  assert.deepStrictEqual(routeFor({ action: "list", resource: "orders" }), { method: "GET", path: "/orders", status: 200 });
  assert.deepStrictEqual(routeFor({ action: "create", resource: "orders" }), { method: "POST", path: "/orders", status: 201 });
});

test("read, replace, update and delete use the item path", () => {
  assert.deepStrictEqual(routeFor({ action: "read", resource: "orders", id: 41 }), { method: "GET", path: "/orders/41", status: 200 });
  assert.deepStrictEqual(routeFor({ action: "replace", resource: "orders", id: 41 }), { method: "PUT", path: "/orders/41", status: 200 });
  assert.deepStrictEqual(routeFor({ action: "update", resource: "orders", id: 41 }), { method: "PATCH", path: "/orders/41", status: 200 });
  assert.deepStrictEqual(routeFor({ action: "delete", resource: "orders", id: 41 }), { method: "DELETE", path: "/orders/41", status: 204 });
});

test("list and create nest one level under a parent", () => {
  const parent = { resource: "stores", id: 7 };
  assert.deepStrictEqual(routeFor({ action: "list", resource: "orders", parent }), { method: "GET", path: "/stores/7/orders", status: 200 });
  assert.deepStrictEqual(routeFor({ action: "create", resource: "orders", parent }), { method: "POST", path: "/stores/7/orders", status: 201 });
});

test("one item keeps its own short path, even with a parent", () => {
  const parent = { resource: "stores", id: 7 };
  assert.deepStrictEqual(routeFor({ action: "read", resource: "orders", id: 41, parent }), { method: "GET", path: "/orders/41", status: 200 });
});

test("an action that is not create, read, update or delete becomes POST on the item", () => {
  assert.deepStrictEqual(routeFor({ action: "cancel", resource: "orders", id: 41 }), { method: "POST", path: "/orders/41/cancel", status: 200 });
  assert.deepStrictEqual(routeFor({ action: "pay", resource: "invoices", id: "inv_9" }), { method: "POST", path: "/invoices/inv_9/pay", status: 200 });
});

test("a singular resource name throws", () => {
  assert.throws(() => routeFor({ action: "list", resource: "order" }), Error);
});

test("an item action with no id throws", () => {
  assert.throws(() => routeFor({ action: "read", resource: "orders" }), Error);
  assert.throws(() => routeFor({ action: "cancel", resource: "orders", id: null }), Error);
});

// ---- Part 3: breaking change or not ----

test("adding a field is not breaking", () => {
  assert.strictEqual(isBreakingChange(["id", "status"], ["id", "status", "total"]), false);
});

test("removing or renaming a field is breaking", () => {
  assert.strictEqual(isBreakingChange(["id", "status", "total"], ["id", "status"]), true);
  assert.strictEqual(isBreakingChange(["id", "total_price"], ["id", "totalPrice"]), true);
});

test("the same fields in a different order are not breaking", () => {
  assert.strictEqual(isBreakingChange(["id", "status"], ["status", "id"]), false);
});
