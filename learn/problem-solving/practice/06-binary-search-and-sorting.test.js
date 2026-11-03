const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { binarySearch, lowerBound, minEatingSpeed, mergeSort } = require('./06-binary-search-and-sorting');

// Wrap an array so we can count how many different items the code looks at. A fast search looks at about log2(n) items.
function counted(arr) {
  const seen = new Set();
  const box = { get reads() { return seen.size; } };
  const proxy = new Proxy(arr, { get(t, k) { if (typeof k === 'string' && /^\d+$/.test(k)) seen.add(k); return t[k]; } });
  return [proxy, box];
}
const big = Array.from({ length: 1000000 }, (_, i) => i * 2);

test('binarySearch: small cases', () => {
  assert.equal(binarySearch([2, 5, 8, 12], 8), 2);
  assert.equal(binarySearch([2, 5, 8, 12], 7), -1);
  assert.equal(binarySearch([], 1), -1);
  assert.equal(binarySearch([4], 4), 0);
  assert.equal(binarySearch([4], 5), -1);
  assert.equal(binarySearch([1, 3, 5, 7, 9], 1), 0);
  assert.equal(binarySearch([1, 3, 5, 7, 9], 9), 4);
});

test('binarySearch: 1,000,000 numbers, about 20 reads', () => {
  for (const t of [0, 1, 999998, 500000, 1999998, 2000000]) {
    const [arr, box] = counted(big);
    const expect = t % 2 === 0 && t <= 1999998 ? t / 2 : -1;
    assert.equal(binarySearch(arr, t), expect);
    assert.ok(box.reads <= 25, `read ${box.reads} items for ${t}, binary search needs about 20`);
  }
});

test('lowerBound', () => {
  assert.equal(lowerBound([1, 2, 2, 2, 5], 2), 1);
  assert.equal(lowerBound([1, 2, 2, 2, 5], 3), 4);
  assert.equal(lowerBound([1, 2, 2, 2, 5], 0), 0);
  assert.equal(lowerBound([1, 2], 9), 2);
  assert.equal(lowerBound([], 3), 0);
});

test('lowerBound: 1,000,000 numbers, about 20 reads', () => {
  const [arr, box] = counted(big);
  assert.equal(lowerBound(arr, 777777), 388889);
  assert.ok(box.reads <= 25, `read ${box.reads} items`);
});

test('minEatingSpeed', () => {
  assert.equal(minEatingSpeed([3, 6, 7, 11], 8), 4);
  assert.equal(minEatingSpeed([30, 11, 23, 4, 20], 5), 30);
  assert.equal(minEatingSpeed([30, 11, 23, 4, 20], 6), 23);
  assert.equal(minEatingSpeed([1], 1), 1);
  assert.equal(minEatingSpeed([1000000000], 2), 500000000);
});

test('minEatingSpeed: 100000 piles must be fast, and the answer is the smallest speed that works', () => {
  const piles = Array.from({ length: 100000 }, (_, i) => (i % 1000) + 1);
  const hoursAt = (k) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
  let k;
  assertFast(500, () => { k = minEatingSpeed(piles, 150000); });
  assert.ok(hoursAt(k) <= 150000, 'speed ' + k + ' is too slow');
  assert.ok(k === 1 || hoursAt(k - 1) > 150000, 'speed ' + (k - 1) + ' would also work');
});

test('mergeSort: small cases and it does not change the input', () => {
  const input = [5, 2, 9, 1, 5, 6];
  const out = mergeSort(input);
  assert.deepEqual(out, [1, 2, 5, 5, 6, 9]);
  assert.deepEqual(input, [5, 2, 9, 1, 5, 6]);
  assert.notEqual(out, input);
  assert.deepEqual(mergeSort([]), []);
  assert.deepEqual(mergeSort([3]), [3]);
  assert.deepEqual(mergeSort([-1, -10, 10, 0]), [-10, -1, 0, 10]);
});

test('mergeSort: does not use Array.prototype.sort, and 100000 numbers must be fast', () => {
  const original = Array.prototype.sort;
  Array.prototype.sort = () => { throw new Error('do not use Array.prototype.sort'); };
  try {
    const nums = Array.from({ length: 100000 }, (_, i) => (i * 7919) % 100003);
    assertFast(1000, () => {
      const out = mergeSort(nums);
      for (let i = 1; i < out.length; i++) if (out[i - 1] > out[i]) assert.fail('not sorted at ' + i);
      assert.equal(out.length, 100000);
    });
  } finally { Array.prototype.sort = original; }
});
