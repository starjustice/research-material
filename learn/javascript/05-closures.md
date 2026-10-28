# 05. Closures

> **Subject:** JavaScript · **Lesson:** 05 · **Made:** 2026-10-12 · **Rewritten in simpler words:** 2026-10-15 · **Remade in short cards:** 2026-10-28 · **Status:** ready
>
> **You will be able to:** say what a closure is in one sentence, draw the box that stays alive after `makeCounter` is done, and explain why two counters do not share `count`.
>
> **Before this:** [Functions](04-functions.md) · **Next:** [this, call, apply and bind](06-this-call-apply-and-bind.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation. Skip them on the first read, and open them when you want more. About 25 minutes for the cards.

## 1. The idea: a locker and a key

A school gives every new student **their own locker** and **a key** to it. The locker holds a number, `count`. The school day ends and the office closes, but the lockers stay, because students still have keys.

```mermaid
graph TB
    A["makeCounter() makes<br/>a box with count = 0"] --> B["It returns a function<br/>that keeps a link to the box"]
    B --> C["makeCounter ends.<br/>The box stays alive."]
```

Notice: when `makeCounter` finishes, it leaves the call stack. Its box does **not** disappear, because the inner function still points at it.

<details class="guess"><summary>🤔 Guess: `makeCounter` has finished. Is its `count` gone? Press to check.</summary>

No. The inner function carries a link to the box, and the link keeps the box alive. The function can still read and change `count`. That function is a **closure**.

</details>

> **Remember:** a function carries a link to the box where it was made. A box stays alive as long as something points at it.

<details class="more"><summary>📖 More detail: the four words, and where the locker picture stops</summary>

- **Scope box:** the place in memory where the variables of one function call live. Every call makes a **new** box. (Interview word: *environment*. Lesson 01 called it a "room".)
- **Link:** every function carries a link to the box where it was made. Every box also links to the box around it.
- **Call stack:** the list of calls that are running right now. A call leaves the list when it finishes.
- **Cleaner:** the part of JavaScript that frees memory when nothing points at it any more. (Interview word: *garbage collector*.)

In the locker picture: student A opens locker A and adds one. Student B has a different key, so B cannot touch locker A. When the last key to a locker is thrown away, the cleaner can remove the locker.

Where the picture stops: a real key only opens the locker. In JavaScript the link points at the **live** box, so the function always sees the newest value. And several functions can hold keys to the **same** box (the bank account in the stepper: `deposit` and `read` share one box).

</details>

## 2. The problem: how can a function remember?

A function that must remember something has two bad choices.

| Choice | What happens |
|---|---|
| A local variable | It dies when the call ends, so the function forgets. |
| A global variable | It stays, but everyone shares it and anyone can change it. |

```js
function next() {
  let count = 0;
  count = count + 1;
  return count;
}
console.log(next(), next());
```

<details class="guess"><summary>🤔 Guess: what does this print? Press to check.</summary>

`1 1`. Each call makes a new `count` as 0, and it is gone when the call ends. The function forgot.

A global `count` would remember, but the cart counter and the likes counter would share one number. A closure gives each counter its own private box.

</details>

> **Remember:** a local variable forgets. A global variable is shared. A closure remembers, privately.

<details class="more"><summary>📖 More detail: what a closure gives you</summary>

- **Memory between calls** (a counter, `once`, `memoize`).
- **Private data** (the bank account in the stepper: nobody can read `balance` except through `read`).
- **Callbacks that remember** (timers, click handlers, promise callbacks). Without a closure, a callback that runs later would have no way to use the data around it.
- **Function makers** (`multiplyBy(2)` gives back a new function that doubles).

</details>

## 3. Two counters, two boxes

```js
function makeCounter() {
  let count = 0;
  return function () {
    count = count + 1;
    return count;
  };
}
const a = makeCounter();
const b = makeCounter();
console.log(a());
console.log(a());
console.log(b());
console.log(a());
```

```mermaid
graph LR
    A["a"] --> S1["Box 1<br/>count"]
    B["b"] --> S2["Box 2<br/>count"]
```

<details class="guess"><summary>🤔 Guess: what are the four lines of output? Press to check.</summary>

```
1
2
1
3
```

`b()` printed `1`, not `3`. Every call of `makeCounter` makes a **new** box, so the second counter has its own `count`. `a` only ever touches box 1.

</details>

> **Remember:** every call of the outer function makes a new box. Two counters do not share `count`.

<details class="more"><summary>📖 More detail: the code, step by step</summary>

| Step | Line | What happens | Call stack | Boxes alive | Prints |
|---|---|---|---|---|---|
| 1 | setup | JavaScript makes the Global box. It holds `makeCounter` (a function), and `a` and `b` (locked). | main | Global | |
| 2 | 8 | `makeCounter()` is called. JavaScript makes a **new box S1** for this call. | main, makeCounter | Global, S1 | |
| 3 | 2 | `count = 0` goes into S1. | main, makeCounter | Global, S1 (count 0) | |
| 4 | 3 | The inner function is made **while JavaScript is inside S1**, so it gets a **link to S1**. It is returned. | main, makeCounter | Global, S1 | |
| 5 | 8 | `makeCounter` finishes and leaves the stack. **S1 stays**, because the returned function points at it. The function is saved in `a`. | main | Global, S1 (count 0) | |
| 6 | 9 | `makeCounter()` is called again. A **new box S2** is made, with `count = 0`. | main, makeCounter | Global, S1, S2 | |
| 7 | 9 | It returns a function linked to S2. It is saved in `b`. | main | Global, S1 (0), S2 (0) | |
| 8 | 10 | `a()` is called. It gets a small box for this call. Its outer link is the one `a` carries: **S1**. | main, a | Global, S1, S2, small box | |
| 9 | 4 | `count = count + 1`. There is no `count` in the small box, so follow the link to S1. It holds 0, so it becomes 1. | main, a | S1 (1), S2 (0), small box | |
| 10 | 5 | Returns 1. The small box is thrown away. | main | S1 (1), S2 (0) | 1 |
| 11 | 11 | `a()` again. S1 holds 1, so it becomes 2. | main | S1 (2), S2 (0) | 1 2 |
| 12 | 12 | `b()`. Its link is **S2**. S2 holds 0, so it becomes 1. S1 is not touched. | main | S1 (2), S2 (1) | 1 2 1 |
| 13 | 13 | `a()`. S1 holds 2, so it becomes 3. | main | S1 (3), S2 (1) | 1 2 1 3 |

Checked on 2026-10-28 with Node 26.12.1.

</details>

## 4. Mistake 1: thinking a closure copies the value

```js
function make() {
  let x = 1;
  const read = () => x;
  x = 2;
  return read;
}
console.log(make()());
```

<details class="guess"><summary>🤔 Guess: does it print 1 or 2? Press to check.</summary>

**2.** The function reads `x` from its box every time it runs. It holds a link to the box, not a copy of the value, so it sees the latest value.

</details>

> **Remember:** a closure keeps a link to the box, not a copy of the value.

<details class="more"><summary>📖 More detail: a function reads names from where it was written</summary>

The link is made when the function is made, and it never changes. When `a()` runs and needs `count`, it follows the links: its own small box, then box 1, then the global scope, then `ReferenceError`. It never looks at the box that **called** `a`.

</details>

## 5. Mistake 2: thinking a function reads names from its caller

```js
const name = "global";
function show() {
  console.log(name);
}
function run() {
  const name = "inside run";
  show();
}
run();
```

<details class="guess"><summary>🤔 Guess: does `show` print `global` or `inside run`? Press to check.</summary>

`global`. `show` was written in the global scope, so its link points there. It does not matter that `run` calls it. Only the place where the function was **written** matters. The interview word for this is **lexical scope**.

</details>

> **Remember:** only where a function was written matters, not who calls it.

<details class="more"><summary>📖 More detail: why this is a closure idea</summary>

The link a function carries is made once, at the place it was written. A function you pass to another function still reads the names around its own writing place. This is why a callback works the same wherever it is called from.

</details>

## 6. Mistake 3: the loop callbacks

Lesson 01 promised this picture. With `var` there is one box. With `let` every pass of the loop gets its own box.

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

```mermaid
graph LR
    V1["callback 1"] --> VB["ONE box<br/>i ends as 3"]
    V2["callback 2"] --> VB
    V3["callback 3"] --> VB
```

<details class="guess"><summary>🤔 Guess: what does it print, and what changes with `let`? Press to check.</summary>

With `var`: `3 3 3`. With `let`: `0 1 2`.

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

```mermaid
graph LR
    C1["callback 1"] --> B1["box i = 0"]
    C2["callback 2"] --> B2["box i = 1"]
    C3["callback 3"] --> B3["box i = 2"]
```

With `var` there is one box and three links to it. With `let` there are three boxes. The callbacks run later (see [the event loop](11-the-event-loop.md)), but the boxes are still alive because the callbacks point at them.

</details>

> **Remember:** `var` in a loop is one shared box. `let` gives each pass its own box.

<details class="more"><summary>📖 More detail: the closure behind lesson 01</summary>

Each callback is a closure. It keeps a link to the box of the pass it was made in. That is why `let` fixes the bug: the "box of the pass" is a different box each time.

</details>

## 7. Mistake 4: an old value in React

*This is an idea about your stack, not a fact about your code.*

```jsx
useEffect(() => {
  const id = setInterval(
    () => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []);
```

<details class="guess"><summary>🤔 Guess: the effect runs once (the list is empty). What does the counter show over time? Press to check.</summary>

It stays at **1**. Every render is a new call of your component, so it is a new box with its own `count`. The effect with `[]` runs only once, after render 1. Its timer callback keeps the box of render 1, so it always reads `count = 0` and sets 1 again and again. A function that keeps reading an old box like this is called a **stale closure**.

Fix: ask React for the latest value instead of reading the old one.

```jsx
setCount(c => c + 1)
```

Now it counts 1, 2, 3. (I ran both versions in real React 19.3.0 on 2026-10-12.)

</details>

> **Remember:** a function that keeps reading an old box is a stale closure. Use `setCount(c => c + 1)`.

<details class="more"><summary>📖 More detail: another fix</summary>

Another fix is to put `count` in the dependency list, but then React makes a new timer after every tick. The React docs show this in the challenge "Fix a resetting interval" (see "Watch and play").

</details>

## 8. Mistake 5: a timer that is never cleared

A box stays alive as long as any function links to it. Everything in the box stays too.

```js
function startLogging() {
  const big = new Array(1_000_000).fill(0);
  return setInterval(
    () => console.log(big.length), 1000);
}
const id = startLogging();
```

<details class="guess"><summary>🤔 Guess: `startLogging` is done. Is `big` freed? Press to check.</summary>

No. The timer keeps the callback, the callback keeps the box, the box keeps `big`. I tested this: `big` stayed alive while the timer ran, and was freed after `clearInterval(id)`. Remove event listeners the same way. In React, the `return () => clearInterval(id)` in an effect does exactly this.

</details>

> **Remember:** a timer or a listener is a long-living function. Clear it when you are done.

<details class="more"><summary>📖 More detail: the cost of closures</summary>

- **Memory.** The usual leak is a long-living function that holds a big box. Examples: a listener you never remove, a timer you never clear, a global cache.
- **Hidden data is harder to debug.** The values are not on any object. The Scope pane in Chrome DevTools shows them.
- **Extra functions cost time and memory.** Do not make functions inside functions if you do not need a closure. Each call makes a new function.

</details>

## 9. Watch it run, step by step

The stepper has two panels: the **call stack** and the **scope boxes**. You can watch `makeCounter` leave the stack while S1 stays. It has six programs: "Written, not called", "Two counters", "Private state", "Loop with let", "Stale closure" (a small model of the React idea), and "The memory cost". Write your guess first, then press Next.

**Step through it yourself:** [open the closures stepper](visuals/05-closures.html).

## 10. Why it matters and what it costs

- **Without it,** a local variable dies when its call ends, and a global variable is shared by everyone.
- **With it,** every function carries a link to the box where it was made. The link keeps the box alive. Only functions that carry the link can reach the box, so its data is private.
- **The cost:** memory (a box stays alive as long as any function links to it), stale closures in React, and data that is harder to debug.

Simple rule: use a closure when a function must **remember** something or **hide** something.

## 11. Watch and play

Links checked on 2026-10-12. Each page opened. For each video, the title and channel matched. I did not watch the videos, so their lengths are not checked.

- **Video:** [Closures Explained in 100 Seconds // Tricky JavaScript Interview Prep](https://www.youtube.com/watch?v=vKJpN5FAeF4) by Fireship. A fast recap. Watch it after the stepper.
- **Video:** [Learn Closures In 7 Minutes](https://www.youtube.com/watch?v=3a0I8ICR1Vg) by Web Dev Simplified. A calm walk through the counter example.
- **Play with it:** [The closures stepper](visuals/05-closures.html) in this folder. Guess first, then press Next.
- **Play with it:** [Python Tutor for JavaScript](https://pythontutor.com/javascript.html). Paste the code from card 3 and step through it. Its [guide](https://pythontutor.com/articles/javascript-visualizer.html) says it supports closures. I did not run it myself, so compare how it draws the function with the stepper.
- **Play with it:** [Chrome DevTools, the Scope pane](https://developer.chrome.com/docs/devtools/javascript/reference). The page says the Scope pane shows the local, closure and global scopes while you are paused. To try it: open DevTools, go to Sources, make a new snippet, paste the code from card 3, click the line number of `count = count + 1`, run the snippet, and look in the Scope pane for the closure that holds `count`.
- **Read:** [Variable scope, closure](https://javascript.info/closure) on javascript.info. Many diagrams of the `makeCounter` boxes.
- **Read:** [Closures on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures). Look at "Emulating private methods with closures" and "Creating closures in loops: A common mistake".
- **Read (React idea):** [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot). Its `setTimeout` example shows a handler that keeps the state of the render it was made in.

<details><summary>More links (optional)</summary>

- **Video:** [Closures in JS, Namaste JavaScript Episode 10](https://www.youtube.com/watch?v=qikxEIxsXco) by Akshay Saini. Longer. It uses the interview words "lexical environment" and "scope chain".
- **Read:** the challenge "Fix a resetting interval" on [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies). It shows the `setCount(c => c + 1)` fix.
- **Read (advanced, old):** [Grokking V8 closures for fun (and profit?)](https://mrale.ph/blog/2012/09/23/grokking-v8-closures-for-fun.html). Written in 2012 and updated until 2014. It explains why functions in one call share one box. Treat it as background. The behavior still matched on Node 24 when I tested it.

</details>

## 12. Practice

**A. Predict the output** (write your answer before opening)

```js
function make() {
  let n = 0;
  return { up: () => ++n, read: () => n };
}
const x = make();
const y = make();
x.up(); x.up(); y.up();
console.log(x.read(), y.read());
```

<details><summary>Answer</summary>

`2 1`

`x` and `y` come from two calls of `make`, so they have two boxes. `x.up()` ran twice, so its `n` is 2. `y.up()` ran once, so its `n` is 1. Inside one object, `up` and `read` share one box, so `read` sees what `up` changed.

</details>

**B. Fix the bug**

```js
const names = ["Ana", "Budi", "Citra"];
const handlers = [];
for (var i = 0; i < names.length; i++) {
  handlers.push(() => "Hello " + names[i]);
}
console.log(handlers[0]());   // "Hello undefined". It should be "Hello Ana".
```

<details><summary>Answer</summary>

`var` gives one shared `i`. After the loop it is 3. `names[3]` does not exist, so the answer is `undefined`. Every handler links to the same box.

Fix 1: use `let`, so every pass has its own box.

```js
for (let i = 0; i < names.length; i++) {
  handlers.push(() => "Hello " + names[i]);
}
```

Fix 2: make each function inside another function, so each call makes its own box.

```js
const handlers = names.map(name => () => "Hello " + name);
```

Both give `Hello Ana` for `handlers[0]()` and `Hello Citra` for `handlers[2]()`.

</details>

**C. Write it yourself**

Open `practice/05-closures.js`. There are four tasks:

1. Fix `makeCounter` by moving one line.
2. Write `once(fn)`.
3. Write `createCounter(start)` with a private count and a `reset`.
4. Write down what five snippets print.

Run the tests from the folder that contains `learn/`:

```
node --test learn/javascript/practice/05-closures.test.js
```

At the start, one test already passes: one counter alone works. That is where the bug hides. It only shows when you make two counters.

<details><summary>One possible answer</summary>

```js
function makeCounter() {
  let count = 0;              // moved inside, so every call makes a new box
  return function () {
    count = count + 1;
    return count;
  };
}

function once(fn) {
  let called = false;         // a flag, not "result === undefined"
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
}

function createCounter(start = 0) {
  let count = start;
  return {
    increment() { count = count + 1; return count; },
    decrement() { count = count - 1; return count; },
    reset() { count = start; return count; },
    value() { return count; },
  };
}

const predictions = {
  s1: ["global"],
  s2: ["1", "2", "1"],
  s3: ["2"],
  s4: ["0", "2"],
  s5: ["2", "undefined"],
};
```

Why a flag in `once`: if `fn` returns `undefined`, a check like `result === undefined` would call `fn` again. The test "still calls only once when the function returns undefined" checks this.

</details>

## 13. Interview question

**Q:** "What is a closure? Give an example, say what it is used for, and say what this prints."

```js
function makeCounter() { let c = 0; return () => ++c; }
const a = makeCounter(), b = makeCounter();
console.log(a(), a(), b());
```

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** a function needs to remember something between calls, or later when a callback runs. A local variable dies when the call ends. A global variable is shared, and anyone can change it.
2. **How it works:** a function carries a link to the scope box where it was made. That is the closure.
   - Every call of the outer function makes a new box.
   - The box stays alive while a function points at it, even after the outer call has left the call stack.
   - The code above prints `1 2 1`. `a` and `b` come from two calls, so each has its own `c`.
   - A name is searched in the function's own box first, then along the links. It is searched where the function was **written**, not where it is called. That is lexical scope.
3. **Tradeoff:** a closure keeps everything in its box alive. A long-living function (a timer or a listener you never remove) can leak memory. In React, an effect or handler can read an old render's value. That is a stale closure. Extra functions inside functions cost time and memory.
4. **My example:** *This is an idea, not a fact. Replace it with your own real story from DBO, Unloan, ZWS or Skyworx.* In a React or React Native screen, a `setInterval` inside `useEffect` with an empty dependency list reads the first render's state forever. The fix is `setCount(c => c + 1)`, and clearing the timer in the cleanup.

</details>

<details><summary>The classics, written with closures (I ran all of these)</summary>

Interviewers often ask for these four. Each one is a function that gives back a function, and the inner function uses a variable of the outer one.

```js
// 1. once: run fn one time, then always return the first result
function once(fn) {
  let called = false, result;
  return function (...args) {
    if (!called) { called = true; result = fn(...args); }
    return result;
  };
}
// 2. memoize: remember results for one argument
function memoize(fn) {
  const cache = new Map();
  return function (x) {
    if (!cache.has(x)) cache.set(x, fn(x));
    return cache.get(x);
  };
}
// 3. add(1)(2)(3): each call returns a function that remembers the earlier arguments
const add = a => b => c => a + b + c;
// 3b. any number of calls: an empty call ends the chain
function sum(a) { return b => (b === undefined ? a : sum(a + b)); }
// 4. a function that returns functions
const multiplyBy = n => x => x * n;
```

Results from my run on Node 24.15.0:

- `once(() => { calls++; return "ready"; })` called three times gives `ready ready ready`, and `calls` is `1`.
- `memoize(n => n * n)` with `square(4)`, `square(4)`, `square(5)` gives `16 16 25`, and the slow function ran `2` times.
- `add(1)(2)(3)` is `6`. `sum(1)(2)(3)()` is `6`.
- `multiplyBy(2)(5)` is `10`. `multiplyBy(3)(5)` is `15`.

For each one, say out loud: which variable lives in the box, and which function holds the link to it.

</details>

## 14. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain closures out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the words "scope box" and "link". Then save the transcript file into `my-learning/recordings/`, or write your best version below. Run `/explain-check closures` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 15. Review questions (day 1, 3, 7, 21)

1. What is a closure, in one sentence? After `makeCounter` has finished, why is `count` still there?
2. Why do two counters made by `makeCounter` not share `count`?
3. How can a closure cause a memory leak, and what is a stale closure?
4. Draw the picture from card 3 from memory: two functions, two boxes, and the links.

<details><summary>Answers</summary>

1. A closure is a function plus a link to the scope box where it was made. `count` is still there because the returned function points at the box that holds it, and JavaScript keeps a box alive while anything points at it.
2. Every call of `makeCounter` makes a **new** scope box with its own `count`. Each returned function links to the box of its own call.
3. A function keeps its whole box alive. If the function lives a long time (a timer never cleared, a listener never removed), the big data in its box lives just as long. A stale closure is a function that keeps reading an old box. For example, a timer made in render 1 keeps reading the `count` of render 1.
4. The global scope holds `a` and `b`. `a` has a link to box 1, with `count`. `b` has a link to box 2, with its own `count`. Both boxes have an outer link to the global scope. The call stack holds only the script.

</details>

## 16. Go deeper (optional)

Open these when you are ready. None of them is needed for the cards above.

<details><summary>What V8 does with the boxes</summary>

In V8 (the engine in Chrome and Node), the functions made in one call **share one box**. So if one of them uses `big`, a second function that does **not** use `big` still keeps it alive. If no function uses `big`, V8 drops it.

I checked this on Node 24.15.0 on 2026-10-12, with `WeakRef` and a forced clean-up. It is an engine detail, so it can change. What to remember: small boxes are cheap, but a big box can hide inside a closure.

</details>

## Connected lessons

- [Variables, scope and hoisting](01-variables-scope-and-hoisting.md): the loop bug with `var` and the fix with `let` are closures. Picture 2f shows why.
- [The event loop](11-the-event-loop.md): a timer keeps its callback, and so keeps the callback's box alive until the callback has run (or the timer is cleared).
- [Functions](04-functions.md): functions are values, so they can be returned. That is what makes closures possible.
- [this, call, apply and bind](06-this-call-apply-and-bind.md): the next lesson. Arrow functions take `this` from the box where they were made, the same way they take any other name.
- Memory and garbage collection (lesson 17, not written yet): how JavaScript decides that a box can be freed.
- Debounce and throttle (lesson 18, not written yet): both are closures that keep a timer in their box.
