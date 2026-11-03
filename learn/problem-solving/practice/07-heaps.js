/**
 * Lesson 07: Heaps and top k. JavaScript has no built-in heap, so you build one.
 *
 * 1. class MinHeap
 *    new MinHeap(compare)   compare(a, b) is negative when a should come out before b. The default is (a, b) => a - b.
 *    push(x)    add a value. O(log n)
 *    pop()      remove and return the smallest value (undefined if empty). O(log n)
 *    peek()     look at the smallest value without removing it (undefined if empty). O(1)
 *    size()     how many values are inside
 *    Keep the values in a plain array. The parent of index i is (i - 1) >> 1. The children are 2i + 1 and 2i + 2.
 *
 * 2. kthLargest(nums, k)
 *    The k-th biggest number (k = 1 is the biggest). Use a MinHeap that never holds more than k numbers.
 *    Target: O(n log k) time, O(k) space. kthLargest([3, 2, 1, 5, 6, 4], 2) -> 5
 *
 * 3. topKFrequent(nums, k)
 *    The k numbers that appear most often, in any order. Count with a Map, then keep a heap of size k.
 *    topKFrequent([1, 1, 1, 2, 2, 3], 2) -> [1, 2]
 *
 * Run: node --test practice/07-heaps.test.js
 */

class MinHeap {
  constructor(compare = (a, b) => a - b) {
  }
  push(x) {
  }
  pop() {
  }
  peek() {
  }
  size() {
  }
}

function kthLargest(nums, k) {
}

function topKFrequent(nums, k) {
}

module.exports = { MinHeap, kthLargest, topKFrequent };
