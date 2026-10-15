"use strict";
// Lesson 06: this, call, apply and bind. Do the three tasks below, then run:
//   node --test learn/javascript/practice/06-this-call-apply-and-bind.test.js
// This file uses strict mode (a safer setting). So a lost this is undefined, and you get a loud TypeError.

// 1. FIX THE BUG. Change ONE line.
//    callLater calls the function it receives as a plain call, like setTimeout or forEach do.
//    incrementLater should return 1 the first time and 2 the second time.
//    Today it throws a TypeError. Say out loud why, then fix it.
//    Do not change callLater. It is not the bug.
function callLater(callback) {
  return callback();
}

function makeCounter() {
  return {
    count: 0,
    increment() {
      this.count++;
      return this.count;
    },
  };
}

function incrementLater(counter) {
  return callLater(counter.increment); // BUG: the method loses its object here
}

// 2. WRITE IT YOURSELF. Write your own bind.
//    myBind(fn, thisArg, ...presetArgs) returns a NEW function.
//    When the new function is called, it calls fn with this set to thisArg,
//    with presetArgs first and then the arguments of the new call.
//    It must also pass back whatever fn returns.
//    Do not use fn.bind. Use call or apply. (The test checks that bind is not used.)
function myBind(fn, thisArg, ...presetArgs) {
  // TODO
}

// 3. PREDICT. Write down what each snippet prints, as an array of strings, in order.
//    If a snippet catches an error, it prints the error NAME, for example "TypeError".
//    Do not run the snippets before you guess.
//    The test runs the real snippets and compares them with your answers.
//    Hint for every snippet: find the call site first, then find the rule.
const snippets = {
  s1: `"use strict"; const o = { n: 1, get() { return this && this.n; } }; const g = o.get; console.log(o.get()); console.log(g());`,
  s2: `function who() { return this.name; } const a = { name: "A", who }; const b = { name: "B", who }; console.log(a.who()); console.log(b.who()); console.log(who.call(b));`,
  s3: `function who() { return this.name; } const bound = who.bind({ name: "A" }); console.log(bound()); console.log(bound.call({ name: "B" }));`,
  s4: `"use strict"; const o = { name: "A", later() { return [1].map(() => this.name)[0]; } }; console.log(o.later()); const p = o.later; try { p(); } catch (e) { console.log(e.name); }`,
  s5: `"use strict"; function P(n) { this.n = n; } const p = new P(7); console.log(p.n); try { P(8); } catch (e) { console.log(e.name); }`,
  s6: `function a() { return typeof this; } function b() { "use strict"; return typeof this; } console.log(a()); console.log(b());`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { callLater, makeCounter, incrementLater, myBind, snippets, predictions };
