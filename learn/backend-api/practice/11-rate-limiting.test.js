const test = require("node:test");
const assert = require("node:assert");
const {
  createTokenBucketLimiter, createFixedWindowLimiter, statusFor, rateLimitHeaders, keyFor, answers,
} = require("./11-rate-limiting");

// ---- Task 1: token bucket ----

test("token bucket: a new key starts full, then runs out", () => {
  const l = createTokenBucketLimiter({ capacity: 3, refillPerSec: 1 });
  assert.deepStrictEqual(l.check("a", 0), { allowed: true, remaining: 2, retryAfterSec: 0 });
  assert.deepStrictEqual(l.check("a", 0), { allowed: true, remaining: 1, retryAfterSec: 0 });
  assert.deepStrictEqual(l.check("a", 0), { allowed: true, remaining: 0, retryAfterSec: 0 });
  assert.deepStrictEqual(l.check("a", 0), { allowed: false, remaining: 0, retryAfterSec: 1 });
});

test("token bucket: time brings tokens back (the table from the lesson)", () => {
  const l = createTokenBucketLimiter({ capacity: 3, refillPerSec: 1 });
  const times = [0, 0, 0, 0, 500, 1000, 1000];
  assert.deepStrictEqual(times.map((t) => l.check("a", t).allowed), [true, true, true, false, false, true, false]);
});

test("token bucket: each key has its own bucket", () => {
  const l = createTokenBucketLimiter({ capacity: 1, refillPerSec: 1 });
  assert.strictEqual(l.check("ana", 0).allowed, true);
  assert.strictEqual(l.check("ana", 0).allowed, false);
  assert.strictEqual(l.check("budi", 0).allowed, true, "Budi has his own bucket");
});

test("token bucket: a key that first appears late still starts full", () => {
  const l = createTokenBucketLimiter({ capacity: 2, refillPerSec: 1 });
  assert.strictEqual(l.check("a", 5000).allowed, true);
  assert.strictEqual(l.check("a", 5000).allowed, true);
  assert.strictEqual(l.check("a", 5000).allowed, false);
});

test("token bucket: retryAfterSec is rounded up and uses the fraction", () => {
  const l = createTokenBucketLimiter({ capacity: 1, refillPerSec: 0.5 });   // one token every 2 seconds
  assert.strictEqual(l.check("a", 0).allowed, true);
  const r = l.check("a", 500);                                              // 0.25 tokens now
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.retryAfterSec, 2, "(1 - 0.25) / 0.5 = 1.5 seconds, rounded up to 2");
  assert.strictEqual(l.check("a", 2000).allowed, true, "after 2 seconds the token is back");
});

test("token bucket: tokens never go above capacity", () => {
  const l = createTokenBucketLimiter({ capacity: 2, refillPerSec: 1 });
  assert.strictEqual(l.check("a", 0).allowed, true);
  const afterLongWait = [100000, 100000, 100000].map((t) => l.check("a", t).allowed);
  assert.deepStrictEqual(afterLongWait, [true, true, false], "a long wait fills the bucket to 2, not to 100000");
});

test("token bucket: time that goes backward gives no free tokens", () => {
  const l = createTokenBucketLimiter({ capacity: 1, refillPerSec: 1 });
  assert.strictEqual(l.check("a", 1000).allowed, true);
  assert.strictEqual(l.check("a", 500).allowed, false, "an earlier time must not refill or crash");
  assert.strictEqual(l.check("a", 1500).allowed, false, "only 0.5 s has passed since the last real time");
  assert.strictEqual(l.check("a", 2000).allowed, true);
});

test("token bucket: a refused request takes no token", () => {
  const l = createTokenBucketLimiter({ capacity: 1, refillPerSec: 1 });
  l.check("a", 0);
  for (let i = 0; i < 10; i++) l.check("a", 0);       // ten refused requests
  assert.strictEqual(l.check("a", 1000).allowed, true, "one second later the token is back, in spite of the ten refusals");
});

// ---- Task 2: fixed window ----

