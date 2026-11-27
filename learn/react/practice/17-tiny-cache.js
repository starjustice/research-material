// Lesson 17: Caching and revalidation. Build a tiny version of "use cache", then run:
//   node --test learn/react/practice/17-tiny-cache.test.js
//
// Rules of the little cache:
// - createCache(now) gives you a cache. now() returns the time in milliseconds.
//   The tests pass a fake clock, so use now(), never Date.now().
// - cache.wrap(fn, { tag, revalidate }) returns a new async function.
//   * The key is the arguments of the call, turned into text with JSON.stringify.
//   * A saved result is "fresh" for `revalidate` milliseconds.
//   * A fresh result is returned at once and fn is NOT called.
//   * A missing or too old result: call fn, save the result, return it.
// - cache.updateTag(tag): every saved result with that tag is thrown away.
//   The next call waits for fn again (the user sees the new data at once).
// - cache.revalidateTag(tag): every saved result with that tag is marked "old".
//   The next call returns the OLD result at once and starts fn in the background.
//   The call after that gets the new result. (This is stale while revalidate.)

function createCache(now = Date.now) {
  // TODO
}

module.exports = { createCache };
