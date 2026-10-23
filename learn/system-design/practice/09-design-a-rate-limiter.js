// Lesson 09: Design a rate limiter. Write the four things below, then run:
//   node --test learn/system-design/practice/09-design-a-rate-limiter.test.js
//
// Every limiter keeps one count per client key (a user id, an API key or an IP address).
// Every limiter takes now(), a function that gives the time in milliseconds. The default is Date.now.
// The tests pass a fake clock, so they can move time without waiting.

// createFixedWindow({ limit, windowMs, now })
//   Counts requests per clock window: 0 to 59,999 ms is one window, 60,000 to 119,999 ms the next, and so on.
//   A new window starts the count again at 0.
//   check(key) returns:
//     { allowed: true,  remaining: <requests left in this window>, retryAfterSeconds: 0 }
//     { allowed: false, remaining: 0, retryAfterSeconds: <seconds until this window ends, rounded up> }
//   A request that is refused does not add to the count.
function createFixedWindow({ limit, windowMs, now = Date.now }) {
  // TODO
}

// createSlidingWindow({ limit, windowMs, now })
//   Keeps two counts per key: this clock window and the one just before it.
//   It guesses how many requests came in the last windowMs:
//     guess = previous x (part of the previous window still inside the last windowMs) + current
//   For example, 15 s into this minute, 45 of the last 60 s are in the previous minute, so it takes 45/60 of it.
//   Tip: multiply before you divide, previous x (windowMs - msIntoThisWindow) / windowMs, so 3 x 40000 / 60000 is exactly 2.
//   Allow the request when guess + 1 is not more than the limit. Then add 1 to the current count.
//   When a new window starts, the current count moves to previous. A window that is older than that counts as 0.
//   check(key) returns { allowed: true } or { allowed: false }.
function createSlidingWindow({ limit, windowMs, now = Date.now }) {
  // TODO
}

// createTokenBucket({ capacity, refillPerSecond, now })
//   Each key has a bucket that starts full with `capacity` tokens.
//   On every check, first add the tokens that grew since the last check:
//     (milliseconds since the last check / 1000) x refillPerSecond. The bucket never holds more than capacity.
//   If the bucket has 1 token or more, take 1 and allow. Tokens can be parts, like 0.5.
//   check(key) returns:
//     { allowed: true,  remaining: <whole tokens left, rounded down>, retryAfterSeconds: 0 }
//     { allowed: false, remaining: 0, retryAfterSeconds: <seconds until 1 whole token is back, rounded up> }
function createTokenBucket({ capacity, refillPerSecond, now = Date.now }) {
  // TODO
}

// withFallback(limiter, { failOpen })
//   Wraps any limiter. check(key) calls limiter.check(key) and gives back its answer.
//   If limiter.check throws (for example, Redis is down), it returns:
//     { allowed: true,  limiterDown: true }   when failOpen is true  (let people in, and alert)
//     { allowed: false, limiterDown: true }   when failOpen is false (say no, for routes like login and OTP)
function withFallback(limiter, { failOpen }) {
  // TODO
}

module.exports = { createFixedWindow, createSlidingWindow, createTokenBucket, withFallback };
