/**
 * Lesson 04: Trees and traversal.
 *
 * A tree node is a plain object: { val, left, right }. A missing child is null. An empty tree is null.
 *
 * 1. maxDepth(root)
 *    How many nodes are on the longest path from the root down to a leaf. maxDepth(null) is 0.
 *
 * 2. levelOrder(root)
 *    The values level by level, as an array of arrays.
 *       3
 *      / \
 *     9  20        ->   [[3], [9, 20], [15, 7]]
 *        / \
 *       15  7
 *
 * 3. isValidBST(root)
 *    true if for EVERY node, all values in its left side are smaller and all values in its right side are bigger.
 *    Equal values are not allowed. Checking only the direct children is a trap: see the tests.
 *
 * 4. invertTree(root)
 *    Swap left and right at every node. Return the root.
 *
 * Run: node --test practice/04-trees.test.js
 */

function maxDepth(root) {
}

function levelOrder(root) {
}

function isValidBST(root) {
}

function invertTree(root) {
}

module.exports = { maxDepth, levelOrder, isValidBST, invertTree };
