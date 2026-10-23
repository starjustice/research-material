// Lesson 26: SLOs and error budgets. Write the five functions below, then run:
//   node --test learn/system-design/practice/26-slos-and-error-budgets.test.js

// An SLO is a share, for example 0.999 for 99.9 percent. The error budget is what is left: 1 - slo.
// An error rate is a share too. 0.05 means 5 percent of the requests failed.
// A month has 30 days unless the function says otherwise.
//
//   downtimeMinutes(slo, days = 30)
//       How many minutes of full outage the SLO allows over `days` days.
//       Example: downtimeMinutes(0.999) is about 43.2.
//
//   burnRate(errorRate, slo)
//       How many times faster than allowed the error budget is being spent.
//       1 means the budget lasts exactly the whole period. 14.4 means it is spent 14.4 times faster.
//
//   daysToEmpty(errorRate, slo, days = 30)
//       Days until the whole budget is gone, if this error rate never changes.
//       When errorRate is 0 the budget is never spent, so return Infinity.
//
//   budgetLeft(slo, totalRequests, badRequests)
//       The share of the error budget that is still unspent.
//       1 means untouched, 0 means all spent, and below 0 means overspent.
//       With 0 total requests, return 1.
//
//   shouldPage({ slo, longRate, shortRate, threshold = 14.4 })
//       longRate is the error rate over the long window (for example 1 hour).
//       shortRate is the error rate over the short window (for example 5 minutes).
//       Return true only when BOTH burn rates are higher than threshold.

function downtimeMinutes(slo, days) {
  // TODO
}

function burnRate(errorRate, slo) {
  // TODO
}

function daysToEmpty(errorRate, slo, days) {
  // TODO
}

function budgetLeft(slo, totalRequests, badRequests) {
  // TODO
}

function shouldPage(options) {
  // TODO
}

module.exports = { downtimeMinutes, burnRate, daysToEmpty, budgetLeft, shouldPage };
