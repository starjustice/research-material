// Lesson 02: Values, types and coercion. Do the four tasks below, then run:
//   node --test learn/javascript/practice/02-values-types-and-coercion.test.js

// 1. A shop form gives you the quantity as text, for example "2".
//    totalQty("2", "1") should return the NUMBER 3, but it returns the text "21".
//    Fix it. Then say out loud why + joined the two values.
function totalQty(a, b) {
  return a + b;
}

// 2. typeof has two surprises: typeof null is "object", and typeof [] is "object".
//    Write typeName(value). It works like typeof, with two changes:
//      typeName(null)      should return "null"
//      typeName([1, 2])    should return "array"
//    Everything else returns what typeof returns, for example typeName(5) is "number".
function typeName(value) {
  // TODO
}

// 3. Write isMissing(value). It returns true ONLY for null and undefined.
//    It must return false for 0, "", false and NaN. They are real values that only count as false.
//    Hint: one check with == can do this. Or use two checks with ===.
function isMissing(value) {
  // TODO
}

// 4. Write down what each snippet prints, as an array of strings, in order.
//    Do not run the snippets before you guess.
//    The test runs the real snippets and compares them with your answers.
const snippets = {
  s1: `console.log(typeof null); console.log(typeof []);`,
  s2: `console.log("5" + 1); console.log("5" - 1);`,
  s3: `console.log(1 == "1"); console.log(1 === "1");`,
  s4: `console.log(null == 0); console.log(null == undefined);`,
  s5: `console.log([] == false); if ([]) console.log("runs");`,
  s6: `console.log(NaN === NaN); console.log("" == "0");`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { totalQty, typeName, isMissing, snippets, predictions };
