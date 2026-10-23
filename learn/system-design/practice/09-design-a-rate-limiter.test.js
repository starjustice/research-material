const test = require("node:test");
const assert = require("node:assert");
const {
  createFixedWindow,
  createSlidingWindow,
  createTokenBucket,
  withFallback,
} = require("./09-design-a-rate-limiter");

// A fake clock. Tests move time by changing clock.t, so nothing has to wait.
function fakeClock(start = 0) {
  const clock = { t: start };
  clock.now = () => clock.t;
  return clock;
}

// ---- Fixed window ----

test("fixed window: allows up to the limit, then says no", () => {
  const clock = fakeClock();
  const rl = createFixedWindow({ limit: 3, windowMs: 60_000, now: clock.now });
  assert.deepStrictEqual(rl.check("ann"), { allowed: true, remaining: 2, retryAfterSeconds: 0 });
  assert.deepStrictEqual(rl.check("ann"), { allowed: true, remaining: 1, retryAfterSeconds: 0 });
  assert.deepStrictEqual(rl.check("ann"), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
  assert.strictEqual(rl.check("ann").allowed, false);
});

test("fixed window: each client key has its own count", () => {
  const clock = fakeClock();
  const rl = createFixedWindow({ limit: 1, windowMs: 60_000, now: clock.now });
  assert.strictEqual(rl.check("ann").allowed, true);
  assert.strictEqual(rl.check("ann").allowed, false);
  assert.strictEqual(rl.check("ben").allowed, true);
});

test("fixed window: retryAfterSeconds is the time left in this window, rounded up", () => {
  const clock = fakeClock(50_500);
  const rl = createFixedWindow({ limit: 1, windowMs: 60_000, now: clock.now });
  rl.check("ann");
  assert.deepStrictEqual(rl.check("ann"), { allowed: false, remaining: 0, retryAfterSeconds: 10 });
});

test("fixed window: the count starts again at the next clock window", () => {
  const clock = fakeClock(10_000);
  const rl = createFixedWindow({ limit: 1, windowMs: 60_000, now: clock.now });
  assert.strictEqual(rl.check("ann").allowed, true);
  clock.t = 59_999;
  assert.strictEqual(rl.check("ann").allowed, false);
  clock.t = 60_000;
  assert.strictEqual(rl.check("ann").allowed, true);
});

test("fixed window: the edge problem lets 2 times the limit through in 2 seconds", () => {
  const clock = fakeClock();
  const rl = createFixedWindow({ limit: 3, windowMs: 60_000, now: clock.now });
  const answers = [];
  for (const sec of [59, 59, 59, 61, 61, 61]) {
    clock.t = sec * 1000;
    answers.push(rl.check("ann").allowed);
  }
  assert.deepStrictEqual(answers, [true, true, true, true, true, true]);
});

// ---- Sliding window counter ----

test("sliding window: allows up to the limit inside one window", () => {
  const clock = fakeClock(1_000);
  const rl = createSlidingWindow({ limit: 3, windowMs: 60_000, now: clock.now });
  assert.deepStrictEqual([1, 2, 3, 4].map(() => rl.check("ann").allowed), [true, true, true, false]);
});

test("sliding window: no edge burst, it blocks right after the clock minute ends", () => {
  const clock = fakeClock();
  const rl = createSlidingWindow({ limit: 3, windowMs: 60_000, now: clock.now });
  const answers = [];
  for (const sec of [59, 59, 59, 61, 61, 61]) {
    clock.t = sec * 1000;
    answers.push(rl.check("ann").allowed);
  }
  assert.deepStrictEqual(answers, [true, true, true, false, false, false]);
});

test("sliding window: the guess shrinks as last window slides away", () => {
  const clock = fakeClock(59_000);
  const rl = createSlidingWindow({ limit: 3, windowMs: 60_000, now: clock.now });
  rl.check("ann"); rl.check("ann"); rl.check("ann");      // 3 in the first minute
  clock.t = 79_000;                                         // 19 s into the next minute: 3 x 41/60 = 2.05, plus 1 is over 3
  assert.strictEqual(rl.check("ann").allowed, false);
  clock.t = 80_000;                                         // 20 s in: 3 x 40/60 = 2, plus 1 is exactly 3
  assert.strictEqual(rl.check("ann").allowed, true);
});

test("sliding window: a window that is two or more windows old counts as zero", () => {
  const clock = fakeClock(0);
  const rl = createSlidingWindow({ limit: 2, windowMs: 60_000, now: clock.now });
  rl.check("ann"); rl.check("ann");
  clock.t = 125_000;                                        // two windows later
  assert.deepStrictEqual([1, 2, 3].map(() => rl.check("ann").allowed), [true, true, false]);
});

test("sliding window: each client key has its own counts", () => {
  const clock = fakeClock(0);
  const rl = createSlidingWindow({ limit: 1, windowMs: 60_000, now: clock.now });
  assert.strictEqual(rl.check("ann").allowed, true);
  assert.strictEqual(rl.check("ben").allowed, true);
  assert.strictEqual(rl.check("ann").allowed, false);
});

// ---- Token bucket ----

test("token bucket: a full bucket allows a burst, then says no", () => {
  const clock = fakeClock();
  const rl = createTokenBucket({ capacity: 3, refillPerSecond: 1, now: clock.now });
  assert.deepStrictEqual([1, 2, 3, 4, 5].map(() => rl.check("ann").allowed), [true, true, true, false, false]);
});

test("token bucket: remaining is the whole tokens left after this request", () => {
  const clock = fakeClock();
  const rl = createTokenBucket({ capacity: 3, refillPerSecond: 1, now: clock.now });
  assert.deepStrictEqual(rl.check("ann"), { allowed: true, remaining: 2, retryAfterSeconds: 0 });
});

test("token bucket: tokens grow back with time, the same as the lesson trace", () => {
  const clock = fakeClock();
  const rl = createTokenBucket({ capacity: 3, refillPerSecond: 1, now: clock.now });
  for (let i = 0; i < 5; i++) rl.check("ann");             // 0 tokens left
  clock.t = 1500;
  assert.strictEqual(rl.check("ann").allowed, true);        // 1.5 tokens, take 1, 0.5 left
  clock.t = 1600;
  assert.strictEqual(rl.check("ann").allowed, false);       // 0.6 tokens
  clock.t = 10_000;
  assert.deepStrictEqual(rl.check("ann"), { allowed: true, remaining: 2, retryAfterSeconds: 0 });   // full again, never more than 3
});

test("token bucket: retryAfterSeconds is how long until 1 token grows back, rounded up", () => {
  const clock = fakeClock();
  const rl = createTokenBucket({ capacity: 2, refillPerSecond: 0.25, now: clock.now });   // 1 token every 4 s
  rl.check("ann"); rl.check("ann");
  assert.deepStrictEqual(rl.check("ann"), { allowed: false, remaining: 0, retryAfterSeconds: 4 });
  clock.t = 1_000;
  assert.strictEqual(rl.check("ann").retryAfterSeconds, 3);
});

test("token bucket: each client key has its own bucket", () => {
  const clock = fakeClock();
  const rl = createTokenBucket({ capacity: 1, refillPerSecond: 1, now: clock.now });
  assert.strictEqual(rl.check("ann").allowed, true);
  assert.strictEqual(rl.check("ann").allowed, false);
  assert.strictEqual(rl.check("ben").allowed, true);
});

// ---- When the limiter itself breaks ----

function brokenLimiter() {
  return { check() { throw new Error("redis is down"); } };
}

test("withFallback passes the answer through when the limiter works", () => {
  const clock = fakeClock();
  const rl = withFallback(createFixedWindow({ limit: 1, windowMs: 60_000, now: clock.now }), { failOpen: false });
  assert.strictEqual(rl.check("ann").allowed, true);
  assert.strictEqual(rl.check("ann").allowed, false);
});

test("withFallback fail open: the limiter is broken, so let the request in", () => {
  const rl = withFallback(brokenLimiter(), { failOpen: true });
  assert.deepStrictEqual(rl.check("ann"), { allowed: true, limiterDown: true });
});

test("withFallback fail closed: the limiter is broken, so say no", () => {
  const rl = withFallback(brokenLimiter(), { failOpen: false });
  assert.deepStrictEqual(rl.check("ann"), { allowed: false, limiterDown: true });
});
