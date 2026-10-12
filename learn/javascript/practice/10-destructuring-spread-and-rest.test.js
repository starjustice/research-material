const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const {
  moveUser,
  getPort,
  addTodo,
  toggleTodo,
  makeUrl,
  mergeSettings,
  splitHead,
  snippets,
  predictions,
} = require("./10-destructuring-spread-and-rest");

// Freeze an object and everything inside it. In strict mode, any attempt to
// change it throws a TypeError, so a mutation cannot hide.
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

// ---- 1. moveUser ----
test("moveUser: returns the new city", () => {
  const ana = { name: "Ana", address: { city: "Jakarta" } };
  const moved = moveUser(ana, "Bandung");
  assert.strictEqual(moved.address.city, "Bandung");
  assert.strictEqual(moved.name, "Ana");
});

test("moveUser: the original user is NOT changed", () => {
  const ana = { name: "Ana", address: { city: "Jakarta" } };
  moveUser(ana, "Bandung");
  assert.strictEqual(
    ana.address.city,
    "Jakarta",
    "The original changed. A spread copy shares the inner address object. Copy the address too."
  );
});

test("moveUser: keeps the other fields of address", () => {
  const ana = { name: "Ana", address: { city: "Jakarta", zip: "10110" } };
  assert.deepStrictEqual(moveUser(ana, "Bandung").address, { city: "Bandung", zip: "10110" });
});

// ---- 2. getPort ----
test("getPort: missing port gives 3000", () => {
  assert.strictEqual(getPort({}), 3000);
  assert.strictEqual(getPort(), 3000);
});

test("getPort: a given port is kept, and 0 is kept too", () => {
  assert.strictEqual(getPort({ port: 8080 }), 8080);
  assert.strictEqual(getPort({ port: 0 }), 0);
});

test("getPort: null port gives 3000", () => {
  assert.strictEqual(getPort({ port: null }), 3000, "A default in destructuring does not apply to null.");
});

// ---- 3. addTodo and toggleTodo ----
function makeState() {
  return deepFreeze({
    filter: "all",
    todos: [
      { id: 1, text: "read", done: false },
      { id: 2, text: "write", done: true },
    ],
  });
}

test("addTodo: adds at the end and does not change the input", () => {
  const state = makeState();
  const next = addTodo(state, { id: 3, text: "rest", done: false });
  assert.strictEqual(next.todos.length, 3);
  assert.deepStrictEqual(next.todos[2], { id: 3, text: "rest", done: false });
  assert.strictEqual(state.todos.length, 2);
  assert.notStrictEqual(next, state);
  assert.notStrictEqual(next.todos, state.todos);
  assert.strictEqual(next.filter, "all");
});

test("toggleTodo: flips done for that id only", () => {
  const state = makeState();
  const next = toggleTodo(state, 1);
  assert.strictEqual(next.todos[0].done, true);
  assert.strictEqual(next.todos[1].done, true);
  assert.strictEqual(state.todos[0].done, false);
  assert.notStrictEqual(next.todos[0], state.todos[0]);
});

test("toggleTodo: untouched todos are the SAME objects, not copies", () => {
  const state = makeState();
  const next = toggleTodo(state, 1);
  assert.strictEqual(next.todos[1], state.todos[1]);
  assert.strictEqual(next.filter, "all");
});

// ---- 4. makeUrl ----
test("makeUrl: works with no argument", () => {
  assert.strictEqual(makeUrl(), "http://localhost:3000/");
});

test("makeUrl: uses the options you give", () => {
  assert.strictEqual(makeUrl({ host: "a.com", secure: true, port: 443 }), "https://a.com:443/");
  assert.strictEqual(makeUrl({ path: "/docs" }), "http://localhost:3000/docs");
});

// ---- 5. mergeSettings ----
test("mergeSettings: later overrides win", () => {
  assert.deepStrictEqual(mergeSettings({ a: 1, b: 2 }, { b: 3 }, { c: 4 }), { a: 1, b: 3, c: 4 });
  assert.deepStrictEqual(mergeSettings({ a: 1 }, { a: 2 }, { a: 3 }), { a: 3 });
});

test("mergeSettings: no overrides gives a copy, and inputs are not changed", () => {
  const defaults = deepFreeze({ a: 1 });
  const out = mergeSettings(defaults);
  assert.deepStrictEqual(out, { a: 1 });
  assert.notStrictEqual(out, defaults);
});

test("mergeSettings: uses a rest parameter (defaults, ...overrides)", () => {
  assert.strictEqual(
    mergeSettings.length,
    1,
    "Write it as (defaults, ...overrides). A rest parameter does not count in .length."
  );
});

// ---- 6. splitHead ----
test("splitHead: first item and the others", () => {
  assert.deepStrictEqual(splitHead([1, 2, 3]), { head: 1, tail: [2, 3] });
  assert.deepStrictEqual(splitHead([9]), { head: 9, tail: [] });
});

test("splitHead: an empty list gives undefined and an empty tail", () => {
  assert.deepStrictEqual(splitHead([]), { head: undefined, tail: [] });
});

test("splitHead: a string works too, because strings are iterable", () => {
  assert.deepStrictEqual(splitHead("abc"), { head: "a", tail: ["b", "c"] });
});

test("splitHead: uses destructuring with rest, no [0] and no slice", () => {
  const source = splitHead.toString();
  assert.ok(/\.\.\./.test(source), "Use a rest element: const [head, ...tail] = list");
  assert.ok(!/\[0\]|slice/.test(source), "Do not use list[0] or slice.");
});

// ---- 7. predictions ----
// Run a snippet in a fresh, empty world and collect what it prints.
// Each console.log call becomes ONE string. Values in one call are joined with one space.
// Objects and arrays are written as JSON text, for example {"a":1} and [1,2].
function runSnippet(code) {
  const printed = [];
  const show = (x) => (typeof x === "object" && x !== null ? JSON.stringify(x) : String(x));
  const sandbox = { console: { log: (...args) => printed.push(args.map(show).join(" ")) } };
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
