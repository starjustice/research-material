const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { isValid } = require('./valid-parentheses');
const { dailyTemperatures } = require('./daily-temperatures');

test('isValid', () => {
  assert.equal(isValid('()[]{}'), true);
  assert.equal(isValid('(]'), false);
  assert.equal(isValid('([)]'), false);
  assert.equal(isValid('{[]}'), true);
  assert.equal(isValid('('), false);
  assert.equal(isValid(''), true);
});

test('dailyTemperatures', () => {
  assert.deepEqual(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]), [1, 1, 4, 2, 1, 1, 0, 0]);
  assert.deepEqual(dailyTemperatures([30, 40, 50, 60]), [1, 1, 1, 0]);
  assert.deepEqual(dailyTemperatures([30, 20, 10]), [0, 0, 0]);
});

test('dailyTemperatures on 100000 days must be fast', () => {
  assertFast(500, () => {
    const temps = Array.from({ length: 100000 }, (_, i) => 100000 - i);
    const result = dailyTemperatures(temps);
    assert.equal(result.length, 100000);
    assert.equal(result[0], 0);
  });
});
