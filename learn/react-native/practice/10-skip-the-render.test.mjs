import test from "node:test";
import assert from "node:assert";
import { shallowEqual, createMemoComponent, createCallbackCache } from "./10-skip-the-render.mjs";

test("shallowEqual: same values are equal, a different value is not", () => {
  assert.strictEqual(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" }), true);
  assert.strictEqual(shallowEqual({ a: 1 }, { a: 2 }), false);
  assert.strictEqual(shallowEqual({}, {}), true);
});

test("shallowEqual: a different number of keys is not equal", () => {
  assert.strictEqual(shallowEqual({ a: 1 }, { a: 1, b: 2 }), false);
  assert.strictEqual(shallowEqual({ a: 1, b: 2 }, { a: 1 }), false);
  assert.strictEqual(shallowEqual({ a: undefined }, { b: undefined }), false);
});

test("shallowEqual: objects inside are compared by reference, not by content", () => {
  const user = { name: "Ana" };
  assert.strictEqual(shallowEqual({ user }, { user }), true);
  assert.strictEqual(shallowEqual({ user: { name: "Ana" } }, { user: { name: "Ana" } }), false);
  assert.strictEqual(shallowEqual({ n: NaN }, { n: NaN }), true, "Object.is says NaN is NaN");
});

test("memo: the same props do not render again", () => {
  const Row = createMemoComponent(({ title }) => "Row " + title);
  const props = { title: "A" };
  Row.render(props);
  Row.render(props);
  assert.strictEqual(Row.renderCount, 1);
});

test("memo: a new props object with the same values does not render again", () => {
  const Row = createMemoComponent(({ title, count }) => `${title}:${count}`);
  Row.render({ title: "A", count: 1 });
  Row.render({ title: "A", count: 1 });
  assert.strictEqual(Row.renderCount, 1);
});

test("memo: a new object literal as a prop defeats it", () => {
  const Row = createMemoComponent(({ style }) => style.color);
  Row.render({ style: { color: "red" } });
  Row.render({ style: { color: "red" } });
  assert.strictEqual(Row.renderCount, 2, "same content, new reference, so it renders again");
});

test("memo: an inline function as a prop defeats it", () => {
  const Row = createMemoComponent(({ onPress }) => typeof onPress);
  Row.render({ onPress: () => {} });
  Row.render({ onPress: () => {} });
  assert.strictEqual(Row.renderCount, 2);
});

test("memo: a changed prop renders again and gives the new output", () => {
  const Row = createMemoComponent(({ title }) => "Row " + title);
  assert.strictEqual(Row.render({ title: "A" }), "Row A");
  assert.strictEqual(Row.render({ title: "B" }), "Row B");
  assert.strictEqual(Row.renderCount, 2);
});

test("callback cache: the same deps give the same function", () => {
  const cache = createCallbackCache();
  const first = cache.get(() => "one", [1, "a"]);
  const second = cache.get(() => "two", [1, "a"]);
  assert.strictEqual(second, first);
  assert.strictEqual(second(), "one", "the first function is kept");
});

test("callback cache: changed deps give a new function", () => {
  const cache = createCallbackCache();
  const first = cache.get(() => "one", [1]);
  const second = cache.get(() => "two", [2]);
  assert.notStrictEqual(second, first);
  assert.strictEqual(second(), "two");
  assert.notStrictEqual(cache.get(() => "x", [2, 3]), second, "a different length is a change");
});

test("memo and callback cache together: five parent renders, one child render", () => {
  const Row = createMemoComponent(({ title, onPress }) => title + typeof onPress);
  const cache = createCallbackCache();
  const style = { color: "red" };
  for (let i = 0; i < 5; i++) {
    const onPress = cache.get(() => {}, []);
    Row.render({ title: "A", onPress, style });
  }
  assert.strictEqual(Row.renderCount, 1);
});
