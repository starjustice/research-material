const test = require("node:test");
const assert = require("node:assert");
const { scenarios, answers, cases, badPercents } = require("./01-tests-that-catch-bugs");

// ---- Task 1 ----
const right = ["unit", "integration", "e2e", "unit", "integration", "e2e"];

test("classify: one answer for every scenario", () => {
  assert.strictEqual(answers.length, scenarios.length, "write one answer per scenario, in order");
});

right.forEach((expected, i) => {
  test(`classify ${i + 1}: ${scenarios[i].slice(0, 50)}...`, () => {
    assert.strictEqual(answers[i], expected);
  });
});

// ---- Task 2: the right function and five broken copies ----
function discount(price, percent) {
  if (percent < 0 || percent > 100) throw new Error("percent must be 0 to 100");
  return Math.round(price * (100 - percent)) / 100;
}
const mutants = {
  "rejects 100 (off by one at the top)": (p, c) => {
    if (c < 0 || c >= 100) throw new Error("bad");
    return Math.round(p * (100 - c)) / 100;
  },
  "rejects 0 (off by one at the bottom)": (p, c) => {
    if (c <= 0 || c > 100) throw new Error("bad");
    return Math.round(p * (100 - c)) / 100;
  },
  "does not reject a negative percent": (p, c) => {
    if (c > 100) throw new Error("bad");
    return Math.round(p * (100 - c)) / 100;
  },
  "adds the percent instead of taking it off": (p, c) => {
    if (c < 0 || c > 100) throw new Error("bad");
    return Math.round(p * (100 + c)) / 100;
  },
  "forgets to round to cents": (p, c) => {
    if (c < 0 || c > 100) throw new Error("bad");
    return (p * (100 - c)) / 100;
  },
};

function passes(fn) {
  for (const { price, percent, expected } of cases) {
    let got;
    try { got = fn(price, percent); } catch (e) { return false; }
    if (got !== expected) return false;
  }
  for (const percent of badPercents) {
    let threw = false;
    try { fn(100, percent); } catch (e) { threw = true; }
    if (!threw) return false;
  }
  return true;
}

test("cases: you wrote at least 4 cases and 2 bad percents", () => {
  assert.ok(cases.length >= 4, "write at least 4 cases");
  assert.ok(badPercents.length >= 2, "write at least 2 bad percents (one below 0, one above 100)");
});

test("cases: they all pass on the right function (a test must not lie)", () => {
  assert.ok(cases.length > 0, "no cases yet");
  assert.ok(passes(discount), "one of your cases or bad percents is wrong for the real function");
});

for (const [name, fn] of Object.entries(mutants)) {
  test(`cases catch the bug: ${name}`, () => {
    assert.ok(cases.length > 0, "no cases yet");
    assert.strictEqual(passes(fn), false, "your cases did not notice this bug: add a case that fails here");
  });
}
