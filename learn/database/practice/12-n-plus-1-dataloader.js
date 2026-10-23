// Lesson 12: N+1 queries and ORMs. The JavaScript part.
// Write the two functions marked TODO, then run (from the folder that contains learn/):
//   node --test learn/database/practice/12-n-plus-1-dataloader.test.js
//
// No npm install is needed. There is no real database here.
// makeFakeDb() is a pretend database that counts every query you send.
// The data is the same as the tiny tables in 12-n-plus-1-queries-and-orms.sql.

// ---------------------------------------------------------------------------
// The pretend database (do not change it)
// ---------------------------------------------------------------------------
function makeFakeDb() {
  const orders = [
    { id: 1, store_id: 1, total_cents: 500 },
    { id: 2, store_id: 1, total_cents: 700 },
    { id: 3, store_id: 2, total_cents: 300 },
    { id: 4, store_id: 1, total_cents: 200 },
    { id: 5, store_id: 3, total_cents: 900 },
    { id: 6, store_id: 2, total_cents: 400 },
    { id: 7, store_id: 4, total_cents: 1000 },
    { id: 8, store_id: 3, total_cents: 100 },
  ];
  const db = {
    queries: [], // every "SQL" you send is saved here, so the tests can count them

    // Like: SELECT * FROM orders WHERE store_id = $1
    async ordersOfStore(storeId) {
      db.queries.push(`WHERE store_id = ${storeId}`);
      return orders.filter(o => o.store_id === storeId);
    },

    // Like: SELECT * FROM orders WHERE store_id = ANY($1)
    // The rows come back sorted by order id, NOT grouped by store. Like a real database.
    async ordersOfStores(storeIds) {
      db.queries.push(`WHERE store_id = ANY([${storeIds.join(",")}])`);
      return orders.filter(o => storeIds.includes(o.store_id));
    },
  };
  return db;
}

// ---------------------------------------------------------------------------
// The slow way, already written: one query per store (the N+1 pattern)
// ---------------------------------------------------------------------------
async function loadOrdersOneByOne(db, storeIds) {
  const result = [];
  for (const id of storeIds) {
    result.push(await db.ordersOfStore(id)); // one trip per store
  }
  return result;
}

// ---------------------------------------------------------------------------
// Task 1. The batch way.
// Get the orders of ALL the stores with ONE call to db.ordersOfStores.
// Return a list with the same length and order as storeIds.
// Each item is the list of orders of that store. A store with no orders gets [].
// Example: loadOrdersForStores(db, [2, 5]) gives
//   [ [ {id:3,...}, {id:6,...} ], [] ]   and db.queries.length is 1.
// ---------------------------------------------------------------------------
async function loadOrdersForStores(db, storeIds) {
  // TODO
}

// ---------------------------------------------------------------------------
// Task 2. A tiny DataLoader.
// createLoader(batchFn) gives back an object with load(key).
// - load(key) returns a promise for the value of that key.
// - Do NOT call batchFn right away. Put the key in a waiting list.
// - When the code that is running now has finished, call batchFn ONE time
//   with all the waiting keys. Hint: process.nextTick(fn) runs fn
//   right after the code that is running now.
// - batchFn(keys) returns a promise of a list of values, in the same order as keys.
//   Give each waiting promise its own value.
// - If the same key is asked twice before the batch goes, send it to batchFn only once.
// - If batchFn fails, every waiting promise must fail (reject) with that error.
// ---------------------------------------------------------------------------
function createLoader(batchFn) {
  // TODO
}

module.exports = { makeFakeDb, loadOrdersOneByOne, loadOrdersForStores, createLoader };
