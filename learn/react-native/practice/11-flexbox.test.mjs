import test from "node:test";
import assert from "node:assert";
import { layoutOf } from "./_yoga.mjs";
import { BOX, centerOne, spreadRow, appShell, twoEqualColumns, wrapGrid, cornerBadge } from "./11-flexbox.mjs";

const pos = (r) => ({ x: r.x, y: r.y, w: r.w, h: r.h });

test("Task 1 centerOne: the box is in the exact middle", () => {
  const [box] = layoutOf(centerOne(), [BOX]);
  assert.deepStrictEqual(pos(box), { x: 125, y: 275, w: 50, h: 50 }, "Centering needs one property for each axis.");
});

test("Task 2 spreadRow: three boxes in a row, spread to the edges", () => {
  const boxes = layoutOf(spreadRow(), [BOX, BOX, BOX]);
  assert.deepStrictEqual(boxes.map((b) => [b.x, b.y]), [[0, 0], [125, 0], [250, 0]], "Is the direction a row? Which property spreads along the main axis?");
});

test("Task 3 appShell: content takes the rest of the screen", () => {
  const { header, content, footer } = appShell();
  const [h, c, f] = layoutOf({}, [header, content, footer]);
  assert.deepStrictEqual([h.y, h.h], [0, 60], "The header must be 60 tall.");
  assert.deepStrictEqual([c.y, c.h], [60, 490], "The content must grow into the space that is left.");
  assert.deepStrictEqual([f.y, f.h], [550, 50], "The footer must be 50 tall and at the bottom.");
});

test("Task 4 twoEqualColumns: two children share the width", () => {
  const { container, child } = twoEqualColumns();
  assert.strictEqual(child.width, undefined, "Do not give the children a fixed width.");
  const boxes = layoutOf(container, [child, child]);
  assert.deepStrictEqual(boxes.map((b) => [b.x, b.w, b.h]), [[0, 150, 50], [150, 150, 50]]);
});

test("Task 5 wrapGrid: five boxes wrap into rows of three", () => {
  const big = { width: 100, height: 100 };
  const boxes = layoutOf(wrapGrid(), [big, big, big, big, big]);
  assert.deepStrictEqual(boxes.map((b) => [b.x, b.y]), [[0, 0], [100, 0], [200, 0], [0, 100], [100, 100]]);
});

test("Task 6 cornerBadge: the badge sits in the top right corner and pushes nothing", () => {
  const badge = cornerBadge();
  const [b, neighbour] = layoutOf({}, [badge, { height: 50 }]);
  assert.deepStrictEqual(pos(b), { x: 280, y: 0, w: 20, h: 20 }, "The badge needs a size and a position.");
  assert.strictEqual(neighbour.y, 0, "An absolute child must not take space in the column.");
});
