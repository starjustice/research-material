const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { maxSumSubarray } = require('./max-sum-subarray');
const { lengthOfLongestSubstring } = require('./longest-substring-no-repeat');

test('maxSumSubarray', () => {
  assert.equal(maxSumSubarray([2, 1, 5, 1, 3, 2], 3), 9);
  assert.equal(maxSumSubarray([2, 3, 4, 1, 5], 2), 7);
  assert.equal(maxSumSubarray([-1, -2, -3], 2), -3);
  assert.equal(maxSumSubarray([5], 1), 5);
});

test('maxSumSubarray on 200000 numbers must be fast', () => {
  assertFast(500, () => {
    const nums = Array.from({ length: 200000 }, () => 1);
    assert.equal(maxSumSubarray(nums, 100000), 100000);
  });
});

test('lengthOfLongestSubstring', () => {
  assert.equal(lengthOfLongestSubstring('abcabcbb'), 3);
  assert.equal(lengthOfLongestSubstring('bbbbb'), 1);
  assert.equal(lengthOfLongestSubstring('pwwkew'), 3);
  assert.equal(lengthOfLongestSubstring(''), 0);
  assert.equal(lengthOfLongestSubstring('abba'), 2);
});
