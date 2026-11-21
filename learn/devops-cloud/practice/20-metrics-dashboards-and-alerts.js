// Lesson 20: Metrics, dashboards and alerts. Write the seven pieces below, then run:
//   node --test learn/devops-cloud/practice/20-metrics-dashboards-and-alerts.test.js
//
// This is a tiny model of what Prometheus does with the numbers your app exposes.
// A "sample" is one scraped value: { t, v }. t is the time in seconds, v is the value of a counter.
// A list of samples is always sorted by time, oldest first.
//
//   cumulativeBuckets(values, bounds)
//       values: the request times your app saw, for example [0.05, 0.2, 0.6]. bounds: the upper
//       bounds of the buckets, small to large, for example [0.1, 0.3, 1].
//       Return [{ le, count }, ...]: one item per bound, then one last item with le: Infinity.
//       count is how many values are less than or equal to le. A value is counted in EVERY bucket
//       it fits under, so the counts only grow from left to right. The Infinity bucket counts all values.
//       Never change the lists you were given (do not sort them).
//
//   increase(samples)
//       How much a counter grew over the samples. Add up the growth of each step:
//         the value went up or stayed the same: add (now - before)
//         the value went DOWN: the app restarted and the counter began again at 0 (a counter reset),
//         so add now (it grew from 0 to now)
//       Fewer than 2 samples: return null (one dot has no direction).
//
//   rate(samples)
//       Growth per second: increase(samples) divided by the seconds from the first to the last sample.
//       Return null when there are fewer than 2 samples, or when the first and last time are the same.
//       (Real Prometheus also stretches the result to the ends of the window. This model does not.)
//
//   histogramQuantile(q, buckets)
//       Estimate the q-quantile (0.95 means p95) from cumulative buckets like the ones above.
//       q must be above 0 and at most 1, otherwise throw a RangeError.
//       Return null when the last bucket is not Infinity, or when it holds 0 values.
//       rank = q * (the count of the Infinity bucket). Find the first bucket whose count is
//       at least rank.
//         If that is the Infinity bucket, return the bound (le) of the bucket before it. The
//         histogram cannot say more than "above the top bound".
//         Otherwise the answer lies inside that bucket. The bucket starts at the bound before it
//         (0 for the first bucket) and holds (count - count before it) values. Assume they are spread evenly:
//         start + (le - start) * ((rank - count before it) / (count - count before it))
//       Never change the buckets.
//
//   evaluateAlert(points, rule)
//       points: [{ t, v }] sorted by time. v is the value of the alert expression at each check,
//       or null when there is no data. rule: { threshold, forSeconds }.
//       The condition is true when v is not null and v > threshold.
//       Return { states, firedAt }. states has one text per point:
//         "inactive"  the condition is false. The waiting timer is forgotten.
//         "pending"   the condition is true, but it has been true for less than forSeconds
//         "firing"    the condition has been true without a break for at least forSeconds
//       The timer starts at the t of the first true point of a run. With forSeconds 0 the first
//       true point is already "firing". firedAt is the t of the first "firing" point, or null.
//       Never change the points or the rule.
//
//   burnRate(errorRatio, slo)
//       How many times faster than allowed the error budget is spent.
//       errorRatio is the share of failed requests (0.0144 means 1.44 percent).
//       slo is the goal, for example 0.999. The allowed error ratio is 1 - slo.
//       Return errorRatio divided by the allowed error ratio.
//
//   shouldPage(longRatio, shortRatio, slo, factor = 14.4)
//       The page rule from the Google SRE Workbook. longRatio is the error ratio over the long
//       window (1 hour), shortRatio over the short window (5 minutes).
//       The line is factor * (1 - slo). Return true only when BOTH ratios are above the line
//       (strictly greater).

function cumulativeBuckets(values, bounds) {
  // TODO
}

function increase(samples) {
  // TODO
}

function rate(samples) {
  // TODO
}

function histogramQuantile(q, buckets) {
  // TODO
}

function evaluateAlert(points, rule) {
  // TODO
}

function burnRate(errorRatio, slo) {
  // TODO
}

function shouldPage(longRatio, shortRatio, slo, factor = 14.4) {
  // TODO
}

module.exports = { cumulativeBuckets, increase, rate, histogramQuantile, evaluateAlert, burnRate, shouldPage };
