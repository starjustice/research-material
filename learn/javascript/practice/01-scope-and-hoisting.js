// Lesson 01: Variables, scope and hoisting. Do the two tasks below, then run:
//   node --test learn/javascript/practice/01-scope-and-hoisting.test.js

// 1. This function should return [0, 1, 2] when n is 3, but it returns [3, 3, 3].
//    Fix it by changing ONE word. Then say out loud why that fixes it.
function collectIndexes(n) {
  const out = [];
  for (var i = 0; i < n; i++) {
    setTimeout(() => out.push(i), 0);
  }
  return new Promise(resolve => setTimeout(() => resolve(out), 10));
}

// 2. Write down what each snippet prints, as an array of strings, in order.
//    If the snippet throws an error, the snippet catches it and prints the error NAME,
//    for example "ReferenceError". Do not run the snippets before you guess.
//    The test runs the real snippets and compares them with your answers.
const snippets = {
  s1: `console.log(typeof a); var a = 1; console.log(typeof a);`,
  s2: `try { console.log(c); } catch (e) { console.log(e.name); } let c = 1;`,
  s3: `foo(); function foo() { console.log("foo"); }`,
  s4: `try { bar(); } catch (e) { console.log(e.name); } var bar = function () {};`,
  s5: `{ var p = 1; } console.log(p);`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
};

module.exports = { collectIndexes, snippets, predictions };
