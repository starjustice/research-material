const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { numIslands, canFinish, shortestPath } = require('./05-graphs');

const g = (rows) => rows.map(r => r.split(''));

test('numIslands: small grids', () => {
  assert.equal(numIslands(g(['11110', '11010', '11000', '00000'])), 1);
  assert.equal(numIslands(g(['11000', '11000', '00100', '00011'])), 3);
  assert.equal(numIslands(g(['000', '000'])), 0);
  assert.equal(numIslands([]), 0);
  assert.equal(numIslands(g(['101', '010', '101'])), 5);
});

test('numIslands: does not change the grid you give it', () => {
  const grid = g(['110', '001']);
  assert.equal(numIslands(grid), 2);
  assert.deepEqual(grid, g(['110', '001']));
});

test('numIslands: 300 x 300 of land must be fast and must not crash', () => {
  const grid = Array.from({ length: 300 }, () => Array(300).fill('1'));
  assertFast(500, () => assert.equal(numIslands(grid), 1));
});

test('canFinish', () => {
  assert.equal(canFinish(2, [[1, 0]]), true);
  assert.equal(canFinish(2, [[1, 0], [0, 1]]), false);
  assert.equal(canFinish(4, [[1, 0], [2, 0], [3, 1], [3, 2]]), true);
  assert.equal(canFinish(3, [[0, 1], [1, 2], [2, 0]]), false);
  assert.equal(canFinish(1, []), true);
  assert.equal(canFinish(3, [[1, 1]]), false);
});

test('canFinish: a chain of 50000 courses must be fast', () => {
  const n = 50000;
  const pre = Array.from({ length: n - 1 }, (_, i) => [i + 1, i]);
  assertFast(500, () => assert.equal(canFinish(n, pre), true));
});

test('shortestPath', () => {
  const graph = { A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'D'], D: ['B', 'C', 'E', 'F'], E: ['D'], F: ['D'], Z: [] };
  assert.equal(shortestPath(graph, 'A', 'A'), 0);
  assert.equal(shortestPath(graph, 'A', 'B'), 1);
  assert.equal(shortestPath(graph, 'A', 'F'), 3);
  assert.equal(shortestPath(graph, 'E', 'C'), 2);
  assert.equal(shortestPath(graph, 'A', 'Z'), -1);
});

test('shortestPath: follows the direction of the edges, and survives a loop', () => {
  const graph = { A: ['B'], B: ['C'], C: ['A'], D: ['A'] };
  assert.equal(shortestPath(graph, 'A', 'C'), 2);
  assert.equal(shortestPath(graph, 'A', 'D'), -1);
  assert.equal(shortestPath(graph, 'D', 'C'), 3);
});
