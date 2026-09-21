# Solution Ladders — how to answer "what other solution?"

When the candidate says "I think that's the only way", pick a move from this list and nudge them toward it. These are the transformations that turn any working solution into a different one. Every move has a cost — **a candidate who names the cost is the one who passes.**

## The 12 moves

### 1. Recursion ↔ iteration
Recursive → loop with an explicit stack/queue array.
**Buys:** no call-stack limit (heap is far bigger than the ~10k-frame stack in Node).
**Costs:** more code, less readable, you manage state by hand.
**Nudge:** "Same logic, but without recursion — how?"

### 2. Remember what you computed (memoize / cache)
Add a `Map`, object, or `WeakMap` keyed by the input.
**Buys:** exponential → linear. The single biggest win in the Fibonacci ladder.
**Costs:** memory grows with distinct inputs; cache invalidation becomes your problem; wrong for non-pure functions.
**Nudge:** "You're computing the same thing more than once. Can you prove it?"

### 3. Trade memory for time (hash map / set)
Replace a scan (`includes`, `indexOf`, inner loop) with O(1) lookup.
**Buys:** O(n²) → O(n).
**Costs:** O(n) extra memory; hashing overhead makes it *slower* for tiny n.
**Nudge:** "What data structure gives you O(1) lookup?"

### 4. Go bottom-up
Recursion computes top-down; a loop can build from the base case up.
**Buys:** drops the call stack entirely, often drops the memo too.
**Costs:** you must work out the iteration order; some problems don't have an obvious one.
**Nudge:** "Instead of asking for fib(n−1), can you build up to n?"

### 5. Keep only what you need (rolling window of state)
Bottom-up often keeps a full `dp[]` array when two variables suffice.
**Buys:** O(n) space → O(1).
**Costs:** you lose the intermediate results — bad if the caller wants the whole sequence.
**Nudge:** "Do you actually need the whole array?"

### 6. Sort first
Sorting costs O(n log n) but then unlocks two pointers, binary search, and dedupe-by-adjacency.
**Buys:** many O(n²) problems collapse to O(n log n).
**Costs:** the sort itself; mutates the input unless you copy; **destroys original order** (fatal if indices matter — e.g. Two Sum returning indices).
**Nudge:** "What if the input were sorted?"

### 7. Two pointers / sliding window
Replace nested loops over a sorted array or a contiguous range.
**Buys:** O(n²) → O(n), with **O(1) space** — beats the hash-map version on memory.
**Costs:** only works when sorted or when the window is contiguous and monotonic.
**Nudge:** "Two indices instead of two loops — can that work?"

### 8. Binary search
Any sorted/monotonic search space — including "search the answer" problems.
**Buys:** O(n) → O(log n).
**Costs:** needs sorted or monotonic data; off-by-one bugs are notorious.
**Nudge:** "Can you halve the search space each step?"

### 9. Pick a better structure
Heap (top-k, priority), Set (membership), Map (ordered kv), doubly linked list (O(1) removal), trie (prefixes), bit flags (compact sets).
**Buys:** turns the expensive operation into the cheap one.
**Costs:** more machinery; some need a library; usually less obvious to the next reader.
**Nudge:** "You only need the top 10 of a million — do you need to sort all of them?" (heap: O(n log k))

### 10. Precompute / move work off the hot path
Build a lookup table at startup, materialize a view, denormalize a column, add a DB index, cache at the CDN.
**Buys:** request-time cost → O(1).
**Costs:** startup time, staleness, memory, write-time cost. **Indexes make reads fast and writes slower.**
**Nudge:** "n is always ≤ 90. Do you need to compute anything at request time?"

### 11. Don't do it all at once — batch, stream, or defer
Batch (DataLoader), stream (generators, cursors, Node streams), paginate, or push to a queue/background job.
**Buys:** bounded memory, no blocked event loop, fewer round trips.
**Costs:** complexity, ordering and partial-failure handling, eventual consistency.
**Nudge:** "The result is 10 million rows. Are you putting them all in an array?"

### 12. Push it down a layer
Do it in SQL instead of JS. Let the DB `JOIN`/aggregate/index. Let Postgres sort. Let the CDN cache.
**Buys:** usually an order of magnitude — the DB is written in C and has the index.
**Costs:** DB load, harder to test, logic split across layers, DB is the hardest thing to scale out.
**Nudge:** "You fetched 10,000 rows to count them in JavaScript. Why?"

---

## The moves that go *backwards* — and when they win

Seniors know optimization is not free. Push the candidate to defend the simple version:

- **O(n²) is fine when n is small and bounded.** 20 items? The nested loop is clearer and probably faster than building a hash map.
- **Recursion is fine when depth is bounded.** A tree that's 5 levels deep will never overflow. Recursive code reads better.
- **A dependency is fine.** `p-limit`, `lodash.debounce`, React Query — battle-tested beats hand-rolled when it isn't the product.
- **Readable beats clever.** Matrix-exponentiation Fibonacci is O(log n) and nobody on the team can maintain it.
- **Measure first.** "I'd profile before optimizing" is a *correct* senior answer — as long as they can also tell you what they'd do if the profile confirmed the problem.

If a candidate always reaches for the fanciest rung, that's a finding too. Ask: **"is this optimization worth it here?"**

---

## Complexity cheat table for the feedback phase

| Pattern | Time | Space |
|---|---|---|
| Single loop | O(n) | O(1) |
| Nested loop over the same array | O(n²) | O(1) |
| Halving each step (binary search) | O(log n) | O(1) |
| Loop × halving (n heap inserts) | O(n log n) | O(n) |
| Sort | O(n log n) | O(n) or O(log n) |
| Recursion, 2 calls per level, depth n | O(2^n) | O(n) stack |
| Hash map lookup | O(1) avg | O(n) |
| Memoized recursion, n distinct inputs | O(n) | O(n) heap + O(n) stack |

**Reminders the candidate will get wrong:**
- `array.includes` / `indexOf` inside a loop = **O(n²)**, not O(n).
- Spreading into a new array inside a loop (`acc = [...acc, x]`) = **O(n²)**.
- `array.shift()` / `unshift()` are **O(n)** — a queue built on `shift()` is quadratic.
- Recursion space = **max depth**, not total number of calls.
- Big-O hides constants: O(n) with a network call per item is far worse than O(n²) in memory.
