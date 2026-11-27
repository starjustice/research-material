import test from "node:test";
import assert from "node:assert";
import { h, reduceToHost, countHostNodes } from "./01-from-code-to-views.mjs";

const Title = ({ children }) => h("Text", { style: { fontSize: 20 } }, ...children);
const Card = ({ children }) => h("View", { style: { margin: 10 } }, ...children);
const Screen = () => h(Card, {}, h(Title, {}, "Hello"));

test("a host element stays a host element", () => {
  const tree = reduceToHost(h("View", { id: 1 }, h("Text", {}, "Hi")));
  assert.deepStrictEqual(tree, {
    type: "View",
    props: { id: 1 },
    children: [{ type: "Text", props: {}, children: ["Hi"] }],
  });
});

test("a text string is kept as it is", () => {
  assert.strictEqual(reduceToHost("Hello"), "Hello");
});

test("a component is run until only host elements are left", () => {
  const tree = reduceToHost(h(Screen, {}));
  assert.deepStrictEqual(tree, {
    type: "View",
    props: { style: { margin: 10 } },
    children: [{ type: "Text", props: { style: { fontSize: 20 } }, children: ["Hello"] }],
  });
});

test("a component receives its props and its children", () => {
  const Greeting = ({ name, children }) => h("Text", {}, "Hi ", name, ...children);
  const tree = reduceToHost(h(Greeting, { name: "Ana" }, "!"));
  assert.deepStrictEqual(tree.children, ["Hi ", "Ana", "!"]);
});

test("no node in the result is a component", () => {
  const tree = reduceToHost(h(Screen, {}));
  const types = [];
  (function walk(n) {
    if (typeof n === "string") return;
    types.push(typeof n.type);
    n.children.forEach(walk);
  })(tree);
  assert.deepStrictEqual(types, ["string", "string"]);
});

test("countHostNodes counts views, not strings and not components", () => {
  assert.strictEqual(countHostNodes(reduceToHost(h(Screen, {}))), 2);
  assert.strictEqual(countHostNodes("Hello"), 0);
  const list = h("View", {}, h("Text", {}, "a"), h("Text", {}, "b"), h("Text", {}, "c"));
  assert.strictEqual(countHostNodes(reduceToHost(list)), 4);
});
