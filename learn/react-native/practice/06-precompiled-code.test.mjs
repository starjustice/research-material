import test from "node:test";
import assert from "node:assert";
import { compileToCache, runFromSource, runFromCache } from "./06-precompiled-code.mjs";

// Every test uses its own source text. The engine remembers code it has already seen
// in this process, so a repeated source can hide what we want to check.

test("compileToCache returns the compiled code as bytes", () => {
  const { cachedData } = compileToCache("function add(a, b) { return a + b; } add(20, 22);");
  assert.ok(Buffer.isBuffer(cachedData));
  assert.ok(cachedData.length > 0);
});

test("runFromSource gives the answer", () => {
  assert.deepStrictEqual(runFromSource("[1, 2, 3].map(x => x * 2).join('-');"), {
    result: "2-4-6",
    rejected: false,
  });
});

test("the answer from the cache is the same as from the source", () => {
  const source = "function total(list) { let s = 0; for (const n of list) s += n; return s; } total([5, 6, 7]);";
  const { cachedData } = compileToCache(source);
  assert.strictEqual(runFromCache(source, cachedData).result, runFromSource(source).result);
  assert.strictEqual(runFromCache(source, cachedData).result, 18);
});

test("a cache made for the same source is accepted", () => {
  const source = "const word = 'hermes'; word.toUpperCase();";
  const { cachedData } = compileToCache(source);
  const run = runFromCache(source, cachedData);
  assert.strictEqual(run.rejected, false);
  assert.strictEqual(run.result, "HERMES");
});

test("a cache made for other code is rejected, and the right answer still comes out", () => {
  const { cachedData } = compileToCache("function f() { return 1; } f() + 100;");
  for (let i = 0; i < 20; i++) {
    // a new source each time, and a different length each time
    const source = "var x = " + "1+".repeat(i + 2).slice(0, -1) + "; x * " + (i + 3) + ";";
    const run = runFromCache(source, cachedData);
    assert.strictEqual(run.rejected, true, "round " + i);
    assert.strictEqual(run.result, (i + 2) * (i + 3));
  }
});

test("bytes that are not compiled code are rejected", () => {
  const junk = Buffer.alloc(32, 7);
  const run = runFromCache("var unique = 'junk test'; unique.length;", junk);
  assert.strictEqual(run.rejected, true);
  assert.strictEqual(run.result, 9);
});
