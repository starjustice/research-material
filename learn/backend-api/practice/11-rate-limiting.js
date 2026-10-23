// Lesson 11: Rate limiting. Do the five tasks below, then run:
//   node --test learn/backend-api/practice/11-rate-limiting.test.js
//
// The clock is a parameter (nowMs, in milliseconds), so the tests do not need to wait.
// A result looks like { allowed, remaining, retryAfterSec }.

// 1. WRITE IT: createTokenBucketLimiter({ capacity, refillPerSec })
//    Returns { check(key, nowMs) }. Each key has its own bucket.
//      - A new key starts with a FULL bucket (capacity tokens) at the time of its first check.
//      - Tokens come back at refillPerSec per second, but never go above capacity.
//      - Time never goes backward. If nowMs is earlier than the last check, treat it as no time passed.
//      - A request needs 1 token. If there is at least 1: take it and return
//          { allowed: true, remaining: <whole tokens left, rounded down>, retryAfterSec: 0 }
//      - Otherwise take nothing and return
//          { allowed: false, remaining: 0, retryAfterSec: <seconds until 1 token exists, rounded UP> }
//    The bucket can hold fractions, for example 0.25 tokens.
function createTokenBucketLimiter({ capacity, refillPerSec }) {
  // TODO
}

// 2. WRITE IT: createFixedWindowLimiter({ limit, windowMs })
//    Returns { check(key, nowMs) }. Each key has its own count.
//      - The window is cut by the clock: window number = Math.floor(nowMs / windowMs).
//      - A new window starts the count at 0. Keep only the current window for each key.
//      - Count every request. Count <= limit: { allowed: true, remaining: limit - count, retryAfterSec: 0 }
//      - Over the limit: { allowed: false, remaining: 0, retryAfterSec: <seconds until the window ends, rounded UP> }
function createFixedWindowLimiter({ limit, windowMs }) {
  // TODO
}

// 3. WRITE IT: statusFor(result) and rateLimitHeaders(result)
//    statusFor:          200 when allowed, 429 when not.
//    rateLimitHeaders:   {} when allowed.
//                        { "Retry-After": "<retryAfterSec as a string>" } when not allowed.
function statusFor(result) {
  // TODO
}
function rateLimitHeaders(result) {
  // TODO
}

// 4. WRITE IT: keyFor(req)
//    The user id wins:        req.user.id is set   -> "user:<id>"
//    Otherwise the address:   req.ip is set        -> "ip:<ip>"
//    Otherwise:                                       "anonymous"
//    The id 0 is a real id. It must never throw, even if req is undefined.
function keyFor(req) {
  // TODO
}

// 5. THINK: fill in each answer.
const answers = {
  burstFriendlyAlgorithm: "",          // "fixed window", "sliding window" or "token bucket": lets short bursts through and keeps the average
  edgeProblemAlgorithm: "",            // which one can let double the limit through at a window edge?
  statusWhenBlocked: 0,                // a number
  headerThatSaysWhenToRetry: "",       // the header name
  whereToKeepCountsWithThreeServers: "", // "server memory" or "shared store"
};

module.exports = { createTokenBucketLimiter, createFixedWindowLimiter, statusFor, rateLimitHeaders, keyFor, answers };
