// Lesson 23: SQL vs NoSQL and Redis. The JavaScript part: a cache with a time to live, cache-aside, and no stampede.
// Write the three things marked TODO, then run (from the folder that contains learn/):
//   node --test learn/database/practice/23-cache-aside.test.js
//
// No npm install is needed. There is no Redis and no database here.
// The cache gets a clock (now) as an argument, so the tests can move time without waiting.
// A real Redis does the same job with SET key value EX seconds, and GET key.

// ---------------------------------------------------------------------------
// Task 1. A cache with a time to live (ttl).
//   cache.set(key, value, ttlMs)   keep the value for ttlMs milliseconds
//   cache.get(key)                 the value, or undefined if it is missing or has expired
//   cache.del(key)                 forget the key now
// A key that was set at time T with ttlMs is gone at time T + ttlMs (not one millisecond later).
// now() gives the current time in milliseconds.
// ---------------------------------------------------------------------------
function makeCache(now) {
  // TODO
}

// ---------------------------------------------------------------------------
// Task 2. Cache-aside.
//   cachedGet(cache, key, ttlMs, load) is async.
//   1. If the cache has the key, return it. Do NOT call load.
//   2. Otherwise call load(key), keep the answer in the cache for ttlMs, and return it.
//   3. If load throws, the error goes to the caller and nothing is kept.
//   4. If load gives back undefined, return undefined and keep nothing.
// ---------------------------------------------------------------------------
async function cachedGet(cache, key, ttlMs, load) {
  // TODO
}

// ---------------------------------------------------------------------------
// Task 3. No stampede.
//   makeSharedGetter(cache, ttlMs, load) returns an async function get(key).
//   It works like cachedGet, with one more rule: when a key is missing and a load for that SAME key
//   is already running, do not start a second one. Wait for the first one and share its answer.
//   If the shared load fails, every caller waiting for it gets the error, and the next call starts a fresh load.
// ---------------------------------------------------------------------------
function makeSharedGetter(cache, ttlMs, load) {
  // TODO
}

module.exports = { makeCache, cachedGet, makeSharedGetter };
