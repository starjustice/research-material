const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const util = require("node:util");
const {
  sortNumbers, totalPrice, myMap, myFilter, myReduce, groupBy, snippets, predictions,
} = require("./09-arrays-and-higher-order-functions");

// ---- 1. sortNumbers ----
test("sortNumbers: sorts numbers by value, not as text", () => {
  assert.deepStrictEqual(sortNumbers([10, 9, 1]), [1, 9, 10]);
  assert.deepStrictEqual(sortNumbers([100, 25, 3, 7]), [3, 7, 25, 100]);
});

test("sortNumbers: does not change the input array", () => {
  const input = [10, 9, 1];
  sortNumbers(input);
  assert.deepStrictEqual(input, [10, 9, 1], "the input array was changed. sort() works in place.");
});

// ---- 2. totalPrice ----
test("totalPrice: adds the prices", () => {
  assert.strictEqual(totalPrice([10, 20, 30, 40]), 100);
});

test("totalPrice: an empty list gives 0, not an error", () => {
  assert.strictEqual(totalPrice([]), 0);
});

// ---- 3. your own map, filter and reduce ----
// These arrays throw if you call the built in methods, so you must write the loop yourself.
function guarded(values) {
  const a = values.slice();
  for (const name of ["map", "filter", "reduce", "reduceRight", "forEach", "flatMap"]) {
    a[name] = () => { throw new Error("Do not call the built in " + name + " inside your own version. Use a for loop."); };
  }
  return a;
}

test("myMap: same length, new values, original untouched", () => {
  const input = guarded([1, 2, 3]);
  const out = myMap(input, (n) => n * 10);
  assert.deepStrictEqual(out, [10, 20, 30]);
  assert.notStrictEqual(out, input);
  assert.deepStrictEqual(input.slice(), [1, 2, 3]);
});

test("myMap: calls fn with the item, the index and the array", () => {
  const input = guarded(["a", "b"]);
  const seen = [];
  myMap(input, (item, index, array) => { seen.push([item, index, array === input]); });
  assert.deepStrictEqual(seen, [["a", 0, true], ["b", 1, true]]);
});

test("myMap: a function with no return gives undefined slots", () => {
  assert.deepStrictEqual(myMap(guarded([1, 2]), (n) => { n * 2; }), [undefined, undefined]);
});

test("myFilter: keeps the items where fn is truthy, same values", () => {
  const input = guarded([10, 20, 30, 40]);
  const out = myFilter(input, (p) => p > 25);
  assert.deepStrictEqual(out, [30, 40]);
  assert.notStrictEqual(out, input);
  assert.deepStrictEqual(input.slice(), [10, 20, 30, 40]);
});

test("myFilter: calls fn with the item, the index and the array", () => {
  const input = guarded(["a", "b"]);
  const seen = [];
  myFilter(input, (item, index, array) => { seen.push([item, index, array === input]); return true; });
  assert.deepStrictEqual(seen, [["a", 0, true], ["b", 1, true]]);
});

test("myFilter: truthy and falsy values count, not only true and false", () => {
  assert.deepStrictEqual(myFilter(guarded([1, 2, 3, 4]), (n) => n % 2), [1, 3]);
});

test("myReduce: with a start value", () => {
  assert.strictEqual(myReduce(guarded([10, 20, 30, 40]), (sum, p) => sum + p, 0), 100);
  assert.strictEqual(myReduce(guarded([1, 2, 3]), (acc, n) => acc + String(n), ""), "123");
});

test("myReduce: calls fn with acc, item, index and array", () => {
  const input = guarded([10, 20]);
  const seen = [];
  myReduce(input, (acc, item, index, array) => { seen.push([acc, item, index, array === input]); return acc + item; }, 0);
  assert.deepStrictEqual(seen, [[0, 10, 0, true], [10, 20, 1, true]]);
});

test("myReduce: with no start value, the first item is the accumulator and the first call has index 1", () => {
  const seen = [];
  const total = myReduce(guarded([10, 20, 30]), (acc, item, index) => { seen.push([acc, item, index]); return acc + item; });
  assert.strictEqual(total, 60);
  assert.deepStrictEqual(seen, [[10, 20, 1], [30, 30, 2]]);
});

test("myReduce: an empty array with a start value gives the start value and never calls fn", () => {
  let calls = 0;
  assert.strictEqual(myReduce(guarded([]), () => { calls++; }, 0), 0);
  assert.strictEqual(calls, 0);
});

test("myReduce: an empty array with no start value throws a TypeError", () => {
  assert.throws(() => myReduce(guarded([]), (a, b) => a + b), TypeError);
});

test("myReduce: the accumulator can be an object", () => {
  const out = myReduce(guarded(["a", "b", "a"]), (acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {});
  assert.deepStrictEqual(out, { a: 2, b: 1 });
});

// ---- 4. groupBy with reduce ----
test("groupBy: groups words by first letter", () => {
  assert.deepStrictEqual(
    groupBy(["apple", "banana", "avocado", "blueberry"], (w) => w[0]),
    { a: ["apple", "avocado"], b: ["banana", "blueberry"] }
  );
});

test("groupBy: groups numbers by a label", () => {
  assert.deepStrictEqual(
    groupBy([1, 2, 3, 4, 5], (n) => (n % 2 === 0 ? "even" : "odd")),
    { odd: [1, 3, 5], even: [2, 4] }
  );
});

test("groupBy: an empty array gives an empty object, and the input is not changed", () => {
  assert.deepStrictEqual(groupBy([], (x) => x), {});
  const input = ["x", "y"];
  groupBy(input, (s) => s);
  assert.deepStrictEqual(input, ["x", "y"]);
});

// ---- 5. predictions ----
// Run a snippet in a fresh, empty world and collect what it prints, formatted the way Node prints it.
function runSnippet(code) {
  const printed = [];
  const show = (x) => (typeof x === "string" ? x : util.inspect(x, { breakLength: Infinity }));
  const sandbox = { console: { log: (...xs) => printed.push(xs.map(show).join(" ")) } };
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
