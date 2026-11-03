const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFast } = require('../speed');
const { reverseList, hasCycle, mergeTwoLists, Queue } = require('./03-lists-stacks-queues');

const fromArray = (arr) => { let head = null; for (let i = arr.length - 1; i >= 0; i--) head = { val: arr[i], next: head }; return head; };
const toArray = (head) => { const out = []; while (head && out.length < 1e6) { out.push(head.val); head = head.next; } return out; };

test('reverseList', () => {
  assert.deepEqual(toArray(reverseList(fromArray([1, 2, 3, 4]))), [4, 3, 2, 1]);
  assert.deepEqual(toArray(reverseList(fromArray([1]))), [1]);
  assert.equal(reverseList(null), null);
});

test('reverseList: reuses the nodes (no new list)', () => {
  const head = fromArray([1, 2, 3]);
  const second = head.next;
  const newHead = reverseList(head);
  assert.equal(newHead.val, 3);
  assert.equal(newHead.next.next, head);
  assert.equal(head.next, null);
  assert.equal(second.next, head);
});

test('reverseList: 100000 nodes must be fast', () => {
  const head = fromArray(Array.from({ length: 100000 }, (_, i) => i));
  assertFast(300, () => assert.equal(reverseList(head).val, 99999));
});

test('hasCycle', () => {
  assert.equal(hasCycle(null), false);
  assert.equal(hasCycle(fromArray([1, 2, 3])), false);
  const a = fromArray([1, 2, 3, 4]);
  let tail = a; while (tail.next) tail = tail.next;
  tail.next = a.next;
  assert.equal(hasCycle(a), true);
  const one = { val: 1, next: null }; one.next = one;
  assert.equal(hasCycle(one), true);
});

test('hasCycle: 100000 nodes, no cycle, must be fast', () => {
  const head = fromArray(Array.from({ length: 100000 }, (_, i) => i));
  assertFast(300, () => assert.equal(hasCycle(head), false));
});

test('mergeTwoLists', () => {
  assert.deepEqual(toArray(mergeTwoLists(fromArray([1, 3]), fromArray([2, 4]))), [1, 2, 3, 4]);
  assert.deepEqual(toArray(mergeTwoLists(fromArray([1, 2, 4]), fromArray([1, 3, 4]))), [1, 1, 2, 3, 4, 4]);
  assert.deepEqual(toArray(mergeTwoLists(null, fromArray([5]))), [5]);
  assert.deepEqual(toArray(mergeTwoLists(fromArray([5]), null)), [5]);
  assert.equal(mergeTwoLists(null, null), null);
});

test('Queue: first in, first out', () => {
  const q = new Queue();
  assert.equal(q.size(), 0);
  assert.equal(q.dequeue(), undefined);
  assert.equal(q.peek(), undefined);
  q.enqueue('a'); q.enqueue('b'); q.enqueue('c');
  assert.equal(q.size(), 3);
  assert.equal(q.peek(), 'a');
  assert.equal(q.dequeue(), 'a');
  assert.equal(q.dequeue(), 'b');
  q.enqueue('d');
  assert.equal(q.dequeue(), 'c');
  assert.equal(q.dequeue(), 'd');
  assert.equal(q.dequeue(), undefined);
  assert.equal(q.size(), 0);
});

test('Queue: 200000 enqueue and dequeue must be fast (do not use shift)', () => {
  assertFast(400, () => {
    const q = new Queue();
    for (let i = 0; i < 200000; i++) q.enqueue(i);
    for (let i = 0; i < 200000; i++) assert.equal(q.dequeue(), i);
    assert.equal(q.size(), 0);
  });
});
