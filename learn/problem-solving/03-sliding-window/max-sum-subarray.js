/**
 * Maximum Sum of k Numbers in a Row
 *
 * Return the largest sum you can get from k numbers that sit next to each other in the array.
 *
 * Examples:
 *   maxSumSubarray([2, 1, 5, 1, 3, 2], 3) -> 9   (5 + 1 + 3)
 *   maxSumSubarray([-1, -2, -3], 2) -> -3
 *
 * Target: O(n) time, O(1) space
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. Brute force adds up k numbers for every start position. How much repeated adding is that?
 *   2. When the window moves one step right, one number leaves and one number enters. Update the sum instead of recomputing.
 */
function maxSumSubarray(nums, k) {
  throw new Error('not implemented');
}

module.exports = { maxSumSubarray };
