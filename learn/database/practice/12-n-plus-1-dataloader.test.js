const test = require("node:test");
const assert = require("node:assert");
const {
  makeFakeDb, loadOrdersOneByOne, loadOrdersForStores, createLoader,
} = require("./12-n-plus-1-dataloader");

const ids = list => list.map(orders => orders.map(o => o.id));

// ---- The problem (this one passes from the start) ----

test("the N+1 way: 5 stores means 5 queries for the orders", async () => {
  const db = makeFakeDb();
  const result = await loadOrdersOneByOne(db, [1, 2, 3, 4, 5]);
  assert.deepStrictEqual(ids(result), [[1, 2, 4], [3, 6], [5, 8], [7], []]);
  assert.strictEqual(db.queries.length, 5);
});

// ---- Task 1: loadOrdersForStores ----

test("task 1: 5 stores, only 1 query", async () => {
  const db = makeFakeDb();
  await loadOrdersForStores(db, [1, 2, 3, 4, 5]);
  assert.strictEqual(db.queries.length, 1, "send ONE query with all the ids");
});

test("task 1: gives the same result as the N+1 way", async () => {
  const db = makeFakeDb();
  const result = await loadOrdersForStores(db, [1, 2, 3, 4, 5]);
  assert.ok(Array.isArray(result), "return a list");
  assert.deepStrictEqual(ids(result), [[1, 2, 4], [3, 6], [5, 8], [7], []]);
});

test("task 1: keeps the order of storeIds, and gives [] to a store with no orders", async () => {
  const db = makeFakeDb();
  const result = await loadOrdersForStores(db, [5, 3, 1]);
  assert.deepStrictEqual(ids(result), [[], [5, 8], [1, 2, 4]]);
});

// ---- Task 2: createLoader ----

test("task 2: load() does not send a query right away", async () => {
  let calls = 0;
  const loader = createLoader(async keys => { calls++; return keys.map(k => k * 10); });
  const p = loader.load(1);
  assert.strictEqual(calls, 0, "wait until the running code has finished");
  assert.strictEqual(await p, 10);
  assert.strictEqual(calls, 1);
});

test("task 2: three loads in the same tick make ONE batch with all three keys", async () => {
  const batches = [];
  const loader = createLoader(async keys => { batches.push(keys); return keys.map(k => k * 10); });
  const values = await Promise.all([loader.load(1), loader.load(2), loader.load(3)]);
  assert.deepStrictEqual(values, [10, 20, 30]);
  assert.deepStrictEqual(batches, [[1, 2, 3]]);
});

test("task 2: loads in two different ticks make two batches", async () => {
  const batches = [];
  const loader = createLoader(async keys => { batches.push(keys); return keys.map(k => k * 10); });
  await loader.load(1);
  await loader.load(2);
  assert.deepStrictEqual(batches, [[1], [2]]);
});

test("task 2: the same key twice is sent only once, and both get the value", async () => {
  const batches = [];
  const loader = createLoader(async keys => { batches.push(keys); return keys.map(k => k * 10); });
  const values = await Promise.all([loader.load(7), loader.load(7), loader.load(8)]);
  assert.deepStrictEqual(values, [70, 70, 80]);
  assert.deepStrictEqual(batches, [[7, 8]]);
});

test("task 2: if the batch fails, every waiting load fails", async () => {
  const loader = createLoader(async () => { throw new Error("database is down"); });
  const results = await Promise.allSettled([loader.load(1), loader.load(2)]);
  assert.deepStrictEqual(results.map(r => r.status), ["rejected", "rejected"]);
  assert.strictEqual(results[0].reason.message, "database is down");
});

// ---- Both together: what a GraphQL server does ----

test("together: 5 store resolvers each ask for their orders, the database sees 1 query", async () => {
  const db = makeFakeDb();
  const ordersLoader = createLoader(storeIds => loadOrdersForStores(db, storeIds));
  const stores = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  // Like the resolver Store.orders, called once for every store:
  const result = await Promise.all(stores.map(store => ordersLoader.load(store.id)));
  assert.deepStrictEqual(ids(result), [[1, 2, 4], [3, 6], [5, 8], [7], []]);
  assert.strictEqual(db.queries.length, 1);
  assert.strictEqual(db.queries[0], "WHERE store_id = ANY([1,2,3,4,5])");
});
