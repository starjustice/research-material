const test = require('node:test');
const assert = require('node:assert/strict');
const { maxDepth, levelOrder, isValidBST, invertTree } = require('./04-trees');

// Build a tree from a level order array. null means "no node here". [3, 9, 20, null, null, 15, 7]
function fromLevels(vals) {
  if (!vals.length || vals[0] === null) return null;
  const root = { val: vals[0], left: null, right: null };
  const queue = [root];
  let i = 1;
  while (queue.length && i < vals.length) {
    const node = queue.shift();
    if (i < vals.length && vals[i] !== null) { node.left = { val: vals[i], left: null, right: null }; queue.push(node.left); }
    i++;
    if (i < vals.length && vals[i] !== null) { node.right = { val: vals[i], left: null, right: null }; queue.push(node.right); }
    i++;
  }
  return root;
}
const toLevels = (root) => levelOrder0(root);
function levelOrder0(root) { // plain helper, independent of the exercise
  const out = [], q = root ? [root] : [];
  while (q.length) { const n = q.shift(); out.push(n ? n.val : null); if (n) { q.push(n.left); q.push(n.right); } }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

test('maxDepth', () => {
  assert.equal(maxDepth(null), 0);
  assert.equal(maxDepth(fromLevels([1])), 1);
  assert.equal(maxDepth(fromLevels([3, 9, 20, null, null, 15, 7])), 3);
  assert.equal(maxDepth(fromLevels([1, null, 2, null, 3])), 3);
});

test('levelOrder', () => {
  assert.deepEqual(levelOrder(null), []);
  assert.deepEqual(levelOrder(fromLevels([1])), [[1]]);
  assert.deepEqual(levelOrder(fromLevels([3, 9, 20, null, null, 15, 7])), [[3], [9, 20], [15, 7]]);
  assert.deepEqual(levelOrder(fromLevels([4, 2, 6, 1, 3, 5, 7])), [[4], [2, 6], [1, 3, 5, 7]]);
});

test('isValidBST: small cases', () => {
  assert.equal(isValidBST(null), true);
  assert.equal(isValidBST(fromLevels([2, 1, 3])), true);
  assert.equal(isValidBST(fromLevels([5, 1, 4, null, null, 3, 6])), false);
  assert.equal(isValidBST(fromLevels([4, 2, 6, 1, 3, 5, 7])), true);
});

test('isValidBST: the trap. Every child is fine next to its parent, but 3 is on the right of 5', () => {
  // 5's right child 6 is fine, 6's left child 3 is smaller than 6 but also smaller than 5.
  assert.equal(isValidBST(fromLevels([5, 4, 6, null, null, 3, 7])), false);
});

test('isValidBST: equal values are not allowed', () => {
  assert.equal(isValidBST(fromLevels([2, 2, 2])), false);
  assert.equal(isValidBST(fromLevels([1, 1])), false);
});

test('invertTree', () => {
  assert.equal(invertTree(null), null);
  const t = invertTree(fromLevels([4, 2, 7, 1, 3, 6, 9]));
  assert.deepEqual(toLevels(t), [4, 7, 2, 9, 6, 3, 1]);
  assert.deepEqual(toLevels(invertTree(fromLevels([2, 1]))), [2, null, 1]);
});
