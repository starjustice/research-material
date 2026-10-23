/**
 * Fibonacci
 *
 * Return the n-th Fibonacci number. fib(0) = 0, fib(1) = 1, fib(n) = fib(n-1) + fib(n-2).
 *
 * Examples:
 *   fibonacci(0) -> 0
 *   fibonacci(1) -> 1
 *   fibonacci(10) -> 55
 *
 * Target: start with the slow version, then reach O(n) time, then O(1) space
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. First write the plain recursive version. It is correct but slow. Run the n = 45 test to see how slow.
 *   2. Look at the call tree in the README. Which calls repeat? Save each answer the first time you compute it (memoization).
 *   3. Now notice you only ever need the last two numbers. Can you do it with a loop and two variables?
 */

/**
 * FIBONACCI - BIG O CHEAT SHEET
 *
 * 1. Plain Recursion
 *    Time Complexity:  O(2^n)
 *    Space Complexity: O(n)
 *    Reason: Recalculates the same Fibonacci numbers repeatedly.
 *
 * 2. Recursion + Memoization (Map)
 *    Time Complexity:  O(n)
 *    Space Complexity: O(n)
 *    Reason: Stores calculated results in a Map to avoid repeated work.
 *
 * 3. Iteration (Loop + Two Variables)
 *    Time Complexity:  O(n)
 *    Space Complexity: O(1)
 *    Reason: Calculates each number once and stores only two numbers.
 *
 * SUMMARY:
 * Plain recursion      -> O(2^n) time, O(n) space
 * Memoization          -> O(n) time,   O(n) space
 * Loop + two variables -> O(n) time,   O(1) space
 *
 * MEMORY TIP:
 * Time  = How many operations grow with input n?
 * Space = How much extra memory grows with input n?
 */

// function fibonacci(n) {
//   if (n === 1 || n === 0) {
//     return n;
//   }
//   return fibonacci(n - 1) + fibonacci(n - 2);
// }

// let memory = new Map();
// function fibonacci(n) {
//   if (memory.has(n)) {
//     return memory.get(n);
//   }
//   if (n === 1 || n === 0) {
//     return n;
//   }

//   const result = fibonacci(n - 1) + fibonacci(n - 2);

//   memory.set(n, result);
//   return result;
// }

function fibonacci(n) {
  if (n === 1 || n === 0) {
    return n;
  }
  let first = 0,
    second = 1;

  for (let i = 2; i < n; i++) {
    let tmp = first;
    first = second;
    second = tmp + second;
  }

  return first + second;
}

module.exports = { fibonacci };
