const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { makeCounter, once, createCounter, snippets, predictions } = require("./05-closures");

// ---- Task 1: makeCounter ----

test("makeCounter: one counter counts 1, 2, 3", () => {
  const a = makeCounter();
  assert.deepStrictEqual([a(), a(), a()], [1, 2, 3]);
});

test("makeCounter: a new counter starts at 1, even after another counter was used", () => {
  const a = makeCounter();
  a(); a(); a();
  const b = makeCounter();
  assert.strictEqual(b(), 1, "b must have its own count. Is count inside makeCounter?");
});

test("makeCounter: two counters do not disturb each other", () => {
  const a = makeCounter();
  const b = makeCounter();
  assert.deepStrictEqual([a(), a(), b(), a(), b()], [1, 2, 1, 3, 2]);
});

// ---- Task 2: once ----

test("once: calls the function only one time", () => {
  let calls = 0;
  const f = once(() => { calls++; });
  f(); f(); f();
  assert.strictEqual(calls, 1);
});

test("once: returns the first result on every later call", () => {
  const f = once(x => x * 2);
  assert.strictEqual(f(5), 10);
  assert.strictEqual(f(100), 10);
});

test("once: passes the arguments to the function on the first call", () => {
  const f = once((a, b) => a + b);
  assert.strictEqual(f(2, 3), 5);
});

test("once: still calls only once when the function returns undefined", () => {
  let calls = 0;
  const f = once(() => { calls++; });   // returns undefined
  f(); f();
  assert.strictEqual(calls, 1, "Do not use 'result === undefined' to decide. Use a separate flag.");
});

test("once: two wrapped functions are independent", () => {
  const log = [];
  const a = once(() => log.push("a"));
  const b = once(() => log.push("b"));
  a(); b(); a(); b();
  assert.deepStrictEqual(log, ["a", "b"]);
});

// ---- Task 3: createCounter ----

test("createCounter: starts at 0 by default, or at the start you give", () => {
  assert.strictEqual(createCounter().value(), 0);
  assert.strictEqual(createCounter(10).value(), 10);
});

test("createCounter: increment and decrement return the new value", () => {
  const c = createCounter(5);
  assert.strictEqual(c.increment(), 6);
  assert.strictEqual(c.increment(), 7);
  assert.strictEqual(c.decrement(), 6);
  assert.strictEqual(c.value(), 6);
});

test("createCounter: reset goes back to the start value", () => {
  const c = createCounter(5);
  c.increment(); c.increment(); c.increment();
  c.reset();
  assert.strictEqual(c.value(), 5);
});

test("createCounter: two counters are independent", () => {
  const a = createCounter();
  const b = createCounter(100);
  a.increment(); a.increment();
  b.decrement();
  assert.strictEqual(a.value(), 2);
  assert.strictEqual(b.value(), 99);
});

test("createCounter: the count is private (only functions are exposed)", () => {
  const c = createCounter(7);
  assert.ok(Object.values(c).length >= 4, "return an object with increment, decrement, reset and value");
  assert.ok(Object.values(c).every(v => typeof v === "function"), "the object must hold only functions");
  assert.strictEqual(c.count, undefined);
  assert.strictEqual(c.start, undefined);
});

// ---- Task 4: predictions ----

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
