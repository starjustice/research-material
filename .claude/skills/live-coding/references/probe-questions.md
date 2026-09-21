# Probe Questions — the interrogation bank

Ask **one at a time**, then stop and wait. Never fire a list.

## Before they write code
- "Any questions before you start?"
- "What's your approach — in one sentence?"
- "What's the time and space complexity of that plan?"
- "How big can the input get?" (if *they* didn't ask, note it and ask it yourself — then use their answer against them in the breaking phase)
- "Can you mutate the input?"
- "Is this called once, or a million times a second?"

## While they code
- "What's that variable for?"
- "You went quiet — what are you thinking?"
- "Is that loop doing what you want?" (only when you can see the bug — never as a bluff on correct code... except once per session, deliberately, to test whether they can defend right code under doubt)

## Correctness
- "Walk me through it with `[]`. What does it return?"
- "What about a single element?"
- "Negative numbers? Zero? Duplicates?"
- "What if the input is `null`?"
- "Does the order of the output matter? Is yours stable?"
- "You just said it works — did you run it, or are you guessing?"

## Complexity
- "What's the Big-O? Walk me through how you got there."
- "Where exactly is the n² coming from?"
- "What's the space complexity — and do you count the output?"
- "Is that worst case or average case? When does the worst case happen?"
- "Two solutions are both O(n). Which is actually faster, and why?" (constants: allocations, cache locality, network calls)

## Memory and failure modes
- "n = 1,000,000. What happens?"
- "Does it get slow, or does it crash? Which error do you expect?"
- "`RangeError: Maximum call stack size exceeded` or `JS heap out of memory` — which one, and why that one?"
- "How deep can your recursion go before Node gives up?" (~10k frames)
- "Is your recursion depth a function of n, or constant?"
- "Are the numbers still correct at that size?" (`Number.MAX_SAFE_INTEGER` = 2^53−1)
- "This runs in an Express handler. What happens to every *other* request while your loop runs?" (single-threaded event loop)

## Alternatives — the core of this skill
- **"What other solution could you write for this?"** (the anchor question — ask it every single problem)
- "Give me one that uses less memory."
- "Give me one that's faster, even if it's uglier."
- "Could you trade memory for speed here?"
- "What if the input were already sorted?"
- "What if you could preprocess the input once and query it many times?"
- "What if the data didn't fit in memory at all?"
- "Is there a version with no extra data structures?"
- "Solve it without recursion."
- "Which of your solutions do you ship, and why?"
- **"When is your *first* solution the better choice?"** (tests whether they know optimization has a cost)

## Why did you do that
- "Why a `Map` and not an object?"
- "Why recursion here?"
- "Why did you sort first — what did that buy you?"
- "You named it `temp`. What is it really?"
- "You used `let` there — could it be `const`?"
- "Why a `for` loop instead of `.reduce()`?"
- "You copied the array instead of mutating. Deliberate?"
- "Is that early return necessary, or just style?"

## Production / their real stack
- "300 requests per second hit this. Does your answer change?"
- "Where would you put a cache, and what invalidates it?"
- "This runs on 4 Node instances behind a load balancer. What breaks?" (in-memory state)
- "Could Postgres do this instead of JavaScript? Should it?"
- "What index would make this query fast? What does that index cost you on writes?"
- "How would you test this? What's the one test you'd definitely write?"
- "What would you log or measure to know it's slow in production?"
- "Would you ship this, or is there something you'd want to fix first?"

## JavaScript / TypeScript specific
- "`==` or `===` there — does it matter?"
- "Does this mutate the caller's array?"
- "What's `this` inside that callback?"
- "That's `async` — does `forEach` await it?" (no — the classic trap)
- "`Promise.all` vs `Promise.allSettled` here?"
- "Is that a shallow copy or a deep one?"
- "How would you type that in TypeScript — generic or `unknown`?"
- "What does `Object.keys` do with a `Map`?" (nothing useful — `[]`)
- "Why `WeakMap` instead of `Map`?" (GC: `Map` keeps the keys alive)
- "`structuredClone` — what does it not copy?"

## Behavioral, woven into the coding round (senior only)
- "Have you hit this problem for real? What did you do?"
- "A teammate ships the O(n²) version in review. What do you say?"
- "You're two hours from a deadline and you find this bug. What's your call?"
- "How do you decide it's fast enough and stop optimizing?"

## When they're stuck — say these, not the answer
- "Talk me through what you've got so far."
- "What's the smallest version of this problem you *can* solve?"
- "Forget the code — how would you do it by hand on paper?"
- "What information do you wish you had while looping?" (usually the memo/map hint)
- "Okay, let's take this one. Which part is fighting you?"
