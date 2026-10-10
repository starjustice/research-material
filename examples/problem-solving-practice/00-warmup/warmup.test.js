const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { fibonacci } = require('./fibonacci');
const { climbingStairs } = require('./climbing-stairs');

test('fibonacci small values', () => {
  assert.equal(fibonacci(0), 0);
  assert.equal(fibonacci(1), 1);
  assert.equal(fibonacci(2), 1);
  assert.equal(fibonacci(10), 55);
});

test('fibonacci n = 45 must be fast (plain recursion is too slow)', () => {
  assertFast(500, () => {
    assert.equal(fibonacci(45), 1134903170);
  });
});

test('climbingStairs small values', () => {
  assert.equal(climbingStairs(1), 1);
  assert.equal(climbingStairs(2), 2);
  assert.equal(climbingStairs(3), 3);
  assert.equal(climbingStairs(5), 8);
  assert.equal(climbingStairs(10), 89);
});

test('climbingStairs n = 45 must be fast', () => {
  assertFast(500, () => {
    assert.equal(climbingStairs(45), 1836311903);
  });
});
