const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { firstUniqueChar, countWords, longestConsecutive, MyHashMap } = require('./02-hash-maps');

test('firstUniqueChar', () => {
  assert.equal(firstUniqueChar('leetcode'), 0);
  assert.equal(firstUniqueChar('loveleetcode'), 2);
  assert.equal(firstUniqueChar('aabb'), -1);
  assert.equal(firstUniqueChar(''), -1);
});

test('firstUniqueChar: 200000 characters must be fast', () => {
  const s = 'ab'.repeat(100000) + 'c';
  assertFast(300, () => assert.equal(firstUniqueChar(s), 200000));
});

test('countWords: counts and lower-cases', () => {
  const m = countWords('the cat The dog');
  assert.ok(m instanceof Map);
  assert.equal(m.get('the'), 2);
  assert.equal(m.get('cat'), 1);
  assert.equal(m.get('dog'), 1);
  assert.equal(m.size, 3);
});

test('countWords: words that are also object property names', () => {
  const m = countWords('constructor toString constructor __proto__');
  assert.equal(m.get('constructor'), 2);
  assert.equal(m.get('tostring'), 1);
  assert.equal(m.get('__proto__'), 1);
  assert.equal(m.size, 3);
});

test('longestConsecutive', () => {
  assert.equal(longestConsecutive([100, 4, 200, 1, 3, 2]), 4);
  assert.equal(longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]), 9);
  assert.equal(longestConsecutive([]), 0);
  assert.equal(longestConsecutive([5]), 1);
  assert.equal(longestConsecutive([1, 1, 1]), 1);
});

test('longestConsecutive: 200000 numbers must be fast', () => {
  const nums = Array.from({ length: 200000 }, (_, i) => 199999 - i);
  assertFast(500, () => assert.equal(longestConsecutive(nums), 200000));
});

test('MyHashMap: put, get, replace', () => {
  const m = new MyHashMap();
  assert.equal(m.get('a'), undefined);
  m.put('a', 1);
  m.put('b', 2);
  assert.equal(m.get('a'), 1);
  assert.equal(m.get('b'), 2);
  m.put('a', 10);
  assert.equal(m.get('a'), 10);
  assert.equal(m.size, 2);
});

test('MyHashMap: remove', () => {
  const m = new MyHashMap();
  m.put('x', 1);
  assert.equal(m.remove('x'), true);
  assert.equal(m.remove('x'), false);
  assert.equal(m.get('x'), undefined);
  assert.equal(m.size, 0);
});

test('MyHashMap: keys that look like object properties', () => {
  const m = new MyHashMap();
  assert.equal(m.get('constructor'), undefined);
  m.put('__proto__', 5);
  assert.equal(m.get('__proto__'), 5);
  assert.equal(m.size, 1);
});

test('MyHashMap: 50000 keys must be fast', () => {
  assertFast(1000, () => {
    const m = new MyHashMap();
    for (let i = 0; i < 50000; i++) m.put('key' + i, i);
    assert.equal(m.size, 50000);
    for (let i = 0; i < 50000; i += 7) assert.equal(m.get('key' + i), i);
  });
});
