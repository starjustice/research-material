// Lesson 08: Classes. Do the four tasks below, then run:
//   node --test learn/javascript/practice/08-classes.test.js

// 1. FIX THE BUG. There are TWO bugs in Dog. Fix both.
//    new Dog("Rex", 3).describe() should return "Rex is an animal and knows 3 tricks".
//    Today new Dog("Rex", 3) throws an error. When you fix that one, a second error shows up.
//    Say out loud why each one happens.
//    Do not change Animal. It is not the bug.
class Animal {
  constructor(name) {
    this.name = name;
  }
  describe() {
    return this.name + " is an animal";
  }
}

class Dog extends Animal {
  constructor(name, tricks) {
    this.tricks = tricks;
    super(name);
  }
  describe() {
    return this.describe() + " and knows " + this.tricks + " tricks";
  }
}

// 2. WRITE IT YOURSELF. A Wallet with a private balance.
//    - new Wallet() starts at 0. new Wallet(20) starts at 20.
//    - deposit(n) adds n and returns the new balance.
//    - withdraw(n) takes n away and returns the new balance.
//      If n is more than the balance, throw an Error and leave the balance as it was.
//    - wallet.balance (a getter, so no brackets) gives the balance.
//      A getter is a method that runs when you READ a property: get balance() { ... }
//    - Keep the balance in a private # field. Outside code must NOT see it:
//      Object.keys(wallet) is [], and JSON.stringify(wallet) is "{}".
//    - Write deposit and withdraw as normal methods, so they live ONCE on Wallet.prototype.
class Wallet {
  // TODO
}

// 3. WRITE IT YOURSELF. A child class of Wallet.
//    new LimitedWallet(limit, start) is a Wallet that refuses to take out more than limit in one go.
//    - Use extends and super. The start balance goes to the parent class.
//    - Keep the limit on the object, as this.limit.
//    - withdraw(n): if n is more than this.limit, throw an Error.
//      Otherwise let the PARENT's withdraw do the work. (Hint: super.withdraw)
//    - You cannot read the parent's # field from this class. Why not?
//      Use the balance getter if you need the balance.
class LimitedWallet {
  // TODO: this line needs extends, and the body is empty
}

// 4. PREDICT. Write down what each snippet prints, as an array of strings, in order.
//    If one console.log prints two values, write them as one string with a space: "true false".
//    If a snippet catches an error, it prints the error NAME, for example "TypeError".
//    Do not run the snippets before you guess. The test runs the real snippets and compares.
const snippets = {
  s1: `class A { hi() { return "hi"; } } const a = new A(); console.log(typeof A); console.log(Object.keys(a).length); console.log(a.hi === new A().hi);`,
  s2: `class A {} try { A(); } catch (e) { console.log(e.name); }`,
  s3: `class P { constructor() { this.x = 1; } } class C extends P { constructor() { super(); this.y = 2; } } const c = new C(); console.log(Object.keys(c).join()); console.log(c instanceof P);`,
  s4: `class T { n = 5; get() { return this.n; } } const t = new T(); const g = t.get; try { console.log(g()); } catch (e) { console.log(e.name); } const h = () => t.get(); console.log(h());`,
  s5: `class S { #pin = 1234; check(p) { return p === this.#pin; } } const s = new S(); console.log(s.check(1234)); console.log(s["#pin"]); console.log(JSON.stringify(s));`,
  s6: `class A { who() { return "A"; } } class B extends A { who() { return "B" + super.who(); } } console.log(new B().who()); console.log(new A().who());`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { Animal, Dog, Wallet, LimitedWallet, snippets, predictions };
