// Lesson 02: fix the types. This file has 6 small problems.
// Run the test: node --test 02-fix-the-types.test.ts
// The test runs the real TypeScript compiler (strict mode) on this file, so it must compile.
// Change the types, and a little code if you must. Do not use `any`.

// Problem 1: a point is exactly two numbers, x then y. Fix the type so a third number is an error.
export type Point = number[];
export function makePoint(x: number, y: number): Point {
  return [x, y];
}
export function addPoints(a: Point, b: Point): Point {
  return [a[0] + b[0], a[1] + b[1]];
}

// Problem 2: the compiler cannot work out the type of `text`.
export function shout(text) {
  return text.toUpperCase() + "!";
}

// Problem 3: an empty array in an object has a type that holds nothing.
export const cart = { items: [], total: 0 };
export function addItem(name: string, price: number) {
  cart.items.push({ name, price });
  cart.total += price;
}

// Problem 4: a status is only "open" or "closed". Any other text must be an error.
export type Status = string;
export let status: Status = "open";
export function setStatus(next: Status) {
  status = next;
}
export function nextStatus(current: Status): Status {
  return current === "open" ? "closed" : "open";
}

// Problem 5: applyMode accepts only "dark" or "light". The config value is widened to string.
export const config = { mode: "dark", retries: 3 };
export function applyMode(mode: "dark" | "light") {
  return `mode:${mode}`;
}
export const applied = applyMode(config.mode);

// Problem 6: `text` can be undefined. Return "" in that case, and the first word otherwise.
export function firstWord(text: string | undefined): string {
  return text.split(" ")[0];
}
