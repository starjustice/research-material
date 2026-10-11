const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { twoSum } = require('./two-sum');
const { isAnagram } = require('./valid-anagram');
const { groupAnagrams } = require('./group-anagrams');

test('twoSum', () => {
  assert.deepEqual(twoSum([2, 7, 11, 15], 9), [0, 1]);
  assert.deepEqual(twoSum([3, 2, 4], 6), [1, 2]);
  assert.deepEqual(twoSum([3, 3], 6), [0, 1]);
  assert.deepEqual(twoSum([-1, -2, -3, -4, -5], -8), [2, 4]);
});

test('twoSum on 100000 numbers must be fast', () => {
  assertFast(500, () => {
    // Even numbers can never reach the target. Only the last two numbers do.
    const nums = Array.from({ length: 100000 }, (_, i) => i * 2);
    nums.push(1000001, 1000003);
    const n = nums.length;
    assert.deepEqual(twoSum(nums, 2000004), [n - 2, n - 1]);
  });
});

test('isAnagram', () => {
  assert.equal(isAnagram('listen', 'silent'), true);
  assert.equal(isAnagram('rat', 'car'), false);
  assert.equal(isAnagram('a', 'ab'), false);
  assert.equal(isAnagram('', ''), true);
});

test('groupAnagrams', () => {
  const normalize = (groups) => groups.map((g) => [...g].sort()).sort((a, b) => a[0].localeCompare(b[0]));
  const result = groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']);
  assert.deepEqual(normalize(result), normalize([['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]));
  assert.deepEqual(groupAnagrams([]), []);
});
