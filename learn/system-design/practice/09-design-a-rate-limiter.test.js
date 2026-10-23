const test = require("node:test");
const assert = require("node:assert");
const { createLimiter } = require("./09-design-a-rate-limiter");

// A helper: a clock that the test moves by hand. It counts milliseconds.
function clock(start = 0) {
  const c = { t: start, now: () => c.t, advance: (ms) => { c.t += ms; }, set: (ms) => { c.t = ms; } };
  return c;
}

test("a new key starts with a full bucket, so a burst up to the capacity is allowed", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  assert.deepStrictEqual(lim.check("ann"), { allowed: true, remaining: 2 });
  assert.deepStrictEqual(lim.check("ann"), { allowed: true, remaining: 1 });
  assert.deepStrictEqual(lim.check("ann"), { allowed: true, remaining: 0 });
});

test("the request after the burst is refused and says when to come back", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  for (let i = 0; i < 3; i++) lim.check("ann");
  assert.deepStrictEqual(lim.check("ann"), { allowed: false, retryAfterSeconds: 1 });
});

test("retryAfterSeconds is rounded up to whole seconds", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 1, refillPerSecond: 0.5, now: c.now });   // one new token every 2 seconds
  lim.check("ann");                                                                // the bucket is now empty
  assert.strictEqual(lim.check("ann").retryAfterSeconds, 2);
  c.advance(500);                                                                  // 0.25 tokens, 1.5 s to go
  assert.strictEqual(lim.check("ann").retryAfterSeconds, 2);
  c.advance(500);                                                                  // 0.5 tokens, 1 s to go
  assert.strictEqual(lim.check("ann").retryAfterSeconds, 1);
});

test("one second later, one token is back", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  for (let i = 0; i < 3; i++) lim.check("ann");
  c.advance(1000);
  assert.strictEqual(lim.check("ann").allowed, true);
  assert.strictEqual(lim.check("ann").allowed, false);
});

test("a part of a token is kept, so two half seconds make a whole token", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  for (let i = 0; i < 3; i++) lim.check("ann");
  c.advance(500);
  assert.strictEqual(lim.check("ann").allowed, false);   // a refused request must not throw away the half token
  c.advance(500);
  assert.strictEqual(lim.check("ann").allowed, true);
});

test("the bucket never holds more than its capacity, even after a long quiet time", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  lim.check("ann");
  c.advance(60 * 60 * 1000);                              // one hour
  const results = [1, 2, 3, 4].map(() => lim.check("ann").allowed);
  assert.deepStrictEqual(results, [true, true, true, false]);
});

test("every key has its own bucket", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 2, refillPerSecond: 1, now: c.now });
  lim.check("ann"); lim.check("ann");
  assert.strictEqual(lim.check("ann").allowed, false);
  assert.deepStrictEqual(lim.check("ben"), { allowed: true, remaining: 1 });
});

test("remaining is the whole tokens left, rounded down", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 5, refillPerSecond: 1, now: c.now });
  for (let i = 0; i < 5; i++) lim.check("ann");
  c.advance(2500);                                         // 2.5 tokens
  assert.deepStrictEqual(lim.check("ann"), { allowed: true, remaining: 1 });   // 1.5 left, shown as 1
});

test("when the clock does not move, no tokens come back", () => {
  const c = clock(5000);
  const lim = createLimiter({ capacity: 2, refillPerSecond: 100, now: c.now });
  lim.check("ann"); lim.check("ann");
  assert.strictEqual(lim.check("ann").allowed, false);
  assert.strictEqual(lim.check("ann").allowed, false);
});

test("a clock that jumps backwards does not make free tokens", () => {
  const c = clock(10_000);
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  for (let i = 0; i < 3; i++) lim.check("ann");           // empty at 10 s
  c.set(5000);                                             // the clock goes back 5 s
  assert.strictEqual(lim.check("ann").allowed, false);
  c.set(10_500);                                           // only half a second has really passed
  assert.strictEqual(lim.check("ann").allowed, false);
  c.set(11_000);                                           // one second has really passed
  assert.strictEqual(lim.check("ann").allowed, true);
});

test("over a long time the rate is the refill rate, plus the first burst", () => {
  const c = clock();
  const lim = createLimiter({ capacity: 3, refillPerSecond: 1, now: c.now });
  let allowed = 0;
  for (let i = 0; i < 20; i++) {                           // a request every half second for 10 seconds
    if (lim.check("ann").allowed) allowed++;
    c.advance(500);
  }
  assert.strictEqual(allowed, 12);                         // 3 for the burst, then 1 a second for the other 9.5 s, rounded down
});
