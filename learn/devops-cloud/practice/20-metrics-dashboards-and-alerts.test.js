const test = require("node:test");
const assert = require("node:assert");
const { cumulativeBuckets, increase, rate, histogramQuantile, evaluateAlert, burnRate, shouldPage } = require("./20-metrics-dashboards-and-alerts");

const same = (value) => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
const s = (...pairs) => pairs.map(([t, v]) => ({ t, v }));

// ---------- cumulativeBuckets ----------

test("cumulativeBuckets: every bucket counts the values that are less than or equal to its bound", () => {
  const result = cumulativeBuckets([0.05, 0.2, 0.2, 0.6, 2.5], [0.1, 0.3, 1]);
  assert.deepStrictEqual(result, [
    { le: 0.1, count: 1 },
    { le: 0.3, count: 3 },
    { le: 1, count: 4 },
    { le: Infinity, count: 5 },
  ]);
});

test("cumulativeBuckets: a value exactly on a bound is counted in that bucket", () => {
  const result = cumulativeBuckets([0.1, 0.3], [0.1, 0.3]);
  assert.deepStrictEqual(result.map((b) => b.count), [1, 2, 2]);
});

test("cumulativeBuckets: counts never go down from one bucket to the next", () => {
  const result = cumulativeBuckets([5, 0.01, 0.4, 0.4, 9, 0.2], [0.05, 0.25, 0.5, 1]);
  const counts = result.map((b) => b.count);
  assert.deepStrictEqual(counts, [1, 2, 4, 4, 6]);
});

test("cumulativeBuckets: no values gives zero in every bucket, and the last bound is Infinity", () => {
  const result = cumulativeBuckets([], [1, 2]);
  assert.deepStrictEqual(result, [{ le: 1, count: 0 }, { le: 2, count: 0 }, { le: Infinity, count: 0 }]);
});

test("cumulativeBuckets: values above the top bound only reach the Infinity bucket", () => {
  const result = cumulativeBuckets([50, 60], [1, 5]);
  assert.deepStrictEqual(result.map((b) => b.count), [0, 0, 2]);
});

test("cumulativeBuckets: does not change what it was given", () => {
  const values = [0.9, 0.2];
  const bounds = [0.5, 1];
  cumulativeBuckets(values, bounds);
  assert.deepStrictEqual(values, [0.9, 0.2]);
  assert.deepStrictEqual(bounds, [0.5, 1]);
});

// ---------- increase and rate ----------

test("increase: a counter that only goes up grows by last minus first", () => {
  assert.strictEqual(increase(s([0, 100], [60, 160], [120, 220])), 120);
});

test("increase: a drop is a reset, so the new value counts as growth from 0", () => {
  assert.strictEqual(increase(s([0, 100], [60, 160], [120, 220], [180, 15], [240, 75])), 195);
});

test("increase: a reset to exactly 0 adds nothing for that step", () => {
  assert.strictEqual(increase(s([0, 50], [60, 0], [120, 10])), 10);
});

test("increase: two resets in a row are both handled", () => {
  assert.strictEqual(increase(s([0, 90], [60, 20], [120, 5], [180, 8])), 20 + 5 + 3);
});

test("increase: the same value twice is no growth, and it is not a reset", () => {
  assert.strictEqual(increase(s([0, 40], [60, 40], [120, 40])), 0);
});

test("increase: fewer than 2 samples gives null (one dot has no direction)", () => {
  assert.strictEqual(increase([]), null);
  assert.strictEqual(increase(s([0, 5])), null);
});

test("increase: does not change the samples", () => {
  const input = s([0, 100], [60, 5]);
  const copy = same(input);
  increase(input);
  assert.deepStrictEqual(input, copy);
});

test("rate: growth per second over the whole window", () => {
  near(rate(s([0, 100], [60, 160], [120, 220])), 1);
});

test("rate: the counter reset does not make the rate negative", () => {
  near(rate(s([0, 100], [60, 160], [120, 220], [180, 15], [240, 75])), 195 / 240);
});

test("rate: the time between the first and last sample is what counts, not the number of samples", () => {
  near(rate(s([100, 10], [400, 40])), 0.1);
});

test("rate: a quiet counter has rate 0", () => {
  assert.strictEqual(rate(s([0, 7], [60, 7], [120, 7])), 0);
});

test("rate: fewer than 2 samples gives null", () => {
  assert.strictEqual(rate([]), null);
  assert.strictEqual(rate(s([10, 3])), null);
});

test("rate: two samples at the same time give null and not Infinity", () => {
  assert.strictEqual(rate(s([10, 3], [10, 9])), null);
});

// ---------- histogramQuantile ----------

const BUCKETS = [
  { le: 0.1, count: 60 },
  { le: 0.3, count: 90 },
  { le: 1, count: 98 },
  { le: Infinity, count: 100 },
];

