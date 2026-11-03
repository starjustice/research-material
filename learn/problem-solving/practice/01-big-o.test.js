const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { hasDuplicate, commonItems, firstRepeated } = require('./01-big-o');

test('hasDuplicate: small cases', () => {
  assert.equal(hasDuplicate([1, 2, 3, 1]), true);
  assert.equal(hasDuplicate([1, 2, 3]), false);
  assert.equal(hasDuplicate([]), false);
  assert.equal(hasDuplicate([7]), false);
  assert.equal(hasDuplicate([5, 5]), true);
});

test('hasDuplicate: 200000 different numbers must be fast', () => {
  const nums = Array.from({ length: 200000 }, (_, i) => i);
  assertFast(300, () => assert.equal(hasDuplicate(nums), false));
});

test('commonItems: small cases', () => {
  assert.deepEqual(commonItems([4, 9, 5, 9], [9, 4, 9, 8, 4]), [4, 9]);
  assert.deepEqual(commonItems([1, 2, 3], [4, 5]), []);
  assert.deepEqual(commonItems([], [1]), []);
  assert.deepEqual(commonItems([3, 1, 3, 1], [1, 3]), [3, 1]);
});

test('commonItems: 100000 and 100000 numbers must be fast', () => {
  const a = Array.from({ length: 100000 }, (_, i) => i * 2);
  const b = Array.from({ length: 100000 }, (_, i) => i * 3);
  assertFast(300, () => {
    const r = commonItems(a, b);
    assert.equal(r.length, 33334);
    assert.deepEqual(r.slice(0, 4), [0, 6, 12, 18]);
  });
});

test('firstRepeated: small cases', () => {
  assert.equal(firstRepeated([2, 1, 3, 1, 2]), 1);
  assert.equal(firstRepeated([1, 2, 3]), undefined);
  assert.equal(firstRepeated([5, 5, 1, 1]), 5);
  assert.equal(firstRepeated([]), undefined);
});

test('firstRepeated: 200000 numbers must be fast', () => {
  const nums = Array.from({ length: 200000 }, (_, i) => i);
  nums.push(199999);
  assertFast(300, () => assert.equal(firstRepeated(nums), 199999));
});
