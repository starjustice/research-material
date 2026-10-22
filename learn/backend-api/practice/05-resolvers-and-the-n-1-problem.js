// Lesson 05: Resolvers and the N+1 problem. Implement batchLoader below, then run:
//   node --test learn/backend-api/practice/05-resolvers-and-the-n-1-problem.test.js
//
// You build a tiny DataLoader: one function that collects many load(key) calls made
// during the same tick, then asks the caller to fetch them all at once.
//
// ---- batchLoader(fn) returns { load(key) } ----
//
//   load(key) returns a Promise that resolves to the value for that key.
//
// Rules:
//   1. All load() calls made during the same event-loop tick are batched into one
//      call to fn(keys). keys is the array of keys in the order they were loaded.
//   2. fn(keys) returns (or resolves to) an array of values with the same length
//      and order as keys: values[i] is the value for keys[i].
//   3. The promise returned by load(key) resolves to the value at the matching
//      position in the batched result.
//   4. If two loads ask for the same key in the same tick, fn is called only once
//      for that key, but both promises resolve to the same value.
//   5. If a load is made in a later tick, it starts a new batch.
//   6. If fn rejects, every load promise in that batch rejects with the same error.
//
// No async/await inside batchLoader is required, but you may use it.
// The tests import only batchLoader.

function batchLoader(fn) {
  // TODO
}

module.exports = { batchLoader };
