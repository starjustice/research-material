"use strict";
// Lesson 10: Destructuring, spread and rest. Do the tasks below, then run:
//   node --test learn/javascript/practice/10-destructuring-spread-and-rest.test.js
//
// Tip: do one task at a time. The test file has a group of tests for each task.

// 1. FIX THE BUG. moveUser should return a NEW user with the new city and leave the
//    original user untouched. Today it changes the original, because a spread copy
//    shares the inner address object. Fix it with spread. No libraries.
function moveUser(user, city) {
  const copy = { ...user };
  copy.address.city = city;
  return copy;
}

// 2. FIX THE BUG. getPort should return config.port, or 3000 when the port is missing
//    OR null. A port of 0 is a real value and must be kept.
//    Today the default does not apply to null. Say out loud why, then fix it.
function getPort({ port = 3000 } = {}) {
  return port;
}

// 3. WRITE IT. Update without changing the input, the way React state is updated.
//    (Interview word: immutable updates.)
//    state looks like: { filter: "all", todos: [{ id: 1, text: "read", done: false }] }
//    addTodo(state, todo)  returns a new state with the todo added at the END of todos.
//    toggleTodo(state, id) returns a new state where the todo with that id has done flipped.
//    Todos you did not touch must be the SAME objects as before, not copies.
function addTodo(state, todo) {
  // TODO
}
function toggleTodo(state, id) {
  // TODO
}

// 4. WRITE IT. An options object with defaults, in the parameter itself.
//    makeUrl({ host, port, secure, path }) returns a string.
//    Defaults: host "localhost", port 3000, secure false, path "/".
//    makeUrl({ host: "a.com", secure: true, port: 443 }) gives "https://a.com:443/"
//    makeUrl() with no argument must work too, and gives "http://localhost:3000/"
function makeUrl() {
  // TODO
}

// 5. WRITE IT. Rest and spread together.
//    mergeSettings(defaults, ...overrides) returns a NEW object. Start with defaults,
//    then apply each override in order, so a later one wins.
//    Do not change defaults or any override. Use a rest parameter, not "arguments".
//    mergeSettings({ a: 1, b: 2 }, { b: 3 }, { c: 4 }) gives { a: 1, b: 3, c: 4 }
function mergeSettings() {
  // TODO
}

// 6. WRITE IT. Array destructuring with rest, in ONE line.
//    splitHead(list) returns { head, tail }. head is the first item, tail is an array
//    of the other items.
//    splitHead([1, 2, 3]) gives { head: 1, tail: [2, 3] }
//    splitHead([]) gives { head: undefined, tail: [] }
//    Do not use list[0] and do not use slice.
function splitHead(list) {
  // TODO
}

// 7. PREDICT. Write down what each snippet prints, as an array of strings, in order.
//    Rules for the strings:
//      - each console.log call is ONE string
//      - several values in one call are joined with one space
//      - objects and arrays are written as JSON text with no spaces, like {"a":1} and [1,2]
//      - if the snippet catches an error, it prints the error NAME, like "TypeError"
//    Do not run the snippets before you guess. The test runs the real snippets.
const snippets = {
  s1: `const { a = 1, b = 2, c = 3 } = { a: undefined, b: null }; console.log(a, b, c);`,
  s2: `const [x, , y = 9, ...z] = [1, 2, undefined, 4, 5]; console.log(x, y, z);`,
  s3: `const o = { k: 1, ...{ k: 2, m: 3 }, m: 4 }; console.log(o);`,
  s4: `try { const { n } = null; } catch (e) { console.log(e.name); } try { [...{ a: 1 }]; } catch (e) { console.log(e.name); } console.log({ ...null, ...[7] });`,
  s5: `const a = { deep: { v: 1 } }; const b = { ...a }; b.deep.v = 2; console.log(a.deep.v, a.deep === b.deep);`,
  s6: `function f(first, ...others) { console.log(first, others); } f(1, 2, 3); f();`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { moveUser, getPort, addTodo, toggleTodo, makeUrl, mergeSettings, splitHead, snippets, predictions };
