// Lesson 05: Closures. Do the four tasks below, then run:
//   node --test learn/javascript/practice/05-closures.test.js

// 1. FIX THE BUG.
//    Two counters made with makeCounter() share ONE count, so the second counter does not
//    start at 1. Fix it by moving ONE line. Then say out loud which scope box each
//    returned function points at, and why that fixes it.
let count = 0;
function makeCounter() {
  return function () {
    count = count + 1;
    return count;
  };
}

// 2. WRITE IT: once(fn)
//    Return a new function. The first time it is called, it calls fn with the same
//    arguments and remembers the result. Every later call does NOT call fn again, and
//    returns the remembered result.
//    Hint: what do you need to remember between calls? Where will you keep it, so that
//    it is not global and not shared with other once() functions?
function once(fn) {
  // TODO
}

// 3. WRITE IT: createCounter(start)
//    Return an object with four functions: increment(), decrement(), reset(), value().
//    increment and decrement change the count by 1 and return the new count.
//    reset sets the count back to start. value returns the count now.
//    The count must be private: the object holds only functions, no number.
//    If start is not given, use 0.
function createCounter(start = 0) {
  // TODO
}

// 4. Write down what each snippet prints, as an array of strings, in order.
//    Do not run the snippets before you guess. Draw the scope boxes on paper first.
//    The test runs the real snippets and compares them with your answers.
const snippets = {
  s1: `const x = "global"; function show() { console.log(x); } function run() { const x = "run"; show(); } run();`,
  s2: `function mk() { let n = 0; return () => ++n; } const a = mk(); const b = mk(); console.log(a()); console.log(a()); console.log(b());`,
  s3: `function f() { let x = 1; const read = () => x; x = 2; return read; } console.log(f()());`,
  s4: `const fs = []; for (let i = 0; i < 3; i++) { fs.push(() => i); } console.log(fs[0]()); console.log(fs[2]());`,
  s5: `function make() { let n = 0; return { up: () => ++n, read: () => n }; } const o = make(); o.up(); o.up(); console.log(o.read()); console.log(typeof o.n);`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
};

module.exports = { makeCounter, once, createCounter, snippets, predictions };
