// Lesson 15: Choosing tools and explaining why. Write decide below, then run:
//   node --test learn/system-design/practice/15-choosing-tools-and-explaining-why.test.js

// decide(options, weights) compares tools and says what you give up and what would flip the pick.
//
//   options   an object: tool name -> scores. Each score is a number from 0 to 5, and higher is better.
//             For example { Postgres: { team: 5, ops: 4 }, Mongo: { team: 3, ops: 3 } }
//   weights   an object: criterion name -> how much it matters here (a whole number, 0 or more).
//             For example { team: 3, ops: 2 }
//             Only the criteria named in weights count. If a tool has no number for one of them,
//             throw an Error.
//
// It returns { winner, runnerUp, totals, cost, flip }:
//
//   totals    an object: tool name -> sum of (weight x score) over all criteria in weights.
//
//   winner    the tool with the biggest total.
//   runnerUp  the tool with the second biggest total, or null when there is only one tool.
//             When two tools have the same total, the one listed first in options is ahead.
//
//   cost      what you give up by choosing the winner. Look at the runner-up only.
//             For each criterion where the runner-up scores HIGHER than the winner, work out
//               behind   = runner-up score minus winner score
//               weighted = behind x weight
//             cost is { criterion, behind, weighted } for the criterion with the biggest weighted.
//             If two have the same weighted, the one that comes first in weights wins.
//             If the runner-up is never ahead (or there is no runner-up), cost is null.
//
//   flip      what would change the pick. Take the criterion named in cost.
//             Raise its weight by 1, then 2, then 3 ... (up to +100) until decide would pick the
//             runner-up as the winner (same tie rule as above).
//             flip is { criterion, weight } with that new weight.
//             If cost is null, or no weight up to +100 flips it, flip is null.
//
// Do not change the options or weights that you were given.
function decide(options, weights) {
  // TODO
}

module.exports = { decide };