test("histogramQuantile: p95 is found by interpolating inside the bucket that holds rank 95", () => {
  near(histogramQuantile(0.95, BUCKETS), 0.3 + 0.7 * (5 / 8));
});

test("histogramQuantile: p50 is inside the first bucket, which starts at 0", () => {
  near(histogramQuantile(0.5, BUCKETS), 0.1 * (50 / 60));
});

test("histogramQuantile: p90 lands exactly on a bucket bound", () => {
  near(histogramQuantile(0.9, BUCKETS), 0.3);
});

test("histogramQuantile: a rank in the Infinity bucket gives the highest finite bound", () => {
  assert.strictEqual(histogramQuantile(0.99, BUCKETS), 1);
  assert.strictEqual(histogramQuantile(1, BUCKETS), 1);
});

test("histogramQuantile: the answer moves up when more slow requests arrive", () => {
  const slower = [
    { le: 0.1, count: 40 },
    { le: 0.3, count: 70 },
    { le: 1, count: 98 },
    { le: Infinity, count: 100 },
  ];
  assert.ok(histogramQuantile(0.95, slower) > histogramQuantile(0.95, BUCKETS));
});

test("histogramQuantile: works on buckets made by cumulativeBuckets", () => {
  const values = [].concat(Array(60).fill(0.05), Array(30).fill(0.2), Array(8).fill(0.6), Array(2).fill(2.5));
  near(histogramQuantile(0.95, cumulativeBuckets(values, [0.1, 0.3, 1])), 0.7375);
});

test("histogramQuantile: no observations gives null", () => {
  assert.strictEqual(histogramQuantile(0.95, cumulativeBuckets([], [0.1, 1])), null);
});

test("histogramQuantile: buckets with no Infinity bucket at the end give null", () => {
  assert.strictEqual(histogramQuantile(0.5, [{ le: 1, count: 4 }, { le: 2, count: 8 }]), null);
});

test("histogramQuantile: a q of 0 or less, or more than 1, throws a RangeError", () => {
  assert.throws(() => histogramQuantile(0, BUCKETS), RangeError);
  assert.throws(() => histogramQuantile(-0.5, BUCKETS), RangeError);
  assert.throws(() => histogramQuantile(1.2, BUCKETS), RangeError);
});

test("histogramQuantile: a bucket that holds nothing is skipped over", () => {
  const gap = [
    { le: 0.1, count: 10 },
    { le: 0.5, count: 10 },
    { le: 1, count: 20 },
    { le: Infinity, count: 20 },
  ];
  near(histogramQuantile(0.75, gap), 0.5 + 0.5 * (5 / 10));
});

test("histogramQuantile: does not change the buckets", () => {
  const input = BUCKETS.map((b) => ({ ...b }));
  histogramQuantile(0.95, input);
  assert.deepStrictEqual(input, BUCKETS);
});

// ---------- evaluateAlert ----------

const pts = (...values) => values.map((v, i) => ({ t: i * 60, v }));

test("evaluateAlert: below the threshold the alert stays inactive", () => {
  const result = evaluateAlert(pts(1, 2, 3), { threshold: 5, forSeconds: 120 });
  assert.deepStrictEqual(result, { states: ["inactive", "inactive", "inactive"], firedAt: null });
});

test("evaluateAlert: the condition is v greater than the threshold, so equal does not count", () => {
  const result = evaluateAlert(pts(5, 5), { threshold: 5, forSeconds: 0 });
  assert.deepStrictEqual(result.states, ["inactive", "inactive"]);
});

test("evaluateAlert: the first bad point is pending, and it fires when the wait has passed", () => {
  const result = evaluateAlert(pts(0, 9, 9, 9, 9), { threshold: 5, forSeconds: 120 });
  assert.deepStrictEqual(result.states, ["inactive", "pending", "pending", "firing", "firing"]);
  assert.strictEqual(result.firedAt, 180);
});

test("evaluateAlert: exactly the wait time is enough (greater than or equal)", () => {
  const result = evaluateAlert(pts(9, 9, 9), { threshold: 5, forSeconds: 120 });
  assert.deepStrictEqual(result.states, ["pending", "pending", "firing"]);
});

test("evaluateAlert: a short spike never fires", () => {
  const result = evaluateAlert(pts(0, 9, 9, 0, 0), { threshold: 5, forSeconds: 300 });
  assert.deepStrictEqual(result.states, ["inactive", "pending", "pending", "inactive", "inactive"]);
  assert.strictEqual(result.firedAt, null);
});

test("evaluateAlert: with a wait of 0 it fires on the first bad point", () => {
  const result = evaluateAlert(pts(0, 9, 0), { threshold: 5, forSeconds: 0 });
  assert.deepStrictEqual(result.states, ["inactive", "firing", "inactive"]);
  assert.strictEqual(result.firedAt, 60);
});

