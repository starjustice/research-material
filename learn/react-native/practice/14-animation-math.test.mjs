import test from "node:test";
import assert from "node:assert";
import { interpolate, timingValue, makeDiffClamp } from "./14-animation-math.mjs";

test("Task 1 interpolate: one segment", () => {
  assert.strictEqual(interpolate(0.5, [0, 1], [0, 100]), 50);
  assert.strictEqual(interpolate(0, [0, 1], [10, 20]), 10);
  assert.strictEqual(interpolate(1, [0, 1], [10, 20]), 20);
  assert.strictEqual(interpolate(0.25, [0, 1], [0, 360]), 90);
});

test("Task 1 interpolate: several segments", () => {
  assert.strictEqual(interpolate(0.25, [0, 0.5, 1], [0, 100, 100]), 50);
  assert.strictEqual(interpolate(0.75, [0, 0.5, 1], [0, 100, 100]), 100);
  assert.strictEqual(interpolate(75, [0, 50, 100], [1, 0.5, 0]), 0.25);
});

test("Task 1 interpolate: extend is the default", () => {
  assert.strictEqual(interpolate(2, [0, 1], [0, 100]), 200);
  assert.strictEqual(interpolate(-1, [0, 1], [0, 100]), -100);
  assert.strictEqual(interpolate(3, [0, 1, 2], [0, 10, 30]), 50, "the last segment is extended");
});

test("Task 1 interpolate: clamp", () => {
  assert.strictEqual(interpolate(2, [0, 1], [0, 100], { extrapolate: "clamp" }), 100);
  assert.strictEqual(interpolate(-1, [0, 1], [0, 100], { extrapolate: "clamp" }), 0);
  assert.strictEqual(interpolate(2, [0, 1], [0, 100], { extrapolateRight: "clamp" }), 100);
  assert.strictEqual(interpolate(-1, [0, 1], [0, 100], { extrapolateRight: "clamp" }), -100, "left still extends");
  assert.strictEqual(interpolate(-1, [0, 1], [0, 100], { extrapolate: "clamp", extrapolateLeft: "extend" }), -100, "a specific side wins");
});

test("Task 2 timingValue: linear and eased", () => {
  assert.strictEqual(timingValue({ from: 0, to: 100, elapsed: 0, duration: 500 }), 0);
  assert.strictEqual(timingValue({ from: 0, to: 100, elapsed: 250, duration: 500 }), 50);
  assert.strictEqual(timingValue({ from: 0, to: 100, elapsed: 500, duration: 500 }), 100);
  assert.strictEqual(timingValue({ from: 0, to: 100, elapsed: 900, duration: 500 }), 100, "after the end it stays at the end");
  assert.strictEqual(timingValue({ from: 10, to: 0, elapsed: 250, duration: 500 }), 5);
  assert.strictEqual(timingValue({ from: 0, to: 100, elapsed: 250, duration: 500, easing: (t) => t * t }), 25);
});

test("Task 3 makeDiffClamp: header hides on the way down and shows on the way up", () => {
  const header = makeDiffClamp(0, 50, 0);
  assert.strictEqual(header(30), 30);
  assert.strictEqual(header(80), 50, "capped at max");
  assert.strictEqual(header(60), 30, "scrolling up by 20 shows 20 of the header again");
  assert.strictEqual(header(0), 0, "never below min");
  assert.strictEqual(header(10), 10);
});
