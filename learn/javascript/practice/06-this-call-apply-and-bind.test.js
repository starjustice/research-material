const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const {
  callLater,
  makeCounter,
  incrementLater,
  myBind,
  snippets,
  predictions,
} = require("./06-this-call-apply-and-bind");

// ---- Task 1: fix the bug ----

test("callLater is unchanged: it is a plain call, so a strict function sees undefined", () => {
  const seen = callLater(function () {
    "use strict";
    return this;
  });
  assert.strictEqual(seen, undefined);
});

test("incrementLater: the method keeps its counter", () => {
  const c = makeCounter();
  assert.strictEqual(incrementLater(c), 1);
  assert.strictEqual(incrementLater(c), 2);
  assert.strictEqual(c.count, 2);
});

test("incrementLater: two counters stay separate", () => {
  const a = makeCounter();
  const b = makeCounter();
  incrementLater(a);
  incrementLater(a);
  incrementLater(b);
  assert.strictEqual(a.count, 2);
  assert.strictEqual(b.count, 1);
});

// ---- Task 2: write your own bind ----

// Run a function while Function.prototype.bind is blocked, to check that it is not used.
function withoutBind(run) {
  const realBind = Function.prototype.bind;
  Function.prototype.bind = function () {
    throw new Error("Do not use bind. Use call or apply.");
  };
  try {
    return run();
  } finally {
    Function.prototype.bind = realBind;
  }
}

function greet(greeting, punctuation) {
  return greeting + " " + this.name + punctuation;
}

test("myBind: this is locked to thisArg", () => {
  withoutBind(() => {
    const hiAna = myBind(greet, { name: "Ana" });
    assert.strictEqual(typeof hiAna, "function");
    assert.strictEqual(hiAna("Hello", "!"), "Hello Ana!");
  });
});

test("myBind: a later call cannot change this (you can bind only once)", () => {
  withoutBind(() => {
    const hiAna = myBind(greet, { name: "Ana" });
    assert.strictEqual(hiAna.call({ name: "Budi" }, "Hey", "?"), "Hey Ana?");
  });
});

test("myBind: preset arguments come first", () => {
  withoutBind(() => {
    function add3(a, b, c) {
      return a + b + c;
    }
    assert.strictEqual(myBind(add3, null, 1, 2)(3), 6);
    assert.strictEqual(myBind(add3, null, 1)(2, 3), 6);
  });
});

test("myBind: it is a NEW function, and the original is untouched", () => {
  withoutBind(() => {
    const hiAna = myBind(greet, { name: "Ana" });
    assert.strictEqual(typeof hiAna, "function");
    assert.notStrictEqual(hiAna, greet);
    assert.strictEqual(greet.call({ name: "Budi" }, "Yo", "."), "Yo Budi.");
  });
});

test("myBind: fixes a pulled out method", () => {
  withoutBind(() => {
    const counter = makeCounter();
    const inc = myBind(counter.increment, counter);
    assert.strictEqual(callLater(inc), 1);
    assert.strictEqual(callLater(inc), 2);
    assert.strictEqual(counter.count, 2);
  });
});

// ---- Task 3: predict the output ----

// Run a snippet in a fresh, empty world and collect what it prints.
function runSnippet(code) {
  const printed = [];
  const sandbox = { console: { log: (x) => printed.push(String(x)) } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return printed;
}

for (const name of Object.keys(snippets)) {
  test(`prediction ${name}: ${snippets[name]}`, () => {
    const real = runSnippet(snippets[name]);
    assert.ok(predictions[name].length > 0, "write your prediction first");
    assert.deepStrictEqual(
      predictions[name],
      real,
      `You wrote ${JSON.stringify(predictions[name])}. The real output is ${JSON.stringify(real)}.`
    );
  });
}
