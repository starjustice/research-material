# JavaScript

How the language really works: values, scope, functions, objects, and how JavaScript runs code that waits (async code).

**Why it matters in interviews:** Almost every frontend and Node interview starts here. Questions like "what is a closure", "what does this print" and "explain the event loop" test whether you understand how JavaScript runs your code, not whether you can use a framework.

## The map

How the lessons connect. Learn left to right.

```mermaid
graph LR
    A["Variables and types"] --> B["Functions"]
    B --> C["Closures"]
    B --> D["this"]
    D --> E["Prototypes and classes"]
    C --> F["Event loop"]
    F --> G["Promises"]
    G --> H["Async and await"]
```

## Lessons, one concept per file

Each lesson is one small file made from [the lesson template](../../templates/lesson-template.md): picture first, a code trace, practice, links to watch and play, and an explain it back section.

Status: `planned` (not written yet), `ready` (written, not studied), `learning`, `can explain` (passed explain-check).

### Basics

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 01 | [Variables, scope and hoisting](01-variables-scope-and-hoisting.md) | var, let, const, block scope, hoisting and the temporal dead zone | ready |
| 02 | [Values, types and coercion](02-values-types-and-coercion.md) | simple values against objects, typeof, == against ===, and which values count as true or false (truthy and falsy) | ready |
| 03 | [Reference vs copy](03-reference-vs-copy.md) | why changing a copied object changes the original, and copying one level against copying everything (shallow and deep copy) | ready |
| 04 | [Functions](04-functions.md) | the three ways to write a function, parameters, return, and passing functions around like values | ready |

### Core ideas

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 05 | [Closures](05-closures.md) | how a function remembers variables after its outer function finished | ready |
| 06 | [this, call, apply and bind](06-this-call-apply-and-bind.md) | what decides the value of this, and how arrow functions differ | ready |
| 07 | [Objects and prototypes](07-objects-and-prototypes.md) | how an object finds a property it does not have, by following hidden links (the prototype chain) | ready |
| 08 | [Classes](08-classes.md) | what a class really builds in memory, extends, super, and private # fields | ready |
| 09 | [Arrays and higher order functions](09-arrays-and-higher-order-functions.md) | map, filter, reduce, find, and when to use each | ready |
| 10 | [Destructuring, spread and rest](10-destructuring-spread-and-rest.md) | unpacking values and copying with ... | ready |

### Async

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 11 | [The event loop](11-the-event-loop.md) | call stack, Web APIs, task queue, microtask queue, and the order they run | ready |
| 12 | Callbacks `12-callbacks.md` | the first way to write async code, and why deep nesting (callback hell) made it hard | planned |
| 13 | Promises `13-promises.md` | states, then and catch chains, Promise.all, allSettled, race, any | planned |
| 14 | Async and await `14-async-and-await.md` | what await really pauses, error handling with try and catch, running in parallel | planned |

### Senior level

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 15 | Error handling `15-error-handling.md` | throw, try catch finally, custom errors, errors in async code | planned |
| 16 | Modules `16-modules.md` | import and export against require, and how unused code is dropped from the bundle (tree shaking) | planned |
| 17 | Memory and garbage collection `17-memory-and-garbage-collection.md` | how memory is freed, and common leaks in apps | planned |
| 18 | Debounce and throttle `18-debounce-and-throttle.md` | limiting how often a function runs, written from scratch | planned |

**To make the next lesson:** in a chat with this folder open, say `/learn javascript 01` to learn it live with Claude, or ask "make lesson javascript 01" and the `research-material` agent writes the file. When a lesson file exists, its row becomes a link and the status changes to `ready`.

## Guides already here

Longer guides that cover many concepts at once. Good for revision after the lessons.

- [JavaScript cheat sheet](javascript-cheatsheet.html) - all 11 lessons on one page: the rule for each lesson, 7 pictures to draw, 20 predict quizzes, interview answers to say, and the interview words in plain English
- [React and JS frontend guide (part 1 covers the event loop, closures and this)](../react/react-js-frontend-interview-guide.md)
- [How JavaScript runs (interactive)](https://claude.ai/artifact/YRvQjoaSrvTYpU9CzFYrJu) - your interactive page on one thread and the event loop, with live demos

## Watch and play

Trusted places to see the ideas, not only read them. Each lesson adds its own checked video and visualizer links.

- [javascript.info](https://javascript.info/) - the clearest free tutorial, one topic per page
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) - the reference for exact behavior
- [Python Tutor for JavaScript](https://pythontutor.com/javascript.html) - paste code and watch variables and memory change step by step
- [Loupe](http://latentflip.com/loupe/) - watch the call stack, Web APIs and queue move while code runs
- [What the heck is the event loop anyway? (Philip Roberts, JSConf EU)](https://www.youtube.com/watch?v=8aGhZQkoFbQ) - the classic visual talk on the event loop
- [roadmap.sh JavaScript](https://roadmap.sh/javascript) - a visual map of everything in the language
