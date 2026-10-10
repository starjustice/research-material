/**
 * Daily Temperatures
 *
 * For each day, return how many days you must wait for a warmer temperature. If there is none, use 0.
 *
 * Examples:
 *   dailyTemperatures([73,74,75,71,69,72,76,73]) -> [1,1,4,2,1,1,0,0]
 *
 * Target: O(n) time
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. Brute force looks ahead from each day. When does that become slow?
 *   2. Keep a stack of days that are still waiting for a warmer day. When a warmer day arrives, who can it answer?
 *   3. Store indexes in the stack, not temperatures.
 */
function dailyTemperatures(temps) {
  throw new Error('not implemented');
}

module.exports = { dailyTemperatures };
