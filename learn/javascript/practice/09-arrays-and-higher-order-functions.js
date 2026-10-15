// Lesson 09: Arrays and higher order functions. Do the tasks below, then run:
//   node --test learn/javascript/practice/09-arrays-and-higher-order-functions.test.js

// 1. FIX THE BUG. sortNumbers should return the numbers from smallest to largest,
//    and it must NOT change the array it was given.
//    sortNumbers([10, 9, 1]) should give [1, 9, 10]. Right now it gives [1, 10, 9],
//    and the input array changes too. Two things are wrong. Find both.
//    (Do not use toSorted. It needs Node 20. Use the copy trick from the lesson.)
function sortNumbers(nums) {
  return nums.sort();
}

// 2. FIX THE BUG. totalPrice should add up the prices.
//    totalPrice([10, 20]) works, but totalPrice([]) crashes. It should give 0.
//    Change ONE small thing. Then say out loud why that fixes it.
function totalPrice(prices) {
  return prices.reduce((sum, p) => sum + p);
}

// 3. WRITE IT YOURSELF. Write your own map, filter and reduce with a normal for loop.
//    Do NOT call the built in map, filter, reduce or forEach inside them. The test arrays
//    throw an error if you do.
//    - myMap(array, fn): fn gets (item, index, array). Return a NEW array with every result.
//    - myFilter(array, fn): fn gets (item, index, array). Return a NEW array with the items where fn gives a true-like value (truthy).
//    - myReduce(array, fn, start): fn gets (acc, item, index, array). acc is the running total.
//      Return the last acc.
//        With a start value: acc starts as the start value and the first call has index 0.
//        With NO start value: acc starts as array[0] and the first call has index 1.
//        An empty array with no start value must throw a TypeError.
//        Hint: arguments.length tells you if a start value was given.
function myMap(array, fn) {
  // TODO
}

function myFilter(array, fn) {
  // TODO
}

function myReduce(array, fn, start) {
  // TODO
}

// 4. WRITE IT YOURSELF. groupBy(array, keyFn) returns an object. Each key is what keyFn gave
//    for an item, and each value is an array of the items with that key.
//    groupBy(["apple", "banana", "avocado"], w => w[0]) gives { a: ["apple", "avocado"], b: ["banana"] }
//    Build it with reduce and a plain {} as the start value. Do not change the input array.
function groupBy(array, keyFn) {
  // TODO
}

// 5. Write down what each snippet prints, as an array of strings, one string for each console.log,
//    written the way Node prints it. If the snippet throws, it catches the error and prints the NAME,
//    for example "TypeError". Do not run the snippets before you guess.
//    The test runs the real snippets and compares them with your answers.
const snippets = {
  s1: `console.log([10, 9, 1].sort());`,
  s2: `const a = [3, 1, 2]; const b = a.sort(); console.log(a, a === b);`,
  s3: `console.log([1, 2, 3].map(n => { n * 2; }));`,
  s4: `try { [].reduce((a, b) => a + b); } catch (e) { console.log(e.name); }`,
  s5: `let sum = 0; [1, 2, 3].forEach(async n => { sum = await Promise.resolve(sum + n); }); console.log(sum);`,
  s6: `console.log([1, 2, 3, 4].filter(n => n % 2).map(n => n * 10));`,
};

const predictions = {
  s1: [], // TODO
  s2: [], // TODO
  s3: [], // TODO
  s4: [], // TODO
  s5: [], // TODO
  s6: [], // TODO
};

module.exports = { sortNumbers, totalPrice, myMap, myFilter, myReduce, groupBy, snippets, predictions };
