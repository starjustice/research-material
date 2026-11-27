import test from "node:test";
import assert from "node:assert";
import { getItemLayout, windowRange, keyExtractor } from "./04-list-window.mjs";

test("getItemLayout: length, offset and index for fixed heights", () => {
  assert.deepStrictEqual(getItemLayout(0, 50), { length: 50, offset: 0, index: 0 });
  assert.deepStrictEqual(getItemLayout(3, 50), { length: 50, offset: 150, index: 3 });
  assert.deepStrictEqual(getItemLayout(10, 72), { length: 72, offset: 720, index: 10 });
});

const base = { viewportHeight: 800, itemHeight: 50, itemCount: 1000 };

test("windowRange: windowSize 1 at the top shows only the screen", () => {
  assert.deepStrictEqual(windowRange({ ...base, scrollY: 0, windowSize: 1 }), { first: 0, last: 15 });
});

test("windowRange: a half row of scroll adds one more row", () => {
  assert.deepStrictEqual(windowRange({ ...base, scrollY: 25, windowSize: 1 }), { first: 0, last: 16 });
});

test("windowRange: windowSize 21 at the top keeps 10 screens below", () => {
  const range = windowRange({ ...base, scrollY: 0, windowSize: 21 });
  assert.deepStrictEqual(range, { first: 0, last: 175 });
});

test("windowRange: windowSize 21 in the middle keeps 10 screens above and below", () => {
  const range = windowRange({ ...base, scrollY: 10000, windowSize: 21 });
  assert.deepStrictEqual(range, { first: 40, last: 375 });
  assert.strictEqual(range.last - range.first + 1, 336);
});

test("windowRange: windowSize 3 keeps one screen above and one below", () => {
  assert.deepStrictEqual(windowRange({ ...base, scrollY: 2000, windowSize: 3 }), { first: 24, last: 71 });
});

test("windowRange: is cut at the end of the list", () => {
  assert.deepStrictEqual(windowRange({ ...base, scrollY: 49200, windowSize: 1 }), { first: 984, last: 999 });
  assert.strictEqual(windowRange({ ...base, scrollY: 49200, windowSize: 21 }).last, 999);
});

test("windowRange: a short list is all mounted", () => {
  assert.deepStrictEqual(windowRange({ ...base, itemCount: 5, scrollY: 0, windowSize: 21 }), { first: 0, last: 4 });
});

test("windowRange: an empty list has nothing to mount", () => {
  assert.deepStrictEqual(windowRange({ ...base, itemCount: 0, scrollY: 0, windowSize: 21 }), { first: 0, last: -1 });
});

test("keyExtractor: key first, then id, then the index as a string", () => {
  assert.strictEqual(keyExtractor({ key: "a", id: "b" }, 3), "a");
  assert.strictEqual(keyExtractor({ id: "b" }, 3), "b");
  assert.strictEqual(keyExtractor({ name: "x" }, 3), "3");
});

test("keyExtractor: a number id becomes a string, and 0 is a real id", () => {
  assert.strictEqual(keyExtractor({ id: 7 }, 1), "7");
  assert.strictEqual(keyExtractor({ id: 0 }, 5), "0");
});
