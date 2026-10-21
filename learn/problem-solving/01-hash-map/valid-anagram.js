/**
 * Valid Anagram
 *
 * Return true if t uses exactly the same letters as s, the same number of times.
 *
 * Examples:
 *   isAnagram("listen", "silent") -> true
 *   isAnagram("rat", "car") -> false
 *
 * Target: O(n) time
 *
 * Hints (open one at a time, only after 25 minutes of real trying):
 *   1. One way is to sort both strings and compare. What does that cost?
 *   2. Count the letters in s with a Map or object. What do you do with t?
 */

// Method 1: Sort and Compare
// Time Complexity: O(n log n) - sorting both strings
// Space Complexity: O(n) - split() creates arrays and join() creates strings

// function isAnagram(s, t) {
//   return s.split("").sort().join("") === t.split("").sort().join("");
// }

// Method 2: Map (Character Counting)
// Time Complexity: O(n) - iterate through both strings
// Space Complexity: O(k) - store distinct characters in a Map
// k = number of distinct characters
function isAnagram(s, t) {
  if (s.length !== t.length) {
    return false;
  }

  let mapData = new Map();

  for (let c of s) {
    mapData.set(c, (mapData.get(c) || 0) + 1);
  }

  for (let c of t) {
    if (!mapData.has(c)) {
      return false;
    }

    mapData.set(c, mapData.get(c) - 1);

    if (mapData.get(c) < 0) {
      return false;
    }
  }
  return true;
}

module.exports = { isAnagram };
