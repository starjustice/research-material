const test = require("node:test");
const assert = require("node:assert");
const { downtimeMinutes, burnRate, daysToEmpty, budgetLeft, shouldPage } = require("./26-slos-and-error-budgets");

const near = (actual, expected, tolerance = 0.001) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, "expected about " + expected + " but got " + actual);

test("99.9 percent over 30 days allows about 43.2 minutes", () => {
  near(downtimeMinutes(0.999), 43.2);
});

test("the table of nines for 30 days", () => {
  near(downtimeMinutes(0.99), 432);
  near(downtimeMinutes(0.9999), 4.32);
  near(downtimeMinutes(0.99999), 0.432);
});

test("a different number of days changes the answer", () => {
  near(downtimeMinutes(0.999, 365), 525.6);
  near(downtimeMinutes(0.999, 1), 1.44);
});

test("an error rate equal to the budget has a burn rate of 1", () => {
  near(burnRate(0.001, 0.999), 1);
  near(burnRate(0.01, 0.99), 1);
});

test("a higher error rate burns faster", () => {
  near(burnRate(0.0144, 0.999), 14.4);
  near(burnRate(0.05, 0.999), 50);
  near(burnRate(1, 0.999), 1000);
});

test("no errors means a burn rate of 0", () => {
  assert.strictEqual(burnRate(0, 0.999), 0);
});

test("at burn rate 1 the budget lasts the whole 30 days", () => {
  near(daysToEmpty(0.001, 0.999), 30);
});

test("at burn rate 14.4 the budget lasts about 2 days", () => {
  near(daysToEmpty(0.0144, 0.999), 2.0833);
  near(daysToEmpty(0.0144, 0.999) * 24, 50);
});

test("daysToEmpty can use a different period, and no errors never empty the budget", () => {
  near(daysToEmpty(0.001, 0.999, 7), 7);
  assert.strictEqual(daysToEmpty(0, 0.999), Infinity);
});

test("budgetLeft is 1 when nothing failed", () => {
  near(budgetLeft(0.999, 1000000, 0), 1);
});

test("budgetLeft falls as requests fail", () => {
  near(budgetLeft(0.999, 1000000, 500), 0.5);
  near(budgetLeft(0.999, 43200000, 900), 1 - 900 / 43200, 0.0001);
});

test("budgetLeft is 0 when the budget is gone and negative when overspent", () => {
  near(budgetLeft(0.999, 1000000, 1000), 0);
  near(budgetLeft(0.999, 1000000, 1500), -0.5);
});

test("budgetLeft with no traffic is 1", () => {
  assert.strictEqual(budgetLeft(0.999, 0, 0), 1);
});

test("shouldPage needs both windows to burn fast", () => {
  assert.strictEqual(shouldPage({ slo: 0.999, longRate: 0.02, shortRate: 0.05 }), true);
});

test("a short spike alone does not page", () => {
  // the last 5 minutes are bad, but the last hour is nearly fine: the budget loss is small
  assert.strictEqual(shouldPage({ slo: 0.999, longRate: 0.002, shortRate: 0.05 }), false);
});

test("an old problem that already stopped does not page", () => {
  // the last hour was bad, but the last 5 minutes are fine: it is fixed
  assert.strictEqual(shouldPage({ slo: 0.999, longRate: 0.03, shortRate: 0 }), false);
});

test("the threshold can be changed", () => {
  assert.strictEqual(shouldPage({ slo: 0.999, longRate: 0.007, shortRate: 0.007, threshold: 6 }), true);
  assert.strictEqual(shouldPage({ slo: 0.999, longRate: 0.007, shortRate: 0.007 }), false);
});

test("a bad deploy pages at minute 18 and the page clears at minute 26", () => {
  const rate = (t) => (t >= 1 && t <= 22 ? 0.05 : 0);                  // 5 percent errors from minute 1 to 22
  const average = (t, n) => {
    let sum = 0;
    for (let i = t - n + 1; i <= t; i++) sum += rate(i);
    return sum / n;
  };
  const events = [];
  let paging = false;
  for (let t = 1; t <= 30; t++) {
    const page = shouldPage({ slo: 0.999, longRate: average(t, 60), shortRate: average(t, 5) });
    if (page !== paging) { paging = page; events.push([t, page]); }
  }
  assert.deepStrictEqual(events, [[18, true], [26, false]]);
});
