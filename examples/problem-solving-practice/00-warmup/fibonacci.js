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
function fibonacci(n) {
  throw new Error('not implemented');
}

module.exports = { fibonacci };
