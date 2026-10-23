/**
 * Two Sum
 *
 * Given an array of numbers and a target, return the indexes [i, j] (i < j) of the two numbers that add up to the target. Exactly one answer exists.
 *
 * Examples:
 *   twoSum([2, 7, 11, 15], 9) -> [0, 1]
 *   twoSum([3, 2, 4], 6) -> [1, 2]
 *
 * Target: O(n) time, O(n) space
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. Write the nested loop version first. What is its time complexity?
 *   2. For each number, what other number are you looking for? How could you check "have I seen that already?" in O(1)?
 *   3. Use a Map from value to index while you walk the array once.
 */

//  * Method 1: Nested Loops (Brute Force)
//  * Time Complexity: O(n²) - Two nested loops may check every pair.
//  * Space Complexity: O(1) - Uses only a few variables.
//  */
// function twoSum(nums, target) {
//   for (let x = 0; x < nums.length; x++) {
//     for (let j = 1; j < nums.length; j++) {
//       let total = nums[x] + nums[j];
//       if (total === target) {
//         return [x, j];
//       }
//     }
//   }
// }

 * Method 2: Hash Map (Optimized)
 * Time Complexity: O(n) - Loops through the array once.
//   Map lookups and insertions take O(1) on average.
// Space Complexity: O(n) - The Map can store up to n elements.
 */
function twoSum(nums, target) {
  let tmp = new Map();
  for (let i = 0; i < nums.length; i++) {
    let missing = target - (nums[i] || 0);
    if (tmp.has(missing)) {
      return [tmp.get(missing), i];
    }
    tmp.set(nums[i], i);
  }
}

module.exports = { twoSum };
