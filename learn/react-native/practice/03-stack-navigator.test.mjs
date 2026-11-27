import test from "node:test";
import assert from "node:assert";
import { createNavigator } from "./03-stack-navigator.mjs";

const names = (nav) => nav.getState().routes.map((r) => r.name);

test("starts with one route and index 0", () => {
  const nav = createNavigator("Home", { tab: "new" });
  assert.deepStrictEqual(nav.getState(), { index: 0, routes: [{ name: "Home", params: { tab: "new" } }] });
  assert.deepStrictEqual(nav.getCurrent(), { name: "Home", params: { tab: "new" } });
});

test("params default to an empty object", () => {
  assert.deepStrictEqual(createNavigator("Home").getCurrent().params, {});
});

test("push always adds a route on top", () => {
  const nav = createNavigator("Home");
  nav.push("Details", { id: 1 });
  nav.push("Details", { id: 2 });
  assert.deepStrictEqual(names(nav), ["Home", "Details", "Details"]);
  assert.strictEqual(nav.getState().index, 2);
  assert.deepStrictEqual(nav.getCurrent().params, { id: 2 });
});

test("navigate pushes when the current route has another name", () => {
  const nav = createNavigator("Home");
  nav.navigate("Details", { id: 1 });
  assert.deepStrictEqual(names(nav), ["Home", "Details"]);
});

test("navigate does nothing when you are already on that route", () => {
  const nav = createNavigator("Home");
  nav.navigate("Details", { id: 1 });
  nav.navigate("Details", { id: 2 });
  assert.deepStrictEqual(names(nav), ["Home", "Details"]);
  assert.deepStrictEqual(nav.getCurrent().params, { id: 1 });
});

test("goBack removes the top route but never the last one", () => {
  const nav = createNavigator("Home");
  nav.push("A");
  nav.goBack();
  assert.deepStrictEqual(names(nav), ["Home"]);
  nav.goBack();
  assert.deepStrictEqual(names(nav), ["Home"]);
  assert.strictEqual(nav.getState().index, 0);
});

test("popTo goes back to the nearest earlier route with that name", () => {
  const nav = createNavigator("Home");
  nav.push("A", { n: 1 });
  nav.push("B");
  nav.push("A", { n: 2 });
  nav.push("C");
  nav.popTo("A");
  assert.deepStrictEqual(names(nav), ["Home", "A", "B", "A"]);
  assert.deepStrictEqual(nav.getCurrent().params, { n: 2 });
});

test("popTo with a name that is not in the stack changes nothing", () => {
  const nav = createNavigator("Home");
  nav.push("A");
  nav.popTo("Missing");
  assert.deepStrictEqual(names(nav), ["Home", "A"]);
});

test("popToTop keeps only the first route", () => {
  const nav = createNavigator("Home");
  nav.push("A");
  nav.push("B");
  nav.popToTop();
  assert.deepStrictEqual(names(nav), ["Home"]);
  assert.strictEqual(nav.getState().index, 0);
});

test("replace swaps the top route", () => {
  const nav = createNavigator("Login");
  nav.replace("Home", { user: "ana" });
  assert.deepStrictEqual(nav.getState(), { index: 0, routes: [{ name: "Home", params: { user: "ana" } }] });
});

test("setParams merges new params into the current route", () => {
  const nav = createNavigator("Details", { id: 1, tab: "info" });
  nav.setParams({ tab: "reviews" });
  assert.deepStrictEqual(nav.getCurrent().params, { id: 1, tab: "reviews" });
});

test("getState gives a copy: changing it does not change the navigator", () => {
  const nav = createNavigator("Home");
  nav.getState().routes.push({ name: "Hack", params: {} });
  assert.deepStrictEqual(names(nav), ["Home"]);
});
