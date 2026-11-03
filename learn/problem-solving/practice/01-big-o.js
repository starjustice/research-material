/**
 * Lesson 01: Big O. Make slow code fast.
 *
 * 1. hasDuplicate(nums)
 *    true if any number appears twice. Target: O(n) time.
 *    hasDuplicate([1, 2, 3, 1]) -> true     hasDuplicate([1, 2, 3]) -> false
 *
 * 2. commonItems(a, b)
 *    The numbers that are in both arrays, each one once, in the order they first appear in a.
 *    Target: O(n + m) time. (a.filter(x => b.includes(x)) is O(n * m): too slow.)
 *    commonItems([4, 9, 5, 9], [9, 4, 9, 8, 4]) -> [4, 9]
 *
 * 3. firstRepeated(nums)
 *    The first number whose second copy shows up earliest as you read left to right.
 *    Return undefined if nothing repeats. Target: O(n) time.
 *    firstRepeated([2, 1, 3, 1, 2]) -> 1     (the second 1 comes before the second 2)
 *
 * Run: node --test practice/01-big-o.test.js
 */

function hasDuplicate(nums) {
}

function commonItems(a, b) {
}

function firstRepeated(nums) {
}

module.exports = { hasDuplicate, commonItems, firstRepeated };
