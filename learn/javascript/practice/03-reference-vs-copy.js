// Lesson 03: Reference vs copy. Do the four tasks below, then run:
//   node --test learn/javascript/practice/03-reference-vs-copy.test.js
//
// Remember the rule: = copies what is in the slot. For an object, what is in the slot
// is an arrow. So "copying" an object with = gives you a second arrow to the SAME object.

// 1. FIX THE BUG.
//    addItem should give back a NEW cart with the item added at the end.
//    It must NOT change the cart it was given. (React state works the same way:
//    if you give React the same object back, it thinks nothing changed.)
//    Right now it changes the original cart and returns the same arrow.
//    Draw the arrows on paper first. Which objects must be new?
function addItem(cart, item) {
  cart.items.push(item);
  return cart;
}

// 2. WRITE IT: moveTo(user, city)
//    Give back a NEW user whose address.city is the new city.
//    Do not change the user you were given, and do not change its address.
//    Copy only the objects on the path to the change (user and address).
//    Everything else may be shared. For example user.tags can stay the same array.
//    Example:
//      const ana = { name: "Ana", address: { city: "Jakarta", zip: "10110" }, tags: ["vip"] };
//      const moved = moveTo(ana, "Bandung");
//      moved.address.city   -> "Bandung"
//      ana.address.city     -> "Jakarta"   (not touched)
//      moved.address.zip    -> "10110"     (kept)
function moveTo(user, city) {
  // TODO
}

// 3. WRITE IT: deepCopy(value)
//    Make a full copy where every level is new (a deep copy).
//    Handle simple values, arrays and plain objects. Nothing else is needed.
//    Do NOT use structuredClone or JSON here. The goal is to see how it works.
//    Hint: a simple value can be returned as it is, because it is copied anyway.
//    For an array or an object, make a new one, and deepCopy every item inside it.
//    The function calls itself for the inside parts.
function deepCopy(value) {
  // TODO
}

// 4. Write down what each snippet prints, as an array of strings, in order.
//    Do not run the snippets before you guess. Draw the variables and the arrows first.
//    The test runs the real snippets and compares them with your answers.
const snippets = {
  s1: `let a = 1; let b = a; b = b + 1; console.log(a); console.log(b);`,
  s2: `const x = { n: 1 }; const y = x; y.n = 5; console.log(x.n); console.log(x === y);`,
  s3: `console.log([1, 2] === [1, 2]); const p = [1, 2]; const q = p; console.log(p === q);`,
  s4: `function f(o) { o.n = 2; o = { n: 3 }; } const obj = { n: 1 }; f(obj); console.log(obj.n);`,
  s5: `const a = { list: [1] }; const b = { ...a }; b.list.push(2); console.log(a.list.length); const c = structuredClone(a); c.list.push(3); console.log(a.list.length);`,
  s6: `const d = JSON.parse(JSON.stringify({ when: new Date(0), skip: undefined })); console.log(typeof d.when); console.log("skip" in d);`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { addItem, moveTo, deepCopy, snippets, predictions };
