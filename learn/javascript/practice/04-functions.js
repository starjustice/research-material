// Lesson 04: Functions. Do the five tasks below, then run:
//   node --test learn/javascript/practice/04-functions.test.js

// 1. FIX THE BUG.
//    addFee should give back the price plus a fee of 10. So addFee(100) should be 110.
//    Right now it gives back undefined. Fix it. There are two ways: add one word,
//    or remove the curly braces. Then say out loud why it gave undefined.
const addFee = (price) => {
  price + 10;
};

// 2. WRITE IT: formatPrice(amount, currency)
//    Give back a string: the currency, a space, then the amount.
//    formatPrice(20, "AUD") gives "AUD 20".
//    If no currency is given, use "IDR". So formatPrice(5000) gives "IDR 5000".
//    Hint: use a default parameter, not an if.
function formatPrice(amount, currency) {
  // TODO
}

// 3. WRITE IT: applyTimes(fn, times, start)
//    fn is a function you are given. Call fn on start. Then call fn on that result.
//    Do this `times` times in total, and give back the last result.
//    applyTimes(n => n * 2, 3, 1) gives 8, because 1 -> 2 -> 4 -> 8.
//    If times is 0, give back start without calling fn at all.
function applyTimes(fn, times, start) {
  // TODO
}

// 4. WRITE IT: getOperation(name)
//    Give back a FUNCTION. Do not call it.
//    getOperation("double") gives a function that doubles a number.
//    getOperation("square") gives a function that squares a number.
//    Any other name gives a function that gives back the number unchanged.
//    So getOperation("double")(4) is 8.
function getOperation(name) {
  // TODO
}

// 5. Write down what each snippet prints, as an array of strings, in order.
//    Do not run the snippets before you guess. Draw the call stack on paper first.
//    The test runs the real snippets and compares them with your answers.
//    If a snippet throws an error, it stops there. It does not happen in these six.
const snippets = {
  s1: `console.log(typeof a); console.log(typeof b); function a() {} var b = function () {};`,
  s2: `function f(x, y) { console.log(x); console.log(y); } f(1);`,
  s3: `function f(x = 5) { return x; } console.log(f()); console.log(f(0));`,
  s4: `function f() { 1 + 1; } const g = () => 1 + 1; console.log(f()); console.log(g());`,
  s5: `function hi() { return "hi"; } const h = hi; console.log(h()); console.log(typeof h); console.log(h === hi);`,
  s6: `function a() { console.log("a starts"); b(); console.log("a ends"); } function b() { console.log("b runs"); } a();`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { addFee, formatPrice, applyTimes, getOperation, snippets, predictions };
