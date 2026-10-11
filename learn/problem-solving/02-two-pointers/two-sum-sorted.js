/**
 * Two Sum in a Sorted Array
 *
 * The array is sorted from small to large. Return the indexes [i, j] (i < j) of two numbers that add up to the target. Use O(1) extra space, so no Map.
 *
 * Examples:
 *   twoSumSorted([2, 7, 11, 15], 9) -> [0, 1]
 *   twoSumSorted([1, 2, 3, 4, 4, 9], 8) -> [3, 4]
 *
 * Target: O(n) time, O(1) space
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. Why does the sorted order help? Think about what happens to the sum when you move the left side right, or the right side left.
 *   2. Start with pointers at both ends. Sum too big: move the right pointer left. Sum too small: move the left pointer right.
 */
function twoSumSorted(numbers, target) {
  throw new Error('not implemented');
}

module.exports = { twoSumSorted };
