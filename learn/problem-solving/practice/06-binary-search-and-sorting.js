/**
 * Lesson 06: Binary search and sorting.
 *
 * 1. binarySearch(nums, target)
 *    nums is sorted from small to big. Return the index of target, or -1. Target: O(log n).
 *    binarySearch([2, 5, 8, 12], 8) -> 2     binarySearch([2, 5, 8, 12], 7) -> -1
 *
 * 2. lowerBound(nums, target)
 *    The index of the first number that is >= target. If every number is smaller, return nums.length.
 *    lowerBound([1, 2, 2, 2, 5], 2) -> 1     lowerBound([1, 2, 2, 2, 5], 3) -> 4     lowerBound([1, 2], 9) -> 2
 *
 * 3. minEatingSpeed(piles, h)
 *    Piles of bananas. Each hour you pick one pile and eat up to k bananas from it (leftover time in that hour is lost).
 *    Return the smallest whole k that finishes all piles in h hours or less.
 *    minEatingSpeed([3, 6, 7, 11], 8) -> 4
 *
 * 4. mergeSort(nums)
 *    Return a NEW sorted array (smallest first). Do not change nums. Do NOT use Array.prototype.sort.
 *    Target: O(n log n).
 *
 * Run: node --test practice/06-binary-search-and-sorting.test.js
 */

function binarySearch(nums, target) {
}

function lowerBound(nums, target) {
}

function minEatingSpeed(piles, h) {
}

function mergeSort(nums) {
}

module.exports = { binarySearch, lowerBound, minEatingSpeed, mergeSort };
