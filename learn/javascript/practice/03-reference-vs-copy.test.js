const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { addItem, moveTo, deepCopy, snippets, predictions } = require("./03-reference-vs-copy");

// ---- Task 1: addItem ----

test("addItem: the result has the new item at the end", () => {
  const cart = { owner: "Ana", items: ["tea"] };
  const next = addItem(cart, "milk");
  assert.deepStrictEqual(next, { owner: "Ana", items: ["tea", "milk"] });
});

test("addItem: the original cart is not changed", () => {
  const cart = { owner: "Ana", items: ["tea"] };
  addItem(cart, "milk");
  assert.deepStrictEqual(cart.items, ["tea"], "the old items array was changed in place. Did you use push on it?");
});

test("addItem: gives back a new cart object, not the same arrow", () => {
  const cart = { owner: "Ana", items: ["tea"] };
  const next = addItem(cart, "milk");
  assert.notStrictEqual(next, cart, "next === cart, so React would think nothing changed");
});

test("addItem: the items array is new too", () => {
  const cart = { owner: "Ana", items: ["tea"] };
  const next = addItem(cart, "milk");
  assert.notStrictEqual(next.items, cart.items, "next.items === cart.items, so both carts share one array");
});

// ---- Task 2: moveTo ----

function makeAna() {
  return { name: "Ana", address: { city: "Jakarta", zip: "10110" }, tags: ["vip"] };
}

test("moveTo: the new user has the new city and keeps the other fields", () => {
  const moved = moveTo(makeAna(), "Bandung");
  assert.deepStrictEqual(moved, { name: "Ana", address: { city: "Bandung", zip: "10110" }, tags: ["vip"] });
});

test("moveTo: the original user and its address are not changed", () => {
  const ana = makeAna();
  const oldAddress = ana.address;
  moveTo(ana, "Bandung");
  assert.strictEqual(ana.address, oldAddress, "ana.address now points somewhere else. Do not assign to the original.");
  assert.strictEqual(ana.address.city, "Jakarta", "the original city changed. The address object is shared. Copy it too.");
});

test("moveTo: the user and the address are new objects", () => {
  const ana = makeAna();
  const moved = moveTo(ana, "Bandung");
  assert.notStrictEqual(moved, ana);
  assert.notStrictEqual(moved.address, ana.address);
});

test("moveTo: parts that did not change can stay shared (only the path is copied)", () => {
  const ana = makeAna();
  const moved = moveTo(ana, "Bandung");
  assert.strictEqual(moved.tags, ana.tags, "tags did not change, so there is no need to copy it. A one level copy keeps the same arrow.");
});

// ---- Task 3: deepCopy ----

test("deepCopy: simple values come back the same", () => {
  assert.strictEqual(deepCopy(5), 5);
  assert.strictEqual(deepCopy("hi"), "hi");
  assert.strictEqual(deepCopy(null), null);
  assert.strictEqual(deepCopy(true), true);
});

test("deepCopy: a changed nested value does not reach the original", () => {
  const orig = { name: "Ana", address: { city: "Jakarta" } };
  const copy = deepCopy(orig);
  copy.address.city = "Bandung";
  assert.strictEqual(orig.address.city, "Jakarta");
});

test("deepCopy: every level is a new object, and the content is equal", () => {
  const orig = { a: { b: { c: [1, { d: 2 }] } } };
  const copy = deepCopy(orig);
  assert.deepStrictEqual(copy, orig);
  assert.notStrictEqual(copy, orig);
  assert.notStrictEqual(copy.a, orig.a);
  assert.notStrictEqual(copy.a.b, orig.a.b);
  assert.notStrictEqual(copy.a.b.c, orig.a.b.c);
  assert.notStrictEqual(copy.a.b.c[1], orig.a.b.c[1]);
});

test("deepCopy: arrays stay arrays", () => {
  const copy = deepCopy([1, [2, 3]]);
  assert.ok(Array.isArray(copy), "the copy of an array must be an array");
  assert.ok(Array.isArray(copy[1]), "the copy of an inner array must be an array");
  assert.deepStrictEqual(copy, [1, [2, 3]]);
});

test("deepCopy: written by hand, without structuredClone or JSON", () => {
  const src = deepCopy.toString();
  assert.ok(!src.includes("structuredClone") && !src.includes("JSON"), "write the copy yourself for this task");
});

// ---- Task 4: predictions ----

// Run a snippet in a fresh, empty world and collect what it prints.
function runSnippet(code) {
  const printed = [];
  const sandbox = {
    console: { log: (...xs) => printed.push(xs.map(String).join(" ")) },
    structuredClone,
  };
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
