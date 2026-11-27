import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { typecheck } from "./_typecheck.mjs";
import { describeUser, describeAdmin, formatId, distance, swap, toMoney, lock } from "./03-model-the-shapes.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const exercise = path.join(here, "03-model-the-shapes.ts");

// Write a small .ts file next to the exercise, run the real compiler on it, then delete it.
// A line under "// @ts-expect-error" MUST be an error. If it is not, tsc says so and the check fails.
let counter = 0;
function checkSnippet(code: string) {
  const file = path.join(here, `_tmp-03-${process.pid}-${counter++}.ts`);
  const header = 'import type { User, Admin, Id, Point, Pair, Formatter, Config, ReadOnlyCopy } from "./03-model-the-shapes.ts";\n';
  fs.writeFileSync(file, header + code);
  try {
    return typecheck(file);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function assertCompiles(code: string) {
  const result = checkSnippet(code);
  assert.ok(result.ok, "the compiler said:\n" + result.errors.join("\n"));
}

test("the exercise file compiles in strict mode and no placeholder is left", () => {
  const result = typecheck(exercise);
  assert.ok(result.ok, "the compiler said:\n" + result.errors.join("\n"));
  const source = fs.readFileSync(exercise, "utf8");
  assert.doesNotMatch(source, /your code here/, 'replace every "your code here" with your own code');
});

test("Admin extends User, and Id is a type alias", () => {
  const source = fs.readFileSync(exercise, "utf8");
  assert.match(source, /interface\s+Admin\s+extends\s+User/, "write: interface Admin extends User");
  assert.match(source, /type\s+Id\s*=/, "an Id has to be a type alias");
  assert.doesNotMatch(source, /interface\s+Id\b/, "an interface cannot be a union");
});

test("User and Admin: good values pass, bad values fail", () => {
  assertCompiles(`
    const a: User = { id: "u1", name: "Ana" };
    const b: User = { id: "u1", name: "Ana", email: "ana@x.com" };
    const admin: Admin = { id: "a1", name: "Bo", permissions: ["read"] };
    const asUser: User = admin;
    // @ts-expect-error name is missing
    const noName: User = { id: "u1" };
    // @ts-expect-error an Admin needs permissions
    const noPermissions: Admin = { id: "a1", name: "Bo" };
    // @ts-expect-error the id is a string
    const badId: User = { id: 1, name: "Ana" };
  `);
});

test("Id takes a string or a number, nothing else", () => {
  assertCompiles(`
    const a: Id = "abc";
    const b: Id = 42;
    // @ts-expect-error a boolean is not an Id
    const c: Id = true;
    // @ts-expect-error null is not an Id
    const d: Id = null;
  `);
});

test("Point and Pair", () => {
  assertCompiles(`
    const p: Point = { x: 1, y: 2 };
    const pair: Pair = ["a", 1];
    const first: string = pair[0];
    const second: number = pair[1];
    // @ts-expect-error y is missing
    const half: Point = { x: 1 };
    // @ts-expect-error a tuple has an order: string first
    const wrongOrder: Pair = [1, "a"];
    // @ts-expect-error a tuple has a fixed length
    const tooLong: Pair = ["a", 1, 2];
  `);
});

test("Formatter takes a number and gives back a string", () => {
  assertCompiles(`
    const ok: Formatter = (n) => String(n);
    const text: string = ok(5);
    // @ts-expect-error it takes a number, not text
    ok("five");
    // @ts-expect-error it must return a string
    const wrong: Formatter = (n) => n;
  `);
});

test("Config: two blocks merge into one", () => {
  assertCompiles(`
    const ok: Config = { host: "localhost", port: 5432 };
    // @ts-expect-error port is missing, so the second block was merged in
    const noPort: Config = { host: "localhost" };
    // @ts-expect-error host is missing, so the first block was merged in
    const noHost: Config = { port: 5432 };
  `);
});

test("ReadOnlyCopy keeps the keys and makes them readonly", () => {
  assertCompiles(`
    const frozen: ReadOnlyCopy<Point> = { x: 1, y: 2 };
    const x: number = frozen.x;
    // @ts-expect-error the property is readonly
    frozen.x = 5;
    // @ts-expect-error the key z does not exist on Point
    frozen.z;
  `);
});

test("describeUser and describeAdmin", () => {
  assert.strictEqual(describeUser({ id: "1", name: "Ana" }), "Ana");
  assert.strictEqual(describeUser({ id: "1", name: "Ana", email: "ana@x.com" }), "Ana (ana@x.com)");
  assert.strictEqual(
    describeAdmin({ id: "2", name: "Bo", permissions: ["read", "write"] }),
    "Bo [read, write]"
  );
  assert.strictEqual(
    describeAdmin({ id: "2", name: "Bo", email: "bo@x.com", permissions: [] }),
    "Bo (bo@x.com) []"
  );
});

test("formatId: a string stays, a number gets a #", () => {
  assert.strictEqual(formatId("abc"), "abc");
  assert.strictEqual(formatId(7), "#7");
  assert.strictEqual(formatId(0), "#0");
});

test("distance and swap", () => {
  assert.strictEqual(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.strictEqual(distance({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
  assert.deepStrictEqual(swap(["a", 1]), [1, "a"]);
});

test("toMoney and lock", () => {
  assert.strictEqual(toMoney(5), "$5.00");
  assert.strictEqual(toMoney(2.5), "$2.50");
  const locked = lock({ x: 1, y: 2 });
  assert.ok(Object.isFrozen(locked), "the copy must be frozen at run time");
  assert.deepStrictEqual({ ...locked }, { x: 1, y: 2 });
});
