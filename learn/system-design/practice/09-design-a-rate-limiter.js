// Lesson 09: Design a rate limiter. SOLUTION (temporary, replaced by the stub below).
function createLimiter({ capacity, refillPerSecond, now }) {
  const buckets = new Map();                                // key -> { tokens, last }
  return {
    check(key) {
      const t = now();
      let b = buckets.get(key);
      if (!b) { b = { tokens: capacity, last: t }; buckets.set(key, b); }   // a new key starts with a full bucket
      const elapsed = Math.max(0, t - b.last) / 1000;       // a clock that goes back adds nothing
      b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSecond);
      b.last = Math.max(b.last, t);                         // never move the last time backwards
      if (b.tokens >= 1) {
        b.tokens -= 1;
        return { allowed: true, remaining: Math.floor(b.tokens) };
      }
      return { allowed: false, retryAfterSeconds: Math.ceil((1 - b.tokens) / refillPerSecond) };
    },
  };
}

module.exports = { createLimiter };
