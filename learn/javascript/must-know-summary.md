# JavaScript: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews

This page is a short map of the 11 JavaScript lessons. JavaScript fundamentals are asked in almost every frontend, full stack and Node interview, so every lesson here is worth knowing. The stars only tell you what to learn first.

**How to read the stars.** This is my judgement of how often each topic is asked.

- ★★★ Asked in almost every interview, often as "what does this code print?". Learn these first.
- ★★ Often asked. Learn these second.

## ★★★ Learn these first

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [11 The event loop](11-the-event-loop.md) | JavaScript does one thing at a time. Sync code runs first, then all microtasks (promises), then one task (a timer). After each task the loop checks microtasks again. | A timer of 0 ms means "at least 0 ms", not "now". A long loop blocks everything, including clicks. |
| [05 Closures](05-closures.md) | A function carries a link to the box where it was made. The box stays alive as long as something points at it. Two counters made by the same function do not share `count`. | The link is to the box, not a copy of the value. `var` in a loop shares one box, `let` gives each pass its own. In React this is a stale closure. |
| [01 Variables, scope, hoisting](01-variables-scope-and-hoisting.md) | Before line 1 runs, JavaScript makes a slot for every name (hoisting). A `var` slot starts as `undefined`. A `let` or `const` slot is locked until its line, and reading it early throws a `ReferenceError`. | Your code does not move. `const` locks the name, not the inside of an object. |
| [06 this, call, apply, bind](06-this-call-apply-and-bind.md) | `this` is decided by how the function is called, not where it is written. Arrow functions take `this` from where they were made. | Copy a method out and the dot stays behind, so `this` is lost. Call has commas, apply has an array, bind is for before. |
| [03 Reference vs copy](03-reference-vs-copy.md) | `=` copies what is in the slot. For an object, that is an arrow. Spread is a shallow copy. Use `structuredClone` for a deep copy. | Two objects with the same content are still not `===`. In React, never change state in place. |
| [09 Arrays and higher order functions](09-arrays-and-higher-order-functions.md) | `map` and `filter` return a new array. `reduce` folds into one value, so always give it a start value. Be ready to write them yourself. | `sort` and `reverse` change the original array. `sort()` with no function sorts as text, so `[10, 9, 1]` becomes `[1, 10, 9]`. `forEach` does not wait for async callbacks. |

## ★★ Learn these second

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [02 Values, types, coercion](02-values-types-and-coercion.md) | Use `===` everywhere. Change types yourself with `Number()` or `String()`. 8 values are falsy: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. | `typeof null` is `"object"`. `[] == false` is true, but `[]` is also truthy. |
| [04 Functions](04-functions.md) | A function is a value (first-class). Declarations work before their line. Arrow functions and expressions do not. | Pass `fn`, not `fn()`. An arrow with braces needs `return`. |
| [07 Objects and prototypes](07-objects-and-prototypes.md) | Reading a property walks up the prototype chain. Writing always changes the object you wrote on. Put data on each object and functions on the prototype. | A typo like `user.nmae` gives `undefined`, not an error. Use `Object.hasOwn`. |
| [08 Classes](08-classes.md) | A class is a function. Its methods sit on one shared prototype. `extends` links prototypes. Call `super()` before `this`. `#field` is really private. | `_balance` is only a polite sign. Class methods lose `this` too when passed around. |
| [10 Destructuring, spread, rest](10-destructuring-spread-and-rest.md) | Same three dots, two directions: left side collects (rest), right side expands (spread). Later keys win. | A spread copy is shallow. A default fills in only for `undefined`, and `??` also covers `null`. |

## The 6 questions most likely to come up

1. "What does this code print?" with `setTimeout` and promises. (11)
2. "What is a closure? Give an example and a use." (05)
3. "`var`, `let`, `const`, and hoisting." (01)
4. "How does `this` work? What do call, apply and bind do?" (06)
5. "Shallow vs deep copy. Why did my React state not update?" (03)
6. "Write `map`, `filter` or `reduce` yourself." (09)

## The pattern behind every answer

Answer in four parts: the problem it solves, how it works (a simple picture), the tradeoff, and an example from your own work. This is the method from [study method and weekly plan](../../my-learning/study-method-and-weekly-plan.md).

## Practice

- Each lesson has a quiz in `learn/javascript/quiz/` and runnable exercises in `learn/javascript/practice/`. The first quiz with all question types is lesson 11.
- The [JavaScript cheat sheet](javascript-cheatsheet.html) is a good last read before an interview.

## Honest notes

- This page only compresses the lessons' "Remember" lines. If it disagrees with a lesson, the lesson is right.
- Promises and async/await are covered through the event loop (lesson 11). There is no separate promises lesson yet.
