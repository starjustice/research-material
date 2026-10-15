// Lesson 11: The event loop. Write the two functions below, then run:
//   node --test learn/javascript/practice/11-event-loop.test.js

// 1. Call `log` three times so the calls arrive in this order: "sync", "micro", "task".
//    But write the code in the opposite order. Use setTimeout for "task",
//    Promise.resolve().then for "micro", and a plain call for "sync".
//    Return a promise that finishes (resolves) after all three calls are done.
function logOrder(log) {
  // TODO
}

// 2. Return a promise that finishes (resolves) after `ms` milliseconds.
function sleep(ms) {
  // TODO
}

module.exports = { logOrder, sleep };
