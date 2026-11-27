import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore the helper is a plain .mjs file
import { typecheck } from "./_typecheck.mjs";
import {
  area,
  assertNever,
  describe,
  formatId,
  hasName,
  labelOf,
  parseAge,
  unwrap,
  type Shape,
} from "./04-narrow-it.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

// Writes a small .ts file next to the exercise, type checks it, and always removes it.
function checkTemp(name: string, code: string) {
  const file = path.join(here, name);
  fs.writeFileSync(file, code);
  try {
    return typecheck(file);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

test("the file compiles under strict mode", () => {
  const result = typecheck("04-narrow-it.ts");
  assert.deepStrictEqual(result.errors, []);
});

test("area: circle, square and rectangle", () => {
  assert.strictEqual(area({ kind: "square", side: 3 }), 9);
  assert.strictEqual(area({ kind: "rectangle", width: 2, height: 5 }), 10);
  assert.ok(Math.abs(area({ kind: "circle", radius: 1 }) - Math.PI) < 1e-9);
});

test("area: an unknown kind throws at run time", () => {
  const bad = { kind: "hexagon", side: 2 } as unknown as Shape;
  assert.throws(() => area(bad), /Unexpected value: \{"kind":"hexagon","side":2\}/);
});

test("assertNever always throws with the value as JSON", () => {
  assert.throws(() => assertNever("x" as never), /^Error: Unexpected value: "x"$/);
});

test("formatId: numbers and strings", () => {
  assert.strictEqual(formatId(42), "#00042");
  assert.strictEqual(formatId(123456), "#123456");
  assert.strictEqual(formatId(" ab7 "), "AB7");
});

test("describe: null, undefined, empty text, text and lists", () => {
  assert.strictEqual(describe(null), "nothing");
  assert.strictEqual(describe(undefined), "nothing");
  assert.strictEqual(describe(""), "empty text");
  assert.strictEqual(describe("hi"), "text: hi");
  assert.strictEqual(describe(["a", "b"]), "list of 2");
  assert.strictEqual(describe([]), "list of 0");
});

test("hasName and labelOf use the in operator", () => {
  assert.strictEqual(hasName({ name: "Ana" }), true);
  assert.strictEqual(hasName({ title: "Boss" }), false);
  assert.strictEqual(labelOf({ name: "Ana" }), "Ana");
  assert.strictEqual(labelOf({ title: "Boss" }), "Boss");
});

test("parseAge builds a Result", () => {
  assert.deepStrictEqual(parseAge("42"), { ok: true, value: 42 });
  assert.deepStrictEqual(parseAge("0"), { ok: true, value: 0 });
  assert.deepStrictEqual(parseAge("abc"), { ok: false, error: "not a whole number: abc" });
  assert.deepStrictEqual(parseAge(""), { ok: false, error: "not a whole number: " });
  assert.deepStrictEqual(parseAge("4.5"), { ok: false, error: "not a whole number: 4.5" });
  assert.deepStrictEqual(parseAge("200"), { ok: false, error: "out of range: 200" });
  assert.deepStrictEqual(parseAge("-1"), { ok: false, error: "out of range: -1" });
});

test("unwrap returns the value or throws the error text", () => {
  assert.strictEqual(unwrap({ ok: true, value: 7 }), 7);
  assert.throws(() => unwrap({ ok: false, error: "boom" }), /^Error: boom$/);
});

test("the compiler checks exhaustiveness: a new kind that is not handled is an error", () => {
  const result = checkTemp(
    "_tmp-04-missing.ts",
    `import { assertNever } from "./04-narrow-it.ts";
type Shape2 = { kind: "circle"; radius: number } | { kind: "triangle"; side: number };
export function f(s: Shape2): number {
  switch (s.kind) {
    case "circle":
      return 1;
    default:
      return assertNever(s);
  }
}
`
  );
  assert.strictEqual(result.ok, false);
  const mine = result.errors.filter((e: string) => e.includes("_tmp-04-missing.ts"));
  assert.ok(mine.some((e: string) => /triangle/.test(e) && /never/.test(e)), mine.join("\n"));
  // The only errors must be in the temporary file. Your own file must compile.
  const others = result.errors.filter((e: string) => !e.includes("_tmp-04-missing.ts"));
  assert.deepStrictEqual(others, []);
});

test("the same code compiles when the new kind is handled", () => {
  const result = checkTemp(
    "_tmp-04-handled.ts",
    `import { assertNever } from "./04-narrow-it.ts";
type Shape2 = { kind: "circle"; radius: number } | { kind: "triangle"; side: number };
export function f(s: Shape2): number {
  switch (s.kind) {
    case "circle":
      return 1;
    case "triangle":
      return 2;
    default:
      return assertNever(s);
  }
}
`
  );
  assert.deepStrictEqual(result.errors, []);
});

test("wrong uses are still rejected by the types", () => {
  const result = checkTemp(
    "_tmp-04-wrong.ts",
    `import { area, formatId, hasName, unwrap } from "./04-narrow-it.ts";
// @ts-expect-error a boolean is not a string or a number
formatId(true);
// @ts-expect-error a circle needs a radius
area({ kind: "circle" });
// @ts-expect-error neither a name nor a title
hasName({ age: 3 });
// @ts-expect-error a plain number is not a Result
unwrap(5);
formatId(1);
area({ kind: "square", side: 2 });
`
  );
  assert.deepStrictEqual(result.errors, []);
});
