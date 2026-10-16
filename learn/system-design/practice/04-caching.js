// Lesson 04: Caching. Write the function below, then run:
//   node --test learn/system-design/practice/04-caching.test.js

// createCache({ capacity, ttlMs, now }) makes a small cache with a time limit (TTL)
// and a size limit. It returns an object with three methods: set, get and size.
// capacity is at least 1. ttlMs is how long a copy may live, in milliseconds.
// now is a function that returns the time in milliseconds. It defaults to Date.now.
// The tests pass their own now, so they can move time without waiting.
//
//   set(key, value)  Keeps a copy. Its time is over when now() >= (time of this call) + ttlMs.
//                    Setting a key that is already there replaces the value and
//                    starts its time again.
//   get(key)         Returns the value. Returns undefined when the key is missing or
//                    its time is over. A get counts as "used just now" for the size
//                    limit. A get does NOT make the copy live longer.
//   size()           How many copies are alive. Copies whose time is over do not count.
//
// The cache never holds more than `capacity` copies. When it is full and you add a new key:
//   1. First drop every copy whose time is over.
//   2. If it is still full, drop the copy that was used longest ago
//      (interview word: LRU, least recently used).
//
// Hint: a Map remembers the order in which keys were added, and the first key is the
// oldest. To move a key to the end, delete it and set it again.
function createCache({ capacity, ttlMs, now = Date.now }) {
  // TODO
}

module.exports = { createCache };
