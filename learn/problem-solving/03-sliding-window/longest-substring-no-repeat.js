/**
 * Longest Substring Without Repeating Characters
 *
 * Return the length of the longest piece of the string (consecutive characters) that has no repeated character.
 *
 * Examples:
 *   lengthOfLongestSubstring("abcabcbb") -> 3   ("abc")
 *   lengthOfLongestSubstring("bbbbb") -> 1
 *   lengthOfLongestSubstring("pwwkew") -> 3   ("wke")
 *
 * Target: O(n) time
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. Think of a window [left, right]. Grow right one step at a time.
 *   2. When the new character is already inside the window, where must left move to?
 *   3. A Map from character to its last index lets you jump left directly.
 */
function lengthOfLongestSubstring(s) {
  throw new Error('not implemented');
}

module.exports = { lengthOfLongestSubstring };
