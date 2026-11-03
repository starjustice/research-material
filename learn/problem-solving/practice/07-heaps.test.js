const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { MinHeap, kthLargest, topKFrequent } = require('./07-heaps');

test('MinHeap: pops in order, smallest first', () => {
  const h = new MinHeap();
  for (const x of [5, 3, 8, 1, 9, 2, 7]) h.push(x);
  assert.equal(h.size(), 7);
  assert.equal(h.peek(), 1);
  const out = [];
  while (h.size()) out.push(h.pop());
  assert.deepEqual(out, [1, 2, 3, 5, 7, 8, 9]);
});

test('MinHeap: empty heap and duplicates', () => {
  const h = new MinHeap();
  assert.equal(h.pop(), undefined);
  assert.equal(h.peek(), undefined);
  assert.equal(h.size(), 0);
  for (const x of [2, 2, 1, 1]) h.push(x);
  assert.deepEqual([h.pop(), h.pop(), h.pop(), h.pop()], [1, 1, 2, 2]);
  assert.equal(h.size(), 0);
});

test('MinHeap: mixing push and pop', () => {
  const h = new MinHeap();
  h.push(10); h.push(4);
  assert.equal(h.pop(), 4);
  h.push(1); h.push(7);
  assert.equal(h.pop(), 1);
  assert.equal(h.pop(), 7);
  assert.equal(h.pop(), 10);
});

test('MinHeap: a custom compare (biggest first)', () => {
  const h = new MinHeap((a, b) => b - a);
  for (const x of [3, 9, 1, 7]) h.push(x);
  assert.deepEqual([h.pop(), h.pop(), h.pop(), h.pop()], [9, 7, 3, 1]);
});

test('MinHeap: 200000 pushes and pops must be fast', () => {
  assertFast(800, () => {
    const h = new MinHeap();
    for (let i = 0; i < 200000; i++) h.push((i * 7919) % 200003);
    let prev = -1;
    for (let i = 0; i < 200000; i++) { const x = h.pop(); if (x < prev) assert.fail('out of order at ' + i); prev = x; }
    assert.equal(h.size(), 0);
  });
});

test('kthLargest', () => {
  assert.equal(kthLargest([3, 2, 1, 5, 6, 4], 2), 5);
  assert.equal(kthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4), 4);
  assert.equal(kthLargest([1], 1), 1);
  assert.equal(kthLargest([5, 5, 5], 3), 5);
  assert.equal(kthLargest([-1, -2, -3], 1), -1);
});

test('kthLargest: 300000 numbers must be fast, and the input stays as it was', () => {
  const nums = Array.from({ length: 300000 }, (_, i) => (i * 7919) % 300007);
  const copy = nums.slice();
  const expected = nums.slice().sort((a, b) => b - a)[9];
  assertFast(600, () => assert.equal(kthLargest(nums, 10), expected));
  assert.deepEqual(nums, copy);
});

test('topKFrequent', () => {
  assert.deepEqual(topKFrequent([1, 1, 1, 2, 2, 3], 2).sort(), [1, 2]);
  assert.deepEqual(topKFrequent([1], 1), [1]);
  assert.deepEqual(topKFrequent([4, 4, 4, 5, 5, 6, 6, 6, 6], 1), [6]);
  assert.deepEqual(topKFrequent([7, 7, 8, 8, 9], 2).sort(), [7, 8]);
});
