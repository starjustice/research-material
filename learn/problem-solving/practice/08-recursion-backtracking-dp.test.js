const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { fib, coinChange, rob, subsets, permutations } = require('./08-recursion-backtracking-dp');

const norm = (lists) => lists.map(l => [...l].sort((a, b) => a - b).join(',')).sort();

test('fib: small values', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map(n => fib(n)), [0, 1, 1, 2, 3, 5, 55]);
});

test('fib: n = 70 must be fast', () => {
  assertFast(100, () => assert.equal(fib(70), 190392490709135));
});

test('coinChange: small cases', () => {
  assert.equal(coinChange([1, 2, 5], 11), 3);
  assert.equal(coinChange([2], 3), -1);
  assert.equal(coinChange([1], 0), 0);
  assert.equal(coinChange([1], 2), 2);
  assert.equal(coinChange([2, 5, 10, 1], 27), 4);
});

test('coinChange: a big amount must be fast', () => {
  assertFast(500, () => assert.equal(coinChange([186, 419, 83, 408], 6249), 20));
});

test('coinChange: a greedy answer is wrong here', () => {
  // Greedy takes 4 first: 4 + 1 + 1 = 3 coins. The best is 3 + 3 = 2 coins.
  assert.equal(coinChange([1, 3, 4], 6), 2);
});

test('rob', () => {
  assert.equal(rob([]), 0);
  assert.equal(rob([5]), 5);
  assert.equal(rob([1, 2, 3, 1]), 4);
  assert.equal(rob([2, 7, 9, 3, 1]), 12);
  assert.equal(rob([2, 1, 1, 2]), 4);
});

test('rob: 100000 houses must be fast', () => {
  const nums = Array.from({ length: 100000 }, (_, i) => (i % 3) + 1);
  // the answer, worked out here with a plain table
  const best = [0, nums[0]];
  for (let i = 1; i < nums.length; i++) best.push(Math.max(best[i], best[i - 1] + nums[i]));
  assertFast(300, () => assert.equal(rob(nums), best[nums.length]));
});

test('subsets', () => {
  assert.deepEqual(norm(subsets([])), ['']);
  assert.deepEqual(norm(subsets([1, 2])), ['', '1', '1,2', '2']);
  assert.deepEqual(norm(subsets([1, 2, 3])), ['', '1', '1,2', '1,2,3', '1,3', '2', '2,3', '3']);
  assert.equal(subsets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).length, 1024);
});

test('subsets: gives separate arrays (not the same array again and again)', () => {
  const r = subsets([1, 2, 3]);
  assert.equal(new Set(r).size, 8);
});

test('permutations', () => {
  assert.deepEqual(permutations([]), [[]]);
  assert.deepEqual(permutations([1]), [[1]]);
  assert.deepEqual(permutations([1, 2, 3]).map(p => p.join('')).sort(), ['123', '132', '213', '231', '312', '321']);
  assert.equal(permutations([1, 2, 3, 4, 5, 6]).length, 720);
});
