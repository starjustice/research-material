const test = require('node:test');
const assert = require('node:assert/strict');
const { isPalindrome } = require('./valid-palindrome');
const { twoSumSorted } = require('./two-sum-sorted');
const { maxArea } = require('./max-water-container');

test('isPalindrome', () => {
  assert.equal(isPalindrome('A man, a plan, a canal: Panama'), true);
  assert.equal(isPalindrome('race a car'), false);
  assert.equal(isPalindrome(''), true);
  assert.equal(isPalindrome('.,'), true);
  assert.equal(isPalindrome('0P'), false);
});

test('twoSumSorted', () => {
  assert.deepEqual(twoSumSorted([2, 7, 11, 15], 9), [0, 1]);
  assert.deepEqual(twoSumSorted([1, 2, 3, 4, 4, 9], 8), [3, 4]);
  assert.deepEqual(twoSumSorted([-3, -1, 0, 4], 3), [1, 3]);
});

test('maxArea', () => {
  assert.equal(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]), 49);
  assert.equal(maxArea([1, 1]), 1);
  assert.equal(maxArea([4, 3, 2, 1, 4]), 16);
});
