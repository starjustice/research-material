/**
 * Valid Parentheses
 *
 * The string has only ( ) [ ] { }. Return true if every opening bracket is closed by the same type, in the right order.
 *
 * Examples:
 *   isValid("()[]{}") -> true
 *   isValid("(]") -> false
 *   isValid("([)]") -> false
 *
 * Target: O(n) time, O(n) space
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. The most recent opening bracket must be closed first. Which data structure gives you "most recent first"?
 *   2. Push openers. On a closer, pop and check it matches. What must be true at the end?
 */
function isValid(s) {
  throw new Error('not implemented');
}

module.exports = { isValid };