test("fixed window: counts inside a window, then a new window starts at 0", () => {
  const l = createFixedWindowLimiter({ limit: 3, windowMs: 1000 });
  assert.deepStrictEqual(l.check("a", 0), { allowed: true, remaining: 2, retryAfterSec: 0 });
  assert.deepStrictEqual(l.check("a", 100), { allowed: true, remaining: 1, retryAfterSec: 0 });
  assert.deepStrictEqual(l.check("a", 200), { allowed: true, remaining: 0, retryAfterSec: 0 });
  assert.deepStrictEqual(l.check("a", 300), { allowed: false, remaining: 0, retryAfterSec: 1 });
  assert.strictEqual(l.check("a", 1000).allowed, true, "window 1 starts, the count is 0 again");
});

test("fixed window: retryAfterSec is the time to the end of the window, rounded up", () => {
  const l = createFixedWindowLimiter({ limit: 1, windowMs: 60000 });
  l.check("a", 10000);
  assert.strictEqual(l.check("a", 10000).retryAfterSec, 50);
  assert.strictEqual(l.check("a", 59001).retryAfterSec, 1, "999 ms left, rounded up to 1");
});

test("fixed window: each key has its own count", () => {
  const l = createFixedWindowLimiter({ limit: 1, windowMs: 1000 });
  assert.strictEqual(l.check("ana", 0).allowed, true);
  assert.strictEqual(l.check("ana", 0).allowed, false);
  assert.strictEqual(l.check("budi", 0).allowed, true);
});

test("the edge problem: a fixed window lets 10 through in 1.5 s, a token bucket does not", () => {
  const times = [9000, 9100, 9200, 9300, 9400, 10000, 10100, 10200, 10300, 10400];
  const fixed = createFixedWindowLimiter({ limit: 5, windowMs: 10000 });
  const bucket = createTokenBucketLimiter({ capacity: 5, refillPerSec: 0.5 });   // 5 per 10 seconds on average
  const fixedAllowed = times.filter((t) => fixed.check("a", t).allowed).length;
  const bucketAllowed = times.filter((t) => bucket.check("a", t).allowed).length;
  assert.strictEqual(fixedAllowed, 10, "both windows said yes");
  assert.ok(bucketAllowed <= 6, `the bucket allowed ${bucketAllowed}, it should keep the average`);
});

// ---- Task 3: status and headers ----

test("statusFor: 200 or 429", () => {
  assert.strictEqual(statusFor({ allowed: true, remaining: 1, retryAfterSec: 0 }), 200);
  assert.strictEqual(statusFor({ allowed: false, remaining: 0, retryAfterSec: 3 }), 429);
});

test("rateLimitHeaders: Retry-After only when refused, as a string", () => {
  assert.deepStrictEqual(rateLimitHeaders({ allowed: true, remaining: 1, retryAfterSec: 0 }), {});
  assert.deepStrictEqual(rateLimitHeaders({ allowed: false, remaining: 0, retryAfterSec: 3 }), { "Retry-After": "3" });
});

// ---- Task 4: keyFor ----

test("keyFor: the user id wins over the ip", () => {
  assert.strictEqual(keyFor({ user: { id: 7 }, ip: "1.2.3.4" }), "user:7");
});

test("keyFor: a logged-out caller is counted by ip", () => {
  assert.strictEqual(keyFor({ ip: "1.2.3.4" }), "ip:1.2.3.4");
  assert.strictEqual(keyFor({ user: null, ip: "1.2.3.4" }), "ip:1.2.3.4");
});

test("keyFor: the id 0 is a real id", () => {
  assert.strictEqual(keyFor({ user: { id: 0 }, ip: "1.2.3.4" }), "user:0");
});

test("keyFor: it never throws", () => {
  assert.strictEqual(keyFor({}), "anonymous");
  assert.strictEqual(keyFor(undefined), "anonymous");
  assert.strictEqual(keyFor(null), "anonymous");
});

// ---- Task 5: answers ----

test("answers: the five short answers", () => {
  assert.deepStrictEqual(answers, {
    burstFriendlyAlgorithm: "token bucket",
    edgeProblemAlgorithm: "fixed window",
    statusWhenBlocked: 429,
    headerThatSaysWhenToRetry: "Retry-After",
    whereToKeepCountsWithThreeServers: "shared store",
  });
});
