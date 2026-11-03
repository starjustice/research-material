/**
 * Lesson 03: Linked lists, stacks and queues.
 *
 * A list node is a plain object: { val, next }. The last node has next = null. An empty list is null.
 *
 * 1. reverseList(head)
 *    Reverse the list and return the new head. Target: O(n) time, O(1) space (no new nodes).
 *    1 -> 2 -> 3 -> null   becomes   3 -> 2 -> 1 -> null
 *
 * 2. hasCycle(head)
 *    true if following next ever loops back to a node you already saw. Target: O(n) time, O(1) space.
 *    Hint: two pointers, one moves 1 step and the other 2 steps.
 *
 * 3. mergeTwoLists(a, b)
 *    a and b are sorted lists. Return one sorted list made of all their nodes.
 *    1 -> 3 and 2 -> 4   gives   1 -> 2 -> 3 -> 4
 *
 * 4. class Queue
 *    enqueue(x) adds at the back. dequeue() removes from the front and returns it (undefined if empty).
 *    peek() looks at the front. size() is how many are inside.
 *    Every method must be O(1) on average. array.shift() is O(n) on a big array, so do not use it.
 *
 * Run: node --test practice/03-lists-stacks-queues.test.js
 */

function reverseList(head) {
}

function hasCycle(head) {
}

function mergeTwoLists(a, b) {
}

class Queue {
  enqueue(x) {
  }
  dequeue() {
  }
  peek() {
  }
  size() {
  }
}

module.exports = { reverseList, hasCycle, mergeTwoLists, Queue };
