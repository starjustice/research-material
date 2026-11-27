import test from "node:test";
import assert from "node:assert";
import { toNativeStyle, flattenStyle } from "./02-web-to-native-style.mjs";

test("toNativeStyle: names become camelCase and px becomes a number", () => {
  assert.deepStrictEqual(toNativeStyle("margin-top: 8px; background-color: #fff"), {
    marginTop: 8,
    backgroundColor: "#fff",
  });
});

test("toNativeStyle: plain numbers become numbers", () => {
  assert.deepStrictEqual(toNativeStyle("flex: 1; opacity: .5; border-radius: 12px"), {
    flex: 1,
    opacity: 0.5,
    borderRadius: 12,
  });
});

test("toNativeStyle: percentages and words stay strings", () => {
  assert.deepStrictEqual(toNativeStyle("width: 50%; font-weight: bold; flex-direction: row"), {
    width: "50%",
    fontWeight: "bold",
    flexDirection: "row",
  });
});

test("toNativeStyle: negative numbers work", () => {
  assert.deepStrictEqual(toNativeStyle("margin-left: -4px"), { marginLeft: -4 });
});

test("toNativeStyle: extra spaces, a last semicolon and empty text", () => {
  assert.deepStrictEqual(toNativeStyle("  padding : 16px ;  color:red ; "), { padding: 16, color: "red" });
  assert.deepStrictEqual(toNativeStyle(""), {});
});

test("flattenStyle: a later style wins", () => {
  assert.deepStrictEqual(flattenStyle([{ color: "red", fontSize: 12 }, { color: "blue" }]), {
    color: "blue",
    fontSize: 12,
  });
});

test("flattenStyle: false, null and undefined are skipped", () => {
  const isActive = false;
  assert.deepStrictEqual(flattenStyle([{ padding: 8 }, isActive && { padding: 16 }, null, undefined]), { padding: 8 });
});

test("flattenStyle: arrays can be nested", () => {
  assert.deepStrictEqual(flattenStyle([{ a: 1 }, [{ b: 2 }, [{ a: 3 }]]]), { a: 3, b: 2 });
});

test("flattenStyle: one object, and nothing", () => {
  assert.deepStrictEqual(flattenStyle({ margin: 4 }), { margin: 4 });
  assert.deepStrictEqual(flattenStyle(undefined), {});
});

test("flattenStyle: does not change the styles it was given", () => {
  const base = { color: "red" };
  flattenStyle([base, { color: "blue" }]);
  assert.deepStrictEqual(base, { color: "red" });
});
