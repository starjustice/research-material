const test = require("node:test");
const assert = require("node:assert");
const { toBase62, fromBase62, createShortener } = require("./08-design-a-url-shortener");

// A helper: a code maker that hands out the given codes one by one, and counts the calls.
function codes(...list) {
  let i = 0;
  const next = () => { next.calls++; return list[Math.min(i++, list.length - 1)]; };
  next.calls = 0;
  return next;
}

test("toBase62 uses 0-9, then a-z, then A-Z", () => {
  assert.strictEqual(toBase62(0), "0");
  assert.strictEqual(toBase62(9), "9");
  assert.strictEqual(toBase62(10), "a");
  assert.strictEqual(toBase62(35), "z");
  assert.strictEqual(toBase62(36), "A");
  assert.strictEqual(toBase62(61), "Z");
});

test("toBase62 adds a letter after 62, like 99 to 100 in base 10", () => {
  assert.strictEqual(toBase62(62), "10");
  assert.strictEqual(toBase62(125), "21");
  assert.strictEqual(toBase62(3843), "ZZ");
  assert.strictEqual(toBase62(3844), "100");
});

test("7 letters are enough for 62 to the power of 7 codes", () => {
  assert.strictEqual(toBase62(62 ** 7 - 1), "ZZZZZZZ");
  assert.strictEqual(toBase62(62 ** 7 - 1).length, 7);
});

test("fromBase62 undoes toBase62", () => {
  for (const n of [0, 1, 61, 62, 3844, 12345678, 62 ** 7 - 1]) {
    assert.strictEqual(fromBase62(toBase62(n)), n);
  }
});

test("toBase62 and fromBase62 reject bad input", () => {
  assert.throws(() => toBase62(-1), RangeError);
  assert.throws(() => toBase62(1.5), RangeError);
  assert.throws(() => fromBase62(""), Error);
  assert.throws(() => fromBase62("a-b"), Error);
});

test("create returns the next code, and resolve answers 302 with the long link", () => {
  const s = createShortener({ nextCode: codes("abc") });
  assert.strictEqual(s.create("https://shop.example/1"), "abc");
  assert.deepStrictEqual(s.resolve("abc"), { status: 302, location: "https://shop.example/1" });
});

test("resolve answers 404 for a code that never existed", () => {
  const s = createShortener({ nextCode: codes("abc") });
  assert.deepStrictEqual(s.resolve("nope"), { status: 404 });
});

test("a collision: the second link skips the taken code and never overwrites the first", () => {
  const s = createShortener({ nextCode: codes("a", "a", "b") });
  assert.strictEqual(s.create("https://one.example"), "a");
  assert.strictEqual(s.create("https://two.example"), "b");
  assert.strictEqual(s.resolve("a").location, "https://one.example");
  assert.strictEqual(s.resolve("b").location, "https://two.example");
});

test("it gives up after maxTries codes that are all taken", () => {
  const next = codes("a");
  const s = createShortener({ nextCode: next, maxTries: 3 });
  s.create("https://one.example");          // uses 1 call
  const before = next.calls;
  assert.throws(() => s.create("https://two.example"), /no free code/);
  assert.strictEqual(next.calls - before, 3);
  assert.strictEqual(s.resolve("a").location, "https://one.example");
});

test("a custom alias is used as the code", () => {
  const s = createShortener({ nextCode: codes("abc") });
  assert.strictEqual(s.create("https://shop.example/sale", { alias: "sale" }), "sale");
  assert.strictEqual(s.resolve("sale").location, "https://shop.example/sale");
});

test("a taken alias throws and does not overwrite", () => {
  const s = createShortener({ nextCode: codes("abc") });
  s.create("https://ann.example", { alias: "sale" });
  assert.throws(() => s.create("https://ben.example", { alias: "sale" }), /alias taken/);
  assert.strictEqual(s.resolve("sale").location, "https://ann.example");
});

test("the counter skips a code that someone already took as an alias", () => {
  let n = 11;                                         // 11 is "b"
  const s = createShortener({ nextCode: () => toBase62(n++) });
  s.create("https://ann.example", { alias: "b" });
  assert.strictEqual(s.create("https://ben.example"), "c");   // "b" is taken, so the counter moves on to 12
  assert.strictEqual(s.resolve("b").location, "https://ann.example");
});

test("expiry uses the injected clock: 302 before the end, 410 at the end", () => {
  let t = 1000;
  const s = createShortener({ nextCode: codes("abc"), now: () => t });
  s.create("https://shop.example/1", { ttlSeconds: 60 });
  t = 1000 + 59_999;
  assert.strictEqual(s.resolve("abc").status, 302);
  t = 1000 + 60_000;
  assert.deepStrictEqual(s.resolve("abc"), { status: 410 });
});

test("an expired code stays taken, so nobody else can reuse it", () => {
  let t = 0;
  const s = createShortener({ nextCode: codes("abc"), now: () => t });
  s.create("https://shop.example/1", { alias: "promo", ttlSeconds: 1 });
  t = 5000;
  assert.strictEqual(s.resolve("promo").status, 410);
  assert.throws(() => s.create("https://other.example", { alias: "promo" }), /alias taken/);
});

test("size counts the stored codes, and the same long link twice gets two codes", () => {
  const s = createShortener({ nextCode: codes("a", "b") });
  assert.strictEqual(s.size(), 0);
  const first = s.create("https://same.example");
  const second = s.create("https://same.example");
  assert.notStrictEqual(first, second);
  assert.strictEqual(s.size(), 2);
});
