/**
 * Lesson 08: Recursion, backtracking and dynamic programming.
 *
 * 1. fib(n)
 *    The n-th Fibonacci number: fib(0) = 0, fib(1) = 1, fib(n) = fib(n - 1) + fib(n - 2).
 *    It must be fast for n = 70 (the plain recursive version would take days). Use a Map to remember answers
 *    or a loop. fib(70) is still an exact number in JavaScript (the exact limit is fib(78)).
 *
 * 2. coinChange(coins, amount)
 *    The fewest coins that add up to amount. You have as many of each coin as you like. -1 if it cannot be done.
 *    coinChange([1, 2, 5], 11) -> 3 (5 + 5 + 1)     coinChange([2], 3) -> -1     coinChange([1], 0) -> 0
 *
 * 3. rob(nums)
 *    Houses in a row, nums[i] is the money in house i. You cannot rob two houses next to each other.
 *    Return the most money you can take. rob([2, 7, 9, 3, 1]) -> 12 (2 + 9 + 1)
 *
 * 4. subsets(nums)
 *    Every subset of nums (no repeated numbers in nums). Any order. subsets([1, 2]) -> [[], [1], [2], [1, 2]]
 *
 * 5. permutations(nums)
 *    Every ordering of nums (no repeated numbers). Any order. permutations([1, 2, 3]) -> 6 lists.
 *
 * Run: node --test practice/08-recursion-backtracking-dp.test.js
 */

function fib(n) {
}

function coinChange(coins, amount) {
}

function rob(nums) {
}

function subsets(nums) {
}

function permutations(nums) {
}

module.exports = { fib, coinChange, rob, subsets, permutations };
