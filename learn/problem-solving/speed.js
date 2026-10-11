const assert = require('node:assert/strict');

/**
 * Runs fn and fails if it takes longer than maxMs.
 * node:test cannot stop code that is stuck in a loop, so we measure the time ourselves.
 */
function assertFast(maxMs, fn) {
  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;
  assert.ok(elapsed <= maxMs, `Too slow: took ${Math.round(elapsed)} ms, limit is ${maxMs} ms. Look for repeated work.`);
}

module.exports = { assertFast };
