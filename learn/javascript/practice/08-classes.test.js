const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { Animal, Dog, Wallet, LimitedWallet, snippets, predictions } = require("./08-classes");

// ---- Task 1: Dog ----
test("Dog: new Dog works and describe gives the full sentence", () => {
  assert.strictEqual(new Dog("Rex", 3).describe(), "Rex is an animal and knows 3 tricks");
  assert.strictEqual(new Dog("Fido", 0).describe(), "Fido is an animal and knows 0 tricks");
});

test("Dog: name and tricks are own properties of the dog", () => {
  const rex = new Dog("Rex", 3);
  assert.deepStrictEqual(Object.keys(rex).sort(), ["name", "tricks"]);
});

test("Dog: is still a child class of Animal", () => {
  assert.strictEqual(Object.getPrototypeOf(Dog), Animal);
  assert.strictEqual(Object.getPrototypeOf(Dog.prototype), Animal.prototype);
  assert.ok(new Dog("Rex", 1) instanceof Animal);
});

test("Dog: describe reuses the parent's describe instead of copying its text", () => {
  const real = Animal.prototype.describe;
  Animal.prototype.describe = function () { return "PARENT"; };
  try {
    assert.strictEqual(new Dog("Rex", 1).describe(), "PARENT and knows 1 tricks");
  } finally {
    Animal.prototype.describe = real;
  }
});

// ---- Task 2: Wallet ----
test("Wallet: starts at 0, or at the start amount", () => {
  assert.strictEqual(new Wallet().balance, 0);
  assert.strictEqual(new Wallet(20).balance, 20);
});

test("Wallet: deposit and withdraw return the new balance", () => {
  const w = new Wallet(10);
  assert.strictEqual(w.deposit(5), 15);
  assert.strictEqual(w.withdraw(12), 3);
  assert.strictEqual(w.balance, 3);
});

test("Wallet: taking out too much throws and leaves the balance alone", () => {
  const w = new Wallet(10);
  assert.throws(() => w.withdraw(11), Error);
  assert.strictEqual(w.balance, 10);
});

test("Wallet: two wallets do not share a balance", () => {
  const a = new Wallet();
  const b = new Wallet();
  a.deposit(50);
  assert.strictEqual(a.balance, 50);
  assert.strictEqual(b.balance, 0);
});

test("Wallet: the balance is private, outside code cannot see it", () => {
  const w = new Wallet(40);
  assert.deepStrictEqual(Object.keys(w), [], "Object.keys should list nothing");
  assert.deepStrictEqual(Object.getOwnPropertyNames(w), [], "no own properties at all, not even hidden ones");
  assert.strictEqual(JSON.stringify(w), "{}");
  assert.strictEqual(w["#balance"], undefined);
  assert.match(Wallet.toString(), /#[A-Za-z_$]/, "keep the balance in a private # field");
});

test("Wallet: outside code cannot change the balance by writing to it", () => {
  const w = new Wallet(40);
  try { w.balance = 999; } catch (e) { /* a getter with no setter may throw, that is fine */ }
  assert.strictEqual(w.balance, 40);
});

test("Wallet: deposit, withdraw and the balance getter live once on Wallet.prototype", () => {
  assert.strictEqual(Object.hasOwn(Wallet.prototype, "deposit"), true);
  assert.strictEqual(Object.hasOwn(Wallet.prototype, "withdraw"), true);
  const d = Object.getOwnPropertyDescriptor(Wallet.prototype, "balance");
  assert.ok(d && typeof d.get === "function", "balance should be a getter on Wallet.prototype");
  assert.strictEqual(new Wallet().deposit, new Wallet().deposit);
});

// ---- Task 3: LimitedWallet ----
test("LimitedWallet: extends Wallet, so both hidden links point to Wallet", () => {
  assert.strictEqual(Object.getPrototypeOf(LimitedWallet), Wallet);
  assert.strictEqual(Object.getPrototypeOf(LimitedWallet.prototype), Wallet.prototype);
  assert.ok(new LimitedWallet(50, 100) instanceof Wallet);
});

test("LimitedWallet: the start balance goes to the parent, the limit stays on the object", () => {
  const lw = new LimitedWallet(50, 100);
  assert.strictEqual(lw.balance, 100);
  assert.strictEqual(lw.limit, 50);
  assert.deepStrictEqual(Object.keys(lw), ["limit"]);
});

test("LimitedWallet: withdraw under the limit works, over the limit throws", () => {
  const lw = new LimitedWallet(50, 100);
  assert.strictEqual(lw.withdraw(30), 70);
  assert.throws(() => lw.withdraw(60), Error);
  assert.strictEqual(lw.balance, 70);
});

test("LimitedWallet: the parent's rule still works, you cannot take more than you have", () => {
  const lw = new LimitedWallet(50, 10);
  assert.throws(() => lw.withdraw(20), Error);
  assert.strictEqual(lw.balance, 10);
});

test("LimitedWallet: deposit is not copied, it comes from Wallet.prototype", () => {
  const lw = new LimitedWallet(50, 0);
  assert.strictEqual(Object.hasOwn(LimitedWallet.prototype, "deposit"), false);
  assert.strictEqual(lw.deposit, new Wallet().deposit);
  assert.strictEqual(lw.deposit(5), 5);
});

test("LimitedWallet: withdraw hands the work to the parent with super.withdraw", () => {
  const real = Wallet.prototype.withdraw;
  Wallet.prototype.withdraw = function () { return "PARENT"; };
  try {
    assert.strictEqual(new LimitedWallet(50, 100).withdraw(1), "PARENT");
  } finally {
    Wallet.prototype.withdraw = real;
  }
});

// ---- Task 4: predictions ----
// Run a snippet in a fresh, empty world and collect what it prints.
function runSnippet(code) {
  const printed = [];
  const sandbox = { console: { log: (...args) => printed.push(args.map(String).join(" ")) } };
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
