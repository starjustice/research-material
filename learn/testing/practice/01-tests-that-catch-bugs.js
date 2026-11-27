// Lessons 01 and 02: Testing. Do the two tasks below, then run:
//   node --test learn/testing/practice/01-tests-that-catch-bugs.test.js
//
// This file has no framework to install. The test file checks your answers with the built-in node:test.

// 1. CLASSIFY. For each scenario, write "unit", "integration" or "e2e".
//    unit         one small piece alone: no network, no database, no browser
//    integration  a few real pieces working together (a route with a data layer, a component with its children)
//    e2e          a real browser walking through a real user flow
const scenarios = [
  "discount(200, 25) returns 150",
  "POST /api/items with Supertest hits the Express app and checks the status 201",
  "Playwright opens Chrome, signs up, and checks that the dashboard heading is shown",
  "isValidEmail('a@b.com') returns true",
  "An Express route and a real test database: after POST, the row is in the table",
  "A real Chrome clicks Checkout, pays with a test card, and sees 'Thank you'",
];
// Put one answer per scenario, in the same order.
const answers = [
  // TODO: "unit" | "integration" | "e2e"
];

// 2. WRITE TEST CASES THAT CATCH BUGS.
//    The function under test is discount(price, percent). It should:
//      - return the price after taking percent off, rounded to cents (2 decimals)
//      - allow percent 0 and percent 100
//      - throw an Error when percent is below 0 or above 100
//    Your job is to write the test cases. The test file runs your cases against the right function
//    and against five broken copies. A good set of cases passes on the right one and FAILS on every broken one.
//    Fill in `cases` (price, percent, expected) and `badPercents` (numbers that must throw).
//    Hint: think about the edges (0 and 100), money that needs rounding, and the wrong direction.
const cases = [
  // TODO: { price: 200, percent: 25, expected: 150 }, ...
];
const badPercents = [
  // TODO: numbers that must make discount throw
];

module.exports = { scenarios, answers, cases, badPercents };
