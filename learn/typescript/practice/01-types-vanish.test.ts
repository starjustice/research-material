import test from "node:test";
import assert from "node:assert";
import { typecheck } from "./_typecheck.mjs";
import { isUser, parseUser } from "./01-types-vanish.ts";
import type { User } from "./01-types-vanish.ts";

test("the file passes the real TypeScript compiler (strict)", () => {
  const result = typecheck("01-types-vanish.ts");
  assert.deepStrictEqual(result.errors, []);
});

test("parseUser: good JSON gives the user", () => {
  assert.deepStrictEqual(parseUser('{"name":"Ana","age":30}'), { name: "Ana", age: 30 });
});

test("isUser: true for a user, false for things that are not objects", () => {
  assert.strictEqual(isUser({ name: "Ana", age: 30 }), true);
  for (const bad of [null, undefined, 42, "text", true, []]) {
    assert.strictEqual(isUser(bad), false, "should be false for " + JSON.stringify(bad));
  }
});

test("isUser: false for a missing field or a wrong type", () => {
  assert.strictEqual(isUser({ name: "Ana" }), false);
  assert.strictEqual(isUser({ age: 30 }), false);
  assert.strictEqual(isUser({ name: "Ana", age: "30" }), false);
  assert.strictEqual(isUser({ name: 7, age: 30 }), false);
});

test("parseUser: text that is not JSON throws Invalid JSON", () => {
  assert.throws(() => parseUser("{name:"), /Invalid JSON/);
});

test("parseUser: JSON that is not an object throws Expected an object", () => {
  for (const text of ["null", "42", "[]", '"x"']) {
    assert.throws(() => parseUser(text), /Expected an object/, "text was " + text);
  }
});

test("parseUser: a missing field is named in the message", () => {
  assert.throws(() => parseUser('{"age":30}'), /name/);
  assert.throws(() => parseUser('{"name":"Ana"}'), /age/);
});

test("parseUser: a wrong type is named in the message", () => {
  assert.throws(() => parseUser('{"name":"Ana","age":"30"}'), /Field "age" must be a number/);
  assert.throws(() => parseUser('{"name":42,"age":30}'), /Field "name" must be a string/);
});

test("a cast does not check anything: the type lies, isUser tells the truth", () => {
  const casted = JSON.parse('{"name":42}') as User; // no error here, at compile time or at run time
  assert.strictEqual(typeof casted.name, "number", "the type says string, the data says number");
  assert.strictEqual(isUser(casted), false);
  assert.throws(() => parseUser('{"name":42}'));
});
