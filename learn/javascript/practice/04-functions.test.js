const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { addFee, formatPrice, applyTimes, getOperation, snippets, predictions } = require("./04-functions");

// ---- Task 1: addFee ----

test("addFee: gives back the price plus 10", () => {
  assert.strictEqual(addFee(100), 110, "Does the function give a value back? Look for return.");
  assert.strictEqual(addFee(0), 10);
});

// ---- Task 2: formatPrice ----

test("formatPrice: uses the currency you give", () => {
  assert.strictEqual(formatPrice(20, "AUD"), "AUD 20");
});

test("formatPrice: uses IDR when no currency is given", () => {
  assert.strictEqual(formatPrice(5000), "IDR 5000", "A missing argument is undefined. Give the parameter a default.");
});

test("formatPrice: uses IDR when currency is undefined", () => {
  assert.strictEqual(formatPrice(5000, undefined), "IDR 5000");
});

// ---- Task 3: applyTimes ----

test("applyTimes: calls the function on its own result", () => {
  assert.strictEqual(applyTimes(n => n * 2, 3, 1), 8);
  assert.strictEqual(applyTimes(n => n + 10, 2, 5), 25);
});

test("applyTimes: calls the function exactly `times` times", () => {
  let calls = 0;
  applyTimes(n => { calls++; return n; }, 4, 0);
  assert.strictEqual(calls, 4);
});

test("applyTimes: with times = 0 gives back start and never calls the function", () => {
  let calls = 0;
  assert.strictEqual(applyTimes(n => { calls++; return n * 2; }, 0, 7), 7);
  assert.strictEqual(calls, 0);
});

// ---- Task 4: getOperation ----

test("getOperation: gives back a function, not a number", () => {
  assert.strictEqual(typeof getOperation("double"), "function", "Return the function itself. Do not call it.");
  assert.strictEqual(typeof getOperation("square"), "function");
  assert.strictEqual(typeof getOperation("something else"), "function");
});

test("getOperation: double, square and the unchanged fallback", () => {
  assert.strictEqual(getOperation("double")(4), 8);
  assert.strictEqual(getOperation("square")(4), 16);
  assert.strictEqual(getOperation("nope")(4), 4);
});

test("getOperation: works with applyTimes, because a function is a value", () => {
  assert.strictEqual(applyTimes(getOperation("square"), 2, 3), 81);
});

// ---- Task 5: predictions ----

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
