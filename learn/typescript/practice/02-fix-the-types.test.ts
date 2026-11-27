import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore: the helper is plain JavaScript
import { typecheck } from "./_typecheck.mjs";
import { makePoint, addPoints, shout, cart, addItem, nextStatus, setStatus, status, config, applied, applyMode, firstWord } from "./02-fix-the-types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const exercise = path.join(here, "02-fix-the-types.ts");

// Every test starts here: the file must compile under strict mode.
let compiled: { ok: boolean; errors: string[] } | undefined;
function mustCompile() {
  compiled ??= typecheck(exercise);
  assert.ok(compiled.ok, "The file does not compile yet:\n" + compiled.errors.join("\n"));
}

// Write a small file that uses your exports, check it with the compiler, then delete it.
// Lines with // @ts-expect-error MUST be errors. Lines without it MUST compile.
function mustCheck(lines: string[]) {
  const file = path.join(here, "02-fix-the-types.check.ts");
  const source = 'import { makePoint, shout, cart, setStatus, nextStatus, applyMode, firstWord, type Point } from "./02-fix-the-types.ts";\n' + lines.join("\n") + "\n";
  fs.writeFileSync(file, source);
  try {
    const result = typecheck(file);
    assert.ok(result.ok, "The compiler disagrees:\n" + result.errors.join("\n"));
  } finally {
    fs.rmSync(file, { force: true });
  }
}

test("1 the file compiles in strict mode", () => {
  mustCompile();
});

test("2 points: makePoint and addPoints work", () => {
  mustCompile();
  assert.deepStrictEqual(makePoint(1, 2), [1, 2]);
  assert.deepStrictEqual(addPoints([1, 2], [10, 20]), [11, 22]);
});

test("3 a Point is a tuple of exactly two numbers", () => {
  mustCompile();
  mustCheck([
    "const ok: Point = [1, 2];",
    "const [x, y]: Point = makePoint(1, 2);",
    "// @ts-expect-error a point needs two numbers",
    "const tooShort: Point = [1];",
    "// @ts-expect-error a point has no third number",
    "makePoint(1, 2)[2];",
    "void [ok, x, y, tooShort];",
  ]);
});

test("4 shout works and only takes text", () => {
  mustCompile();
  assert.strictEqual(shout("hi"), "HI!");
  mustCheck(["shout('hi');", "// @ts-expect-error a number is not text", "shout(42);"]);
});

test("5 cart: addItem fills the cart", () => {
  mustCompile();
  addItem("tea", 3);
  addItem("cake", 5);
  assert.deepStrictEqual(cart.items, [{ name: "tea", price: 3 }, { name: "cake", price: 5 }]);
  assert.strictEqual(cart.total, 8);
});

test("6 the cart only holds items, not anything", () => {
  mustCompile();
  mustCheck([
    "cart.items.push({ name: 'pen', price: 1 });",
    "// @ts-expect-error a number is not an item",
    "cart.items.push(5);",
  ]);
});

test("7 status: nextStatus and setStatus work", () => {
  mustCompile();
  assert.strictEqual(nextStatus("open"), "closed");
  assert.strictEqual(nextStatus("closed"), "open");
  setStatus("closed");
  assert.strictEqual(status, "closed");
});

test("8 status is only open or closed", () => {
  mustCompile();
  mustCheck([
    "setStatus('open');",
    "nextStatus('closed');",
    "// @ts-expect-error done is not a status",
    "setStatus('done');",
  ]);
});

test("9 config: the mode keeps its exact text", () => {
  mustCompile();
  assert.strictEqual(applied, "mode:dark");
  assert.strictEqual(config.mode, "dark");
  assert.strictEqual(config.retries, 3);
  assert.strictEqual(applyMode("light"), "mode:light");
  mustCheck(["// @ts-expect-error blue is not a mode", "applyMode('blue');"]);
});

test("10 firstWord handles undefined and still takes undefined", () => {
  mustCompile();
  assert.strictEqual(firstWord(undefined), "");
  assert.strictEqual(firstWord(""), "");
  assert.strictEqual(firstWord("hello world"), "hello");
  mustCheck([
    "const a: string = firstWord(undefined);",
    "const b: string = firstWord('x y');",
    "// @ts-expect-error the result is a string, not a number",
    "const c: number = firstWord('x');",
    "void [a, b, c];",
  ]);
});

test("11 no any in your code", () => {
  mustCompile();
  const code = fs.readFileSync(exercise, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/\bany\b/.test(code), "Do not use any. It switches the checking off.");
});
