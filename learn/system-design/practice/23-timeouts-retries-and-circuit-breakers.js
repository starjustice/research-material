// Lesson 23: Timeouts, retries and circuit breakers. Write the two functions below, then run:
//   node --test learn/system-design/practice/23-timeouts-retries-and-circuit-breakers.test.js

// backoffMs(attempt, options) says how long to wait before the next try. It uses full jitter.
// attempt counts from 0: the wait before the first retry is attempt 0.
//
//   ceiling = the smaller of capMs and baseMs * 2 ** attempt     (100, 200, 400, 800 ... up to the cap)
//   the answer = random() * ceiling                                (a random point from 0 up to the ceiling)
//
// options (all optional): baseMs (default 100), capMs (default 5000), random (default Math.random).
// The tests pass their own random(), so the answers are exact.
function backoffMs(attempt, options) {
  // TODO
}

// createCircuitBreaker(options) makes a breaker. options (all optional):
//   failureThreshold  how many failures in a row open the breaker. Default 3.
//   cooldownMs        how long it stays open before a test call is allowed. Default 30000.
//   now               a function that returns the time in ms. Default Date.now. Tests pass a fake clock.
//
// It returns an object with these methods:
//
//   call(fn)    fn is an async function that does the real work. call is async too.
//               - closed:    run fn. If it works, return its value and reset the count of failures to 0.
//                            If it throws, count one failure, throw the same error, and when the count
//                            reaches failureThreshold, open the breaker and note the time.
//               - open:      do NOT run fn. Throw an Error whose code is "CIRCUIT_OPEN". This is not a
//                            failure: it does not change the count or the cooldown.
//               - half open: the cooldown is over. Let ONE test call run. If it works, close the breaker
//                            and reset the count. If it throws, open the breaker again and restart the
//                            cooldown. While the test call is still running, any other call gets
//                            the "CIRCUIT_OPEN" error.
//
//   state()     "closed", "open" or "half-open". The breaker is "half-open" when it was opened and
//               now() - openedAt >= cooldownMs. So the state is worked out from the clock.
//
//   failures()  the current count of failures in a row.
function createCircuitBreaker(options) {
  // TODO
}

module.exports = { backoffMs, createCircuitBreaker };
