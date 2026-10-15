const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { totalQty, typeName, isMissing, snippets, predictions } = require("./02-values-types-and-coercion");

// 1. totalQty
test("totalQty: adds two text values as numbers", () => {
  assert.strictEqual(totalQty("2", "1"), 3);
});

test("totalQty: works when one side is already a number", () => {
  assert.strictEqual(totalQty(2, "1"), 3);
  assert.strictEqual(totalQty("10", 5), 15);
});

test("totalQty: still works with two numbers", () => {
  assert.strictEqual(totalQty(2, 1), 3);
});

// 2. typeName
test("typeName: null gives null, not object", () => {
  assert.strictEqual(typeName(null), "null");
});

test("typeName: an array gives array, not object", () => {
  assert.strictEqual(typeName([1, 2]), "array");
  assert.strictEqual(typeName([]), "array");
});

test("typeName: everything else works like typeof", () => {
  assert.strictEqual(typeName(5), "number");
  assert.strictEqual(typeName("hi"), "string");
  assert.strictEqual(typeName(true), "boolean");
  assert.strictEqual(typeName(undefined), "undefined");
  assert.strictEqual(typeName({ a: 1 }), "object");
  assert.strictEqual(typeName(() => {}), "function");
  assert.strictEqual(typeName(10n), "bigint");
});

// 3. isMissing
test("isMissing: true for null and undefined", () => {
  assert.strictEqual(isMissing(null), true);
  assert.strictEqual(isMissing(undefined), true);
});

test("isMissing: false for values that only count as false", () => {
  assert.strictEqual(isMissing(0), false, "0 is a real number, for example a price of 0");
  assert.strictEqual(isMissing(""), false, "an empty string is a real value");
  assert.strictEqual(isMissing(false), false);
  assert.strictEqual(isMissing(NaN), false);
});

test("isMissing: false for normal values", () => {
  assert.strictEqual(isMissing("hello"), false);
  assert.strictEqual(isMissing([]), false);
});

// 4. predictions. Run a snippet in a fresh, empty world and collect what it prints.
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
