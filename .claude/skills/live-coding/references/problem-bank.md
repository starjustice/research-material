# Problem Bank

Each problem: the prompt to give, what a good candidate clarifies, the **solution ladder** (what "what other solution?" should produce), the input that **breaks** each rung, and the probes to ask.

Give the prompt only. Never show the ladder during the session — it's the answer key for the scorecard.

---

## Tier 1 — Warm-up (10–15 min each)

### 1.1 Fibonacci — the flagship problem for this skill

**Prompt:** "Write a function that returns the nth Fibonacci number."
(Deliberately don't say how big n is. If they ask: "could be 10, could be a million." That sets the trap.)

**Solution ladder:**

| # | Solution | Time | Space | Breaks on |
|---|---|---|---|---|
| 1 | Naive recursion | O(1.618^n) | O(n) stack | **n ≈ 40 hangs** (~1.6 billion calls) |
| 2 | Recursion + memo (`Map`/object) | O(n) | O(n) heap + O(n) stack | n ≈ 10,000 → `RangeError: Maximum call stack size exceeded` |
| 3 | Bottom-up loop, array `dp[]` | O(n) | O(n) heap | huge n wastes memory storing every value |
| 4 | Two variables `[prev, curr]` | O(n) | **O(1)** | still linear — slow if n is astronomically large |
| 5 | Fast doubling / matrix power | **O(log n)** mults | O(log n) | only worth it for enormous n; harder to read |
| 6 | Precomputed table / cached across calls | O(1) lookup | O(k) | only if the range is known and bounded |

**The two walls — make them distinguish these:**
- Solution 1 dies of **time**, not stack. Its depth is only n. Candidates almost always say "stack overflow" here — that's wrong, and it's the single most valuable correction in this problem.
- Solution 2 dies of **stack depth** at roughly 10k frames in Node. Fix: convert to iteration (solution 3/4), not more memo.
- **Precision wall:** all of them go silently wrong past `Number.MAX_SAFE_INTEGER` (2^53−1). With fib(1)=fib(2)=1, values stay exact to fib(78) and fib(79) is already wrong — **no error thrown**. Fix: `BigInt`.

**Probes:**
- "You wrote recursion. Why?" (readability is a valid answer — make them say it)
- "n = 50. What happens? Time it in your head."
- "Now memoize it. n = 100,000 — what happens now?"
- "Do you even need the array in the bottom-up version?"
- "fib(100) — is your answer correct? Are you sure?" (precision trap)
- "This is an API endpoint hit 1000×/sec with n ≤ 90. What do you ship?" (answer: a precomputed array of 90 BigInts — O(1), and the fanciest algorithm is pointless)

---

### 1.2 Recursive sum — the *real* stack overflow

**Prompt:** "Write `sumTo(n)` that adds 1 + 2 + … + n. Use recursion."

**Ladder:** recursion O(n) stack → **`sumTo(100000)` throws `RangeError`** → convert to a loop, O(1) space → closed form `n*(n+1)/2`, O(1) time.

**Why it's here:** this is the true stack-overflow demo. Pair it with Fibonacci so they learn that "recursion is expensive" has two completely different meanings with two different fixes.

**Probes:** "Why did this one overflow when recursive Fibonacci didn't?" · "What's tail call optimization, and does Node do it?" (answer: spec'd in ES2015, **not implemented in V8/Node** — Safari/JSC is the outlier) · "Explicit stack vs. loop — when would you use an explicit stack?"

---

### 1.3 Character frequency count

**Prompt:** "Count how many times each character appears in a string."

**Ladder:** nested loop + `indexOf` O(n²) → plain object O(n) → `Map` O(n) → `Array(26)` when the alphabet is known.

**Probes:** "Object or `Map` — why?" (Map: any key type, no prototype keys like `constructor`, preserves insertion order, sized via `.size`) · "What breaks if the string contains `__proto__`?" · "Emoji — does your loop count 👨‍👩‍👧 as one character?" (surrogate pairs; `[...str]` vs `str[i]`)

---

## Tier 2 — Core (20–30 min each)

### 2.1 Two Sum

**Prompt:** "Given an array of numbers and a target, return the indices of two numbers that add to the target."

**Ladder:** brute force nested loop O(n²)/O(1) → **hash map, one pass O(n)/O(n)** → if the array is sorted, two pointers O(n)/**O(1)**.

**Probes:** "You traded memory for speed — how much memory?" · "When is the O(n²) version the right call?" (tiny n, memory-constrained, or the input is already sorted and you want O(1) space) · "What if the array is sorted? Does your answer change?" · "Duplicates? Multiple valid pairs — which do you return?"

---

### 2.2 Flatten a nested array

**Prompt:** "Flatten an arbitrarily nested array into a flat one."

**Ladder:** recursion O(n) → **deep nesting (10k levels) → stack overflow** → iterative with an explicit stack array → `arr.flat(Infinity)` (native, still recurses internally) → generator for lazy streaming when the result is huge.

**Probes:** "How deep can your version go before it dies?" · "Build me a nested array that breaks it." · "The flat result is 10M items — do you want an array at all?" (generator, streaming) · "`flat(Infinity)` — is it safe? What's the catch?"

---

### 2.3 Deep clone an object

**Prompt:** "Write a deep clone."

**Ladder:** `JSON.parse(JSON.stringify(x))` → **loses `Date`, `Map`, `Set`, `undefined`, functions, `NaN`→`null`, and throws on cycles** → hand-rolled recursion → cycles infinite-loop → `WeakMap` to track seen objects → native `structuredClone()`.

**Probes:** "What does the JSON trick silently lose?" · "Make me a cyclical object and run your code." · "Why `WeakMap` and not `Map`?" (garbage collection — Map pins the objects alive) · "`structuredClone` — what does *it* not handle?" (functions, DOM nodes, class prototypes — you get a plain object back)

---

### 2.4 Debounce (then throttle)

**Prompt:** "Implement `debounce(fn, ms)`."

**Ladder:** closure + `setTimeout`/`clearTimeout` → preserve `this` and arguments → add a `.cancel()` → leading-edge option → then: "now throttle, and tell me the difference."

**Probes:** "Why does the timer id live in a closure and not a global?" · "Search-as-you-type: debounce or throttle? Scroll handler: which?" (debounce = wait for quiet; throttle = at most once per interval) · "In React, what happens to your debounced function on every re-render?" (recreated — needs `useMemo`/`useRef`) · "Does it work with arrow functions and `this`?"

---

### 2.5 LRU cache

**Prompt:** "Build an LRU cache with `get` and `put`, capacity N, both O(1)."

**Ladder:** object + array of keys → `indexOf`/`splice` is O(n) → **`Map` (insertion-ordered): delete-then-set to promote, evict `map.keys().next().value`** → the classic hash map + doubly linked list (what you'd write in a language without ordered maps).

**Probes:** "Why is the array version not O(1)?" · "How does `Map` give you ordering for free?" · "Capacity by item count or by bytes?" · "This is a per-process cache on 4 Node instances behind a load balancer — what's wrong with that?" (four inconsistent caches → Redis) · "Now add TTL. What changes?"

---

## Tier 3 — Senior / applied to their real stack (30–45 min)

### 3.1 Fetch with retry

**Prompt:** "Write `fetchWithRetry(url)` — retry on failure, up to 3 times."

**Ladder:** loop + retry → fixed delay → **exponential backoff** → backoff + jitter (avoids thundering herd) → `AbortController` timeout per attempt → don't retry 4xx, only 5xx/network → circuit breaker.

**Probes:** "1000 clients all retry at the same moment — what happens to your server?" (that's why jitter exists) · "Should you retry a 400? A 429?" (429: respect `Retry-After`) · "Is the request idempotent? Does that change what's safe to retry?" · "Where does the timeout go — around all retries, or each one?"

---

### 3.2 Concurrency limiter

**Prompt:** "You have 10,000 URLs to fetch. Write code that fetches them at most 5 at a time."

**Ladder:** `for` loop with `await` — correct but serial and slow → `Promise.all(all 10k)` — **opens 10k sockets, exhausts memory/file handles, gets you rate-limited** → chunks of 5 via `Promise.all` — simple, but each chunk waits for its slowest member → a worker pool that starts a new task the instant one finishes → `p-limit` / `Promise.allSettled` for partial failure.

**Probes:** "Which is faster, chunks or a pool? Why?" · "One URL fails — what does `Promise.all` do to the other 9,999?" (rejects immediately; the rest keep running unobserved) · "`allSettled` vs `all` — when each?" · "Memory: are you holding 10,000 responses in an array?"

---

### 3.3 Paginate a large Postgres table

**Prompt:** "Your table has 50 million rows. Build a paginated API for it."

**Ladder:** `LIMIT/OFFSET` → **page 100,000 gets slow** — Postgres still scans and throws away every skipped row → **keyset/cursor pagination:** `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20` with a matching composite index → opaque encoded cursor in the API → count queries: `COUNT(*)` is a full scan, use an estimate or drop total pages.

**Probes:** "Why does OFFSET get slower as the page number grows?" · "Why include `id` in the sort key?" (tiebreak — non-unique `created_at` duplicates/skips rows across pages) · "What index makes this fast?" · "A row is inserted while the user pages — what does each approach do?" (OFFSET shifts/duplicates; keyset is stable) · "Can the user jump to page 500 with keyset?" (no — that's the tradeoff)

---

### 3.4 The N+1 query

**Prompt:** "Here's a GraphQL resolver: `posts` returns 100 posts, and each post resolves its `author`. What happens?"

**Ladder:** 1 + 100 queries → `JOIN` in one query (over-fetches, awkward with nested resolvers) → **DataLoader: batch the author ids fired in one tick into a single `WHERE id = ANY($1)`**, plus per-request cache → cache across requests (now you own invalidation) → Prisma's `include` / Hasura's automatic joins.

**Probes:** "How does DataLoader know when to batch?" (collects keys, flushes on the next microtask tick) · "Why is its cache per-request and not global?" (stale data + cross-user leakage) · "The batched query returns 100 rows in a different order than the keys — what must the loader do?" (map results back to key order, and return `null` for missing ones) · "Query depth 5, 100 items each — what's your defense?" (depth/complexity limits)

---

### 3.5 useEffect fetch race condition

**Prompt:** "Write a React component that fetches a user by id and shows the name. `id` comes from props."

**Ladder:** naive `useEffect` fetch → **switch id fast: response for id=1 lands after id=2 and overwrites it** → `let cancelled = false` flag in the cleanup → `AbortController` in the cleanup (also cancels the request) → React Query / SWR (caching, dedupe, retries, stale-while-revalidate) → Next.js server component, no client fetch at all.

**Probes:** "Type an id fast — which response wins?" · "What exactly does the cleanup function run for?" · "Ignore-flag vs AbortController — what's the difference?" (flag ignores the result; abort stops the work) · "Why does this bug appear in dev twice but not prod?" (StrictMode double-invoke) · "Why would you *not* reach for React Query here?"

---

### 3.6 Rate limiter

**Prompt:** "Limit each user to 100 requests per minute."

**Ladder:** counter in a JS object → **fixed window lets 200 through across the boundary** → sliding window log (accurate, stores every timestamp = memory) → sliding window counter (approximate, cheap) → token bucket (allows bursts, smooth refill) → in-memory breaks across N instances → Redis `INCR` + `EXPIRE`, or a Lua script for atomicity.

**Probes:** "Show me the exact requests that beat a fixed window." (100 at 0:59, 100 at 1:00) · "1 million users — how much memory does the log version use?" · "Two Node processes behind a load balancer — is your limit still 100?" · "Redis goes down — do you fail open or fail closed?" (a real senior tradeoff question) · "Limit per user, per IP, or per endpoint?"

---

## Picking problems for a session

- **SE level:** one from Tier 1, two from Tier 2.
- **Senior:** one from Tier 2 as a warm-up, then two from Tier 3.
- **Frontend-heavy role:** 1.3, 2.4, 3.5, plus 2.3.
- **Backend-heavy role:** 2.1, 3.2, 3.3, 3.4, 3.6.
- **"Just algorithms" screen:** 1.1, 1.2, 2.1, 2.2 — and spend the time on the ladder, not the code.
- Always include **1.1 Fibonacci** in a candidate's first-ever session. Everything this skill teaches is visible in that one problem.