test("evaluateAlert: one good point in the middle starts the wait again", () => {
  const result = evaluateAlert(pts(9, 9, 0, 9, 9, 9), { threshold: 5, forSeconds: 120 });
  assert.deepStrictEqual(result.states, ["pending", "pending", "inactive", "pending", "pending", "firing"]);
  assert.strictEqual(result.firedAt, 300);
});

test("evaluateAlert: after it fires, it stays firing while the condition stays true, then goes inactive", () => {
  const result = evaluateAlert(pts(9, 9, 9, 9, 0, 0), { threshold: 5, forSeconds: 60 });
  assert.deepStrictEqual(result.states, ["pending", "firing", "firing", "firing", "inactive", "inactive"]);
});

test("evaluateAlert: firedAt is the first time it fired, not the last", () => {
  const result = evaluateAlert(pts(9, 9, 0, 9, 9), { threshold: 5, forSeconds: 60 });
  assert.strictEqual(result.firedAt, 60);
});

test("evaluateAlert: no data (null) counts as not bad and resets the wait", () => {
  const result = evaluateAlert(pts(9, 9, null, 9, 9), { threshold: 5, forSeconds: 120 });
  assert.deepStrictEqual(result.states, ["pending", "pending", "inactive", "pending", "pending"]);
});

test("evaluateAlert: the wait is measured in seconds on the time of the points, not in the number of points", () => {
  const points = [{ t: 0, v: 9 }, { t: 15, v: 9 }, { t: 30, v: 9 }, { t: 45, v: 9 }, { t: 60, v: 9 }];
  const result = evaluateAlert(points, { threshold: 5, forSeconds: 60 });
  assert.deepStrictEqual(result.states, ["pending", "pending", "pending", "pending", "firing"]);
  assert.strictEqual(result.firedAt, 60);
});

test("evaluateAlert: no data is never bad, even when the threshold is below 0", () => {
  const result = evaluateAlert([{ t: 0, v: null }, { t: 60, v: null }], { threshold: -1, forSeconds: 0 });
  assert.deepStrictEqual(result, { states: ["inactive", "inactive"], firedAt: null });
});

test("evaluateAlert: no points gives no states", () => {
  assert.deepStrictEqual(evaluateAlert([], { threshold: 1, forSeconds: 60 }), { states: [], firedAt: null });
});

test("evaluateAlert: does not change the points or the rule", () => {
  const points = pts(0, 9, 9, 9);
  const rule = { threshold: 5, forSeconds: 60 };
  const a = same(points);
  const b = same(rule);
  evaluateAlert(points, rule);
  assert.deepStrictEqual(points, a);
  assert.deepStrictEqual(rule, b);
});

// ---------- burnRate and shouldPage ----------

test("burnRate: the error ratio divided by the allowed error ratio", () => {
  near(burnRate(0.001, 0.999), 1);
  near(burnRate(0.0144, 0.999), 14.4);
  near(burnRate(0.05, 0.999), 50);
});

test("burnRate: depends on the SLO, the same errors burn faster against a stricter SLO", () => {
  near(burnRate(0.01, 0.99), 1);
  near(burnRate(0.01, 0.999), 10);
});

test("burnRate: no errors is 0, and all errors burns at 1 divided by the allowed ratio", () => {
  assert.strictEqual(burnRate(0, 0.999), 0);
  near(burnRate(1, 0.999), 1000);
});

test("shouldPage: pages only when both the long and the short window are above the line", () => {
  assert.strictEqual(shouldPage(0.02, 0.03, 0.999), true);
});

test("shouldPage: a short blip with a quiet long window does not page", () => {
  assert.strictEqual(shouldPage(0.002, 0.05, 0.999), false);
});

test("shouldPage: after the fix the short window falls, so the page clears even if the long window is still high", () => {
  assert.strictEqual(shouldPage(0.02, 0.0005, 0.999), false);
});

test("shouldPage: a slow leak below the line does not page", () => {
  assert.strictEqual(shouldPage(0.005, 0.006, 0.999), false);
});

test("shouldPage: the factor can be changed", () => {
  assert.strictEqual(shouldPage(0.007, 0.008, 0.999, 6), true);
  assert.strictEqual(shouldPage(0.007, 0.008, 0.999, 14.4), false);
});

test("shouldPage: the SLO sets the line", () => {
  assert.strictEqual(shouldPage(0.02, 0.02, 0.99), false);
  assert.strictEqual(shouldPage(0.2, 0.2, 0.99), true);
});

test("shouldPage: a ratio exactly on the line is not above it", () => {
  assert.strictEqual(shouldPage(0.5, 0.5, 0.5, 1), false);
  assert.strictEqual(shouldPage(0.5, 0.6, 0.5, 1), false);
  assert.strictEqual(shouldPage(0.6, 0.6, 0.5, 1), true);
});
