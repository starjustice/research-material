/**
 * Lesson 02: Hash maps and sets.
 *
 * 1. firstUniqueChar(s)
 *    Index of the first character that appears only once, or -1. Target: O(n).
 *    firstUniqueChar("leetcode") -> 0     firstUniqueChar("aabb") -> -1
 *
 * 2. countWords(text)
 *    Return a Map of word -> how many times it appears. Lower case, words are split by spaces.
 *    countWords("the cat The dog") -> Map { "the" => 2, "cat" => 1, "dog" => 1 }
 *    Watch out for a word like "constructor". It must be counted as 1, not break.
 *
 * 3. longestConsecutive(nums)
 *    Length of the longest run of consecutive whole numbers (the order in nums does not matter).
 *    Target: O(n). Sorting is O(n log n), a Set can do it in O(n).
 *    longestConsecutive([100, 4, 200, 1, 3, 2]) -> 4     (1, 2, 3, 4)
 *
 * 4. class MyHashMap
 *    Build your own hash map from an array of buckets. Do NOT use Map, Set or an object to store the data.
 *    put(key, value)  save or replace
 *    get(key)         the value, or undefined
 *    remove(key)      true if it was there, false if not
 *    size             how many keys are stored (a property you can read)
 *    Keys are strings. Turn the key into a bucket number with your own hash function.
 *
 * Run: node --test practice/02-hash-maps.test.js
 */

function firstUniqueChar(s) {
}

function countWords(text) {
}

function longestConsecutive(nums) {
}

class MyHashMap {
  put(key, value) {
  }
  get(key) {
  }
  remove(key) {
  }
  get size() {
  }
}

module.exports = { firstUniqueChar, countWords, longestConsecutive, MyHashMap };
