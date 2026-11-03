# 07. Heaps and top k

> **Subject:** Problem solving · **Lesson:** 07 · **Made:** 2026-11-03 · **Status:** ready
>
> **You will be able to:** say what a heap (priority queue) is and why its top is always the smallest, write a `MinHeap` in JavaScript, explain push and pop in O(log n), and solve "top k" and "k-th largest" questions in O(n log k).
>
> **Before this:** [Binary search and sorting](06-binary-search-and-sorting.md) · **Next:** [Recursion, backtracking and dynamic programming](08-recursion-backtracking-and-dynamic-programming.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation. Skip them on the first read, open them when you want more. About 25 minutes for the cards.

## 1. The idea: the emergency room

In a shop, the person who came first is served first (a **queue**). In an emergency room, the **most urgent** patient is seen first, even if they just arrived. That is a **priority queue**: whoever has the best priority leaves first.

| Structure | Who comes out first |
|---|---|
| Stack | the newest |
| Queue | the oldest |
| **Priority queue** | the **smallest** (or the biggest, or the most urgent) |

A **heap** is the usual way to build a priority queue. It gives you the smallest item in one step, and takes in new items and gives items out in O(log n).

<details class="guess"><summary>🤔 Guess: you could keep a sorted array and take the first item. Why do people build a heap instead? Press to check.</summary>

Keeping the array sorted costs too much on every insert. I measured it: 50,000 inserts into an array that I re-sorted after each insert, then took the items out, took **about 18 seconds**. The same work with a heap took **19 ms**. A heap only keeps *just enough* order: the smallest on top. That is cheaper than a full sort.

</details>

> **Remember:** a heap keeps only "the smallest is on top", not a full sort. That makes push and pop cheap.

<details class="more"><summary>📖 More detail: new words</summary>

- **Priority queue:** the idea (a line where the best comes out first).
- **Heap:** the structure that does it (this lesson).
- **Min-heap:** the smallest is on top. **Max-heap:** the biggest is on top.
- JavaScript has **no built-in** heap or priority queue (I checked that Node 26.12.1 has none in its globals). So in an interview you write one, or ask whether you may assume one.

</details>

## 2. The shape: a tree stored in an array

A min-heap is a **binary tree** where every parent is **smaller than or equal to** its children. It is filled from the top, left to right, with no gaps. The smallest is always at the root.

```text
         1
       /   \
      3     8
     / \   / \
    5   9 10 11
```

The trick is that a full tree can be stored in a **plain array**, without any pointers:

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Value | 1 | 3 | 8 | 5 | 9 | 10 | 11 |

For the item at index `i`:

- parent: `(i - 1) >> 1` (the same as `Math.floor((i - 1) / 2)`)
- left child: `2i + 1`
- right child: `2i + 2`

Check: index 1 (value 3) has children at 3 and 4 (values 5 and 9). ✓

<details class="guess"><summary>🤔 Guess: are the children of 3 (5 and 9) in order, 5 then 9? And is 8 bigger than 5? Press to check.</summary>

5 and 9 happen to be in order here, but a heap does **not** promise it. The only promise is "parent ≤ children". 8 (on the right) is bigger than 5 (on the left, one level lower), and that is allowed too. A heap is **not** sorted. Only the top is known.

</details>

> **Remember:** parent ≤ children. The top is the smallest. Stored in an array: children of `i` are `2i + 1` and `2i + 2`.

<details class="more"><summary>📖 More detail: why "no gaps" matters</summary>

Because the tree is always full from the left, the array has no holes, and the index formulas always work. It also keeps the tree **balanced**: its height is always about log n, so walking up or down is cheap. This is what makes O(log n) true every time (unlike a plain BST, [lesson 04](04-trees-and-traversal.md)).

</details>

## 3. Push and pop: bubble up, sink down

**Push:** put the new value at the **end** (the next free spot). If it is smaller than its parent, swap them. Keep swapping up until the parent is smaller.

I pushed `5, 3, 8, 1` into an empty heap and printed the array:

```text
push 5  [5]
push 3  [3,5]      3 swapped up past 5
push 8  [3,5,8]
push 1  [1,3,8,5]  1 swapped up twice
```

**Pop:** the smallest is at index 0. Take it out. To fill the hole, move the **last** item to the top. It is probably too big, so **sink** it: swap it with its **smaller** child until it fits.

I started with `[1, 3, 8, 5, 9, 10, 11]` and popped:

```text
pop 1  ->  [3,5,8,11,9,10]
```

The 11 moved to the top, swapped with 3 (the smaller child), then with 5, and stopped at index 3.

<details class="guess"><summary>🤔 Guess: why do we move the LAST item to the top, and not the smaller child? Press to check.</summary>

The last item is the only one we can remove without leaving a **gap** in the array (and the tree stays full). Then we repair the order by sinking. Pushing and popping each walk one path from the top to the bottom (or back), and the tree has about log n levels. So both are **O(log n)**.

</details>

> **Remember:** push = add at the end and bubble up. Pop = take the top, move the last to the top, sink down. Both O(log n).

<details class="more"><summary>📖 More detail: watch it run</summary>

**Step through it yourself:** [Heap stepper](visuals/07-heaps-and-top-k.html). Tab 1 shows the pushes, tab 2 the pop. The tree and the array are drawn together, so you can see how the same numbers sit in both.

Why "smaller child" when sinking? If we swapped with the bigger child, that bigger child would become the parent of the smaller one, and the rule "parent ≤ children" would break.

</details>

## 4. A MinHeap in JavaScript

```js
class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.a = [];
    this.cmp = compare;
  }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[p], a[i]) <= 0) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0], last = a.pop();
    if (a.length === 0) return top;
    a[0] = last;
    let i = 0;
    for (;;) {
      let m = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
      if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
      if (m === i) break;
      [a[m], a[i]] = [a[i], a[m]];
      i = m;
    }
    return top;
  }
  peek() { return this.a[0]; }
  size() { return this.a.length; }
}
```

I pushed `5, 3, 8, 1, 9, 2, 7` and popped until empty. It printed `1 2 3 5 7 8 9`: sorted. (Pop until empty is a sort, called heap sort: O(n log n).)

The `compare` function makes it work for anything. For a max-heap, pass `(a, b) => b - a`. For pairs like `[value, count]`, pass `(p, q) => p[1] - q[1]` to order by the count.

<details class="guess"><summary>🤔 Guess: what does <code>peek()</code> cost? Press to check.</summary>

**O(1).** The smallest is at `a[0]`. We only read it.

</details>

> **Remember:** `push` and `pop` are O(log n). `peek` is O(1). `compare` lets you order by anything.

<details class="more"><summary>📖 More detail: building a heap from a list</summary>

Pushing n items one by one costs O(n log n). There is a cleverer way, called *heapify*, that builds a heap from a whole array in **O(n)**: start from the last parent and sink each one. I did not write it here. Know that it exists.

</details>

## 5. The top k pattern

*Find the 3 biggest numbers in `[5, 1, 9, 3, 7, 8]`. Or the k-th biggest.*

Sorting everything works: O(n log n). But you only need k items. Better: keep a **min-heap of size k**. It holds the best k so far, and its top is the **weakest of the best**: the one a new number must beat.

```js
function topK(nums, k) {
  const heap = new MinHeap();
  for (const x of nums) {
    if (heap.size() < k) heap.push(x);
    else if (x > heap.peek()) {
      heap.pop();
      heap.push(x);
    }
  }
  return heap; // holds the k biggest
}
```

For each number: one `peek` (O(1)), and sometimes a pop and a push (O(log k)). The heap never has more than k items, so the total is **O(n log k)** time and **O(k)** space.

I tested `kthLargest([3, 2, 1, 5, 6, 4], 2)` (the heap's top at the end) and got `5`. And on 1,000,000 numbers with k = 10:

| Method | Time (three runs) |
|---|---|
| Heap of size 10 | 14 to 25 ms |
| Sort everything, take the 10th | 203 to 251 ms |

<details class="guess"><summary>🤔 Guess: to find the k BIGGEST, we keep a MIN-heap. Why a min-heap, not a max-heap? Press to check.</summary>

The min-heap's top is the **smallest of the big ones**. That is exactly the number we compare each new value with, and the one we throw out when a bigger value arrives. A max-heap would put the biggest on top, which is the one thing we never need to remove. (Same trick the other way: for the k smallest, keep a max-heap.)

</details>

> **Remember:** k biggest = min-heap of size k. Its top is the one to beat. O(n log k).

<details class="more"><summary>📖 More detail: top k frequent</summary>

*Which k numbers appear the most?* Count with a Map ([lesson 02](02-hash-maps-and-sets.md)), then keep a min-heap of size k of `[value, count]` pairs, ordered by `count`. I ran `topKFrequent([1,1,1,2,2,3], 2)` and got `[2, 1]`: the right two numbers (the order of the answer is not fixed). The cost is O(n) for counting plus O(m log k) for the heap, where m is the number of different values.

</details>

## 6. When to use a heap

| The problem says | Use |
|---|---|
| "k-th largest / smallest", "top k" | heap of size k |
| "always give me the smallest next", while new items keep arriving | heap |
| "merge k sorted lists" | heap of the k front items |
| "schedule the most urgent task" | heap |
| shortest path with different edge costs (Dijkstra) | heap |
| "the whole thing sorted, once" | just `sort` |

<details class="guess"><summary>🤔 Guess: the full list is known, and you need it all sorted once. Heap or sort? Press to check.</summary>

**Sort.** A heap shines when you only need the best few, or when items keep arriving and leaving. For one full sort, the built-in `sort` is simpler and fast.

</details>

> **Remember:** heap = "I need the best next, again and again". Sort = "I need everything in order once".

<details class="more"><summary>📖 More detail: mistakes to avoid</summary>

1. **Thinking a heap is sorted.** Only the top is known. You cannot read the second smallest at index 1 for sure (it is one of index 1 or 2).
2. **A max-heap for the k biggest** (card 5).
3. **Searching inside a heap.** Finding an arbitrary value is O(n). A heap is not for lookups.
4. **Forgetting an empty heap.** `pop()` on empty gives `undefined`. Check `size()`.
5. **`sort` after every push** (card 1).

</details>

## 7. Why it matters and what it costs

Interview words: *heap*, *priority queue*, *min-heap*, *max-heap*, *top k*, *k-th largest*, *heapify*, *O(log n)*, *Dijkstra*.

- **Without it:** "the best k of a million" means sorting a million, and a scheduler keeps re-sorting a list.
- **With it:** each new item costs O(log n) and the best is always on top.
- **The cost:** more code to write in JavaScript (no built-in), no fast lookup of a middle item, and the order inside is only partial.

## 8. Watch and play

Links checked on 2026-11-03. Each page loaded (HTTP 200). For each video, the title and channel were confirmed through YouTube's oEmbed data. The video lengths were not checked.

- **Play with it:** [The heap stepper](visuals/07-heaps-and-top-k.html) in this folder. Guess first, then press Next. Tab 3 is the top 3.
- **Play with it:** [VisuAlgo: Binary Heap](https://visualgo.net/en/heap). Insert and extract values, and watch the bubble up and down.
- **Video:** [347. Top K Frequent Elements | Leetcode | Medium | Java | Heap | Striver's A to Z DSA Sheet/Course](https://www.youtube.com/watch?v=ICumod5MnP0) from the channel AlgorithmHQ. Card 5. It is in Java, the idea is the same.
- **Read:** [NeetCode roadmap](https://neetcode.io/roadmap). The "Heap / Priority Queue" group lists the usual practice problems. I only checked that the page loads.

## 9. Practice

**A. Predict the output** (write your answer first)

```js
const h = new MinHeap();
for (const x of [4, 1, 7, 3]) h.push(x);
console.log(h.peek(), h.size());
h.pop();
console.log(h.peek(), h.size());
```

<details class="guess"><summary>🤔 Press to see the answer</summary>

`1 4`, then `3 3`. After the four pushes the smallest is 1 and there are 4 items. After one pop (it removes the 1) the smallest of `4, 7, 3` is 3, and there are 3 items.

</details>

**B. What would you check?** A job runner keeps its jobs in an array and runs `jobs.sort(byPriority)` every time a job is added, then `jobs.shift()` to take the next one. It gets very slow with 100,000 jobs. What do you change?

<details class="guess"><summary>🤔 Press to see the answer</summary>

Two problems: a full sort on every add (O(n log n) each time) and `shift` (O(n) each time). Use a heap: `push` is O(log n) and `pop` gives the most urgent job in O(log n). In my test of the same pattern, 50,000 jobs took about 18 seconds with sort and shift, and 19 ms with a heap. In a real system, you might also use a queue service built for this.

</details>

**C. Write it yourself**

Open [`practice/07-heaps.js`](practice/07-heaps.js). It has `MinHeap`, `kthLargest` and `topKFrequent`. Run:

```bash
cd learn/problem-solving
node --test practice/07-heaps.test.js
```

<details><summary>One possible answer</summary>

`MinHeap` is the class in card 4. The other two:

```js
function kthLargest(nums, k) {
  const heap = new MinHeap();
  for (const x of nums) {
    if (heap.size() < k) heap.push(x);
    else if (x > heap.peek()) {
      heap.pop();
      heap.push(x);
    }
  }
  return heap.peek();
}

function topKFrequent(nums, k) {
  const counts = new Map();
  for (const x of nums)
    counts.set(x, (counts.get(x) || 0) + 1);
  const heap = new MinHeap((p, q) => p[1] - q[1]);
  for (const entry of counts) {
    if (heap.size() < k) heap.push(entry);
    else if (entry[1] > heap.peek()[1]) {
      heap.pop();
      heap.push(entry);
    }
  }
  const out = [];
  while (heap.size()) out.push(heap.pop()[0]);
  return out;
}
```

All 8 tests pass with this code (checked on 2026-11-03), and all 8 fail with the empty file. `kthLargest` is O(n log k) time and O(k) space. `topKFrequent` is O(n + m log k) time and O(m) space.

</details>

## 10. Interview question

**Q:** "Find the k-th largest element in an array. What is the time and space? Can you do better than sorting?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** sorting the whole array costs O(n log n), but we only need one item.
2. **How it works:** keep a min-heap of size k. For each number, if the heap has fewer than k items, push it. Otherwise, if the number is bigger than the top, pop the top and push the number. At the end the top is the k-th largest. Each step is at most O(log k), so O(n log k) total, O(k) space. On 1,000,000 numbers with k = 10 it took about 15 to 25 ms against about 200 to 250 ms for a full sort.
3. **Tradeoff:** for a small k the heap is much better. If k is close to n, it is about the same as sorting. There is also *quickselect*, which is O(n) on average, but O(n²) in the worst case and it changes the array. JavaScript has no built-in heap, so I would write a small `MinHeap` class.
4. **My example:** *This is an idea, not a fact. Replace it with a real story from DBO, Unloan, ZWS or Skyworx.* Showing the top 10 stores or the top 5 slowest requests from a large stream of records without keeping everything sorted.

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain a heap to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use these: the emergency room, the array with children at `2i + 1` and `2i + 2`, and 18 seconds against 19 ms.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. What does a priority queue give you that a queue does not?
2. What is the rule of a min-heap? Is a heap sorted?
3. How is a heap stored in an array? Where are the children of index `i`?
4. How does push work? How does pop work? What do they cost?
5. Why do we keep a MIN-heap to find the k biggest?
6. What is the cost of top k with a heap, and how does it compare with sorting?
7. Does JavaScript have a built-in heap?

<details><summary>Answers</summary>

1. The best item comes out first, not the oldest.
2. Every parent is smaller than or equal to its children, so the top is the smallest. No: only the top is known.
3. As a plain array. The children of `i` are `2i + 1` and `2i + 2`. The parent is `(i - 1) >> 1`.
4. Push: add at the end and bubble up. Pop: take the top, move the last item to the top, sink it. Both O(log n).
5. Its top is the smallest of the k biggest: the one a new number must beat and the one to remove.
6. O(n log k) time, O(k) space. Sorting is O(n log n) time. 14 to 25 ms against 203 to 251 ms on 1,000,000 numbers.
7. No. I checked Node 26.12.1: no heap or priority queue in the globals. You write one.

</details>

## 13. Go deeper (optional)

None of this is needed for the cards above.

<details><summary>Two heaps for a running median</summary>

Keep the smaller half in a max-heap and the bigger half in a min-heap. The median is on top of one of them. A known hard interview problem. I did not run it here.

</details>

<details><summary>Merge k sorted lists</summary>

Put the first item of each list in a min-heap (with which list it came from). Pop the smallest, add it to the result, and push the next item from the same list. O(N log k) for N items in total. I did not run it here.

</details>

<details><summary>Make the numbers yourself</summary>

Card 1: sort an array after each push, then `shift` all items, for 50,000 items. Card 5: time `kthLargest` against `nums.slice().sort((a, b) => b - a)[9]` for 1,000,000 numbers.

</details>

## Connected lessons

- [03. Arrays, linked lists, stacks and queues](03-arrays-linked-lists-stacks-and-queues.md): the plain queue, and `shift`.
- [04. Trees and traversal](04-trees-and-traversal.md): the tree shape, and why balance matters.
- [05. Graphs](05-graphs-bfs-dfs-and-cycles.md): Dijkstra uses a heap.
- [06. Binary search and sorting](06-binary-search-and-sorting.md): the sort you do not need when you only want the top k.
- [Redis](../database/23-sql-vs-nosql-and-redis.md): Redis has a sorted set that works like a priority queue (idea only, not run here).
- [Problem solving map](README.md): the practice folders.
