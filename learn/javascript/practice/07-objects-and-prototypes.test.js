const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { Dog, Cart, myCreate, findOwner, snippets, predictions } = require("./07-objects-and-prototypes");

// ---- Task 1: Dog ----
test("Dog: rex and fido share ONE speak function", () => {
  const rex = new Dog("Rex");
  const fido = new Dog("Fido");
  assert.strictEqual(rex.speak, fido.speak, "speak should be one shared function, not a copy per dog");
});

test("Dog: speak is not an own property of a dog, it lives on Dog.prototype", () => {
  const rex = new Dog("Rex");
  assert.strictEqual(Object.hasOwn(rex, "speak"), false);
  assert.strictEqual(Object.hasOwn(Dog.prototype, "speak"), true);
});

test("Dog: speak still says the name of the dog it is called on", () => {
  assert.strictEqual(new Dog("Rex").speak(), "Rex says woof");
  assert.strictEqual(new Dog("Fido").speak(), "Fido says woof");
  assert.strictEqual(Object.hasOwn(new Dog("Rex"), "name"), true);
});

// ---- Task 2: Cart ----
test("Cart: adding to one cart does not change another cart", () => {
  const a = new Cart();
  const b = new Cart();
  a.add("apple");
  assert.deepStrictEqual(a.items, ["apple"]);
  assert.deepStrictEqual(b.items, [], "b.items should still be empty. Do the two carts share one array?");
});

test("Cart: add stays shared on the prototype and can be chained", () => {
  const a = new Cart();
  const b = new Cart();
  assert.strictEqual(a.add, b.add);
  assert.strictEqual(a.add("x"), a);
  assert.strictEqual(Object.hasOwn(a, "add"), false);
});

// ---- Task 3: myCreate ----
// While myCreate runs, Object.create is switched off, so you cannot cheat.
function withoutObjectCreate(fn) {
  const real = Object.create;
  Object.create = () => { throw new Error("Do not call Object.create. Write the link yourself."); };
  try { return fn(); } finally { Object.create = real; }
}

test("myCreate: the new object links to proto", () => {
  const proto = { hello: "hi" };
  const obj = withoutObjectCreate(() => myCreate(proto));
  assert.strictEqual(Object.getPrototypeOf(obj), proto);
  assert.strictEqual(obj.hello, "hi");
  assert.strictEqual(Object.hasOwn(obj, "hello"), false);
});

test("myCreate: writing to the new object does not change proto", () => {
  const proto = { n: 1 };
  const obj = withoutObjectCreate(() => myCreate(proto));
  obj.n = 99;
  assert.strictEqual(proto.n, 1);
  assert.strictEqual(obj.n, 99);
});

test("myCreate(null) makes an object with no prototype at all", () => {
  const obj = withoutObjectCreate(() => myCreate(null));
  assert.strictEqual(Object.getPrototypeOf(obj), null);
  assert.strictEqual("toString" in obj, false);
});

// ---- Task 4: findOwner ----
test("findOwner: finds the object that owns the key, at every level", () => {
  const a = { x: 1 };
  const b = Object.create(a);
  b.y = 2;
  const c = Object.create(b);
  c.z = 3;
  assert.strictEqual(findOwner(c, "z"), c);
  assert.strictEqual(findOwner(c, "y"), b);
  assert.strictEqual(findOwner(c, "x"), a);
});

test("findOwner: returns null when nobody owns the key", () => {
  const c = Object.create({ x: 1 });
  assert.strictEqual(findOwner(c, "nope"), null);
});

test("findOwner: the built-in end of the chain is Object.prototype", () => {
  assert.strictEqual(findOwner({}, "toString"), Object.prototype);
  assert.strictEqual(findOwner([], "map"), Array.prototype);
});

test("findOwner: a property whose value is undefined still counts as owned", () => {
  const owner = { gone: undefined };
  const child = Object.create(owner);
  assert.strictEqual(findOwner(child, "gone"), owner);
});

test("findOwner: shadowing, the closest owner wins", () => {
  const a = { name: "far" };
  const b = Object.create(a);
  b.name = "near";
  assert.strictEqual(findOwner(b, "name"), b);
});

test("findOwner: works for an object with no prototype", () => {
  const bare = Object.create(null);
  bare.k = 1;
  assert.strictEqual(findOwner(bare, "k"), bare);
  assert.strictEqual(findOwner(bare, "toString"), null);
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
