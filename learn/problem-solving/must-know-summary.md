# Problem solving (coding): what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews

This page is a short map of the 8 coding lessons. For coding rounds, you do not need to know hundreds of problems. You need about 10 patterns and the habit of saying the time and space cost out loud.

**How to read the stars.** This is my judgement of how often each topic comes up in coding rounds.

- ★★★ Comes up in almost every coding round. Learn these first.
- ★★ Comes up often. Learn these second.
- ★ Comes up in harder rounds.

## Always say these two things

After every solution, say: **"The time is O(...) and the space is O(...)."** Then say: **"I can do better by..."** if you can. Interviewers often care more about this than the code. This is lesson 01.

## ★★★ Learn these first

| Lesson | The pattern | Common trap |
|---|---|---|
| [01 Big O](01-big-o-time-and-space.md) | Big O is how the steps grow when the input grows, not the time. Loop after loop adds. Loop inside loop multiplies. Cutting in half each time is log. | A method call can hide a loop: `includes`, `indexOf`, `shift`, `slice` and spread all walk the array. Say both time and space. |
| [02 Hash maps and sets](02-hash-maps-and-sets.md) | A hash map problem is a question of "what is the key?". "The other number I need" is a lookup, so use `has`. A `Set` turns a loop inside a loop into one loop. | Collisions are normal, but many make it slow. Use `Map` and `Set`, not a plain object, for "any word a user gives me". |
| [03 Arrays, linked lists, stacks, queues](03-arrays-linked-lists-stacks-and-queues.md) | Reverse a linked list: save next, flip the arrow, move both forward (O(n) time, O(1) space). Cycle check: slow moves 1, fast moves 2. A stack remembers what is still open. | Say when an array is slow (the front) and when a linked list is slow (reading item i). |
| [04 Trees and traversal](04-trees-and-traversal.md) | Recursion on a tree: base case for null, then combine the left and the right. DFS uses a stack, BFS uses a queue. Inorder of a BST is sorted. | A BST is fast only if it stays balanced. Know how to validate a BST. |
| [05 Graphs: BFS, DFS, cycles](05-graphs-bfs-dfs-and-cycles.md) | Fewest steps is BFS (queue plus a seen set). Counting groups, such as islands in a grid, is DFS or BFS. A grid is a graph. | Mark a node as seen when you add it to the queue, not when you take it out. |

## ★★ Learn these second

| Lesson | The pattern | Common trap |
|---|---|---|
| [06 Binary search and sorting](06-binary-search-and-sorting.md) | On sorted data, look in the middle and throw away half. A million items need about 20 looks. "Smallest value that works" is binary search on the answer. | If the search area does not shrink each turn, the loop never ends. `sort()` needs `(a, b) => a - b` for numbers. |
| [08 Recursion, backtracking, DP](08-recursion-backtracking-and-dynamic-programming.md) | Recursion needs a base case and a call on something smaller. If the same sub-problem repeats, remember the answer (memoization). DP is a table: say what a cell means. | Backtracking is choose, explore, undo, and it is O(2ⁿ) or O(n!) at worst. Prune early. |

## ★ Harder rounds

| Lesson | The pattern |
|---|---|
| [07 Heaps and top k](07-heaps-and-top-k.md) | The k biggest items: use a min-heap of size k. Its top is the one to beat. O(n log k), better than sorting everything. |

## Other patterns in the folder

The folder also has practice sets for hash map, two pointers, sliding window and stack problems (`01-hash-map`, `02-two-pointers`, `03-sliding-window`, `04-stack`). Two pointers and sliding window are very common in interviews. Do them after lesson 02.

## The 6 questions most likely to come up

1. "What is the time and space complexity? Can you do better?" (01)
2. Two sum, or "find duplicates". Use a hash map. (02)
3. "Reverse a linked list" or "detect a cycle". (03)
4. "Level order traversal" or "validate a BST". (04)
5. "Count the islands" or "shortest path". (05)
6. "Find the kth largest element." (07)

## Practice

- The [problem solving README](README.md) lists the problems and the solve log.
- Run tests with `node --test` in the practice folders.
- Your coding rounds are live, so also use the `/live-coding` skill.

## Honest notes

- This page only compresses the lessons' "Remember" lines. If it disagrees with a lesson, the lesson is right.
