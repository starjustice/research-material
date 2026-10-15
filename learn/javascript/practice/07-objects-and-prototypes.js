// Lesson 07: Objects and prototypes. Do the five tasks below, then run:
//   node --test learn/javascript/practice/07-objects-and-prototypes.test.js

// 1. FIX THE BUG. Every dog gets its own COPY of speak, so 1000 dogs make 1000 functions.
//    Make speak live ONCE, on Dog.prototype. Each dog keeps only its own name.
//    Then say out loud: when rex.speak() runs, where does JavaScript find speak?
function Dog(name) {
  this.name = name;
  this.speak = function () {
    return this.name + " says woof";
  };
}

// 2. FIX THE BUG. Two carts share ONE items array, so adding to one cart changes the other.
//    Hint: an array written on a prototype exists once. Where must each cart get its own array?
function Cart() {}
Cart.prototype.items = [];
Cart.prototype.add = function (item) {
  this.items.push(item);
  return this;
};

// 3. WRITE IT YOURSELF. Write your own Object.create. Do NOT call Object.create.
//    myCreate(proto) returns a new empty object whose hidden link points to proto.
//    (Interview word for the hidden link: [[Prototype]].)
//    It must also work for myCreate(null).
//    Hint A: new F() links the new object to F.prototype.
//    Hint B: an object literal can set the link: { __proto__: proto }.
//    Which hint works for null? Why?
function myCreate(proto) {
  // TODO
}

// 4. WRITE IT YOURSELF. findOwner(obj, key) walks up the hidden links (the prototype chain), starting at obj itself.
//    It returns the OBJECT that has key stored on itself (an own property), or null if none does.
//    Do not use the in operator, and do not check if the value is true-like. A property whose value is undefined still counts.
function findOwner(obj, key) {
  // TODO
}

// 5. PREDICT. Write down what each snippet prints, as an array of strings, in order.
//    If the snippet throws and catches an error, it prints the error NAME, for example "TypeError".
//    Do not run the snippets before you guess. The test runs the real snippets and compares.
const snippets = {
  s1: `const a = { x: 1 }; const b = Object.create(a); b.x = 2; console.log(a.x); console.log(b.x);`,
  s2: `const a = { x: 1 }; const b = Object.create(a); console.log(b.x); console.log(Object.hasOwn(b, "x")); console.log("x" in b);`,
  s3: `function Dog() {} Dog.prototype.legs = 4; const d = new Dog(); d.legs = 3; console.log(d.legs); delete d.legs; console.log(d.legs);`,
  s4: `const o = Object.create(null); console.log(typeof o.toString); try { o.hasOwnProperty("a"); } catch (e) { console.log(e.name); }`,
  s5: `const arr = []; console.log(arr.hasOwnProperty("map")); console.log(typeof arr.map);`,
  s6: `function Dog() {} const d = new Dog(); console.log(typeof d.prototype); console.log(typeof Dog.prototype); console.log(Object.getPrototypeOf(d) === Dog.prototype);`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { Dog, Cart, myCreate, findOwner, snippets, predictions };
