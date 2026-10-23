/**
 * Climbing Stairs
 *
 * You climb a staircase with n steps. Each move is 1 or 2 steps. Return how many different ways you can reach the top.
 *
 * Examples:
 *   climbingStairs(2) -> 2   (1+1, 2)
 *   climbingStairs(3) -> 3   (1+1+1, 1+2, 2+1)
 *  4 (1+1+1+1, 2+2, 2+1+1, 1+2+1, 1+1+2) - >5
 *   climbingStairs(5) -> 8
 *
 * Target: O(n) time, O(1) space
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. Write the answers for n = 1, 2, 3, 4, 5 by hand. Do you see a pattern in the numbers?
 *   2. To reach step n, your last move came from step n-1 or step n-2. How does that give a formula?
 *   3. It is the same shape as Fibonacci. Reuse what you learned there.
 */
function climbingStairs(n) {
  if (n === 0 || n === 1 || n === 2 || n === 3) {
    return n;
  }

  let first = 2,
    second = 3;
  for (let i = 4; i < n; i++) {
    let tmp = first;
    first = second;
    second = tmp + first;
  }
  return first + second;
}

module.exports = { climbingStairs };
