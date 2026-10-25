import test from "node:test";
import assert from "node:assert";
import { isOtp, onlyDigits, formatThousands, parseDeepLink, isStrongPassword, maskCard, extractHashtags } from "./17-regex.mjs";

test("Task 1 isOtp: exactly six digits", () => {
  assert.strictEqual(isOtp("123456"), true);
  assert.strictEqual(isOtp("12345"), false, "too short");
  assert.strictEqual(isOtp("1234567"), false, "too long. Did you anchor with ^ and $?");
  assert.strictEqual(isOtp("12a456"), false);
  assert.strictEqual(isOtp("123456\n"), false, "a trailing newline is not a digit");
  assert.strictEqual(isOtp(""), false);
});

test("Task 2 onlyDigits: keep digits only", () => {
  assert.strictEqual(onlyDigits("0812-345 (67)"), "081234567");
  assert.strictEqual(onlyDigits("abc"), "");
  assert.strictEqual(onlyDigits("1a2b3c"), "123", "replace every match, not only the first");
});

test("Task 3 formatThousands: groups of three from the right", () => {
  assert.strictEqual(formatThousands(1234567), "1.234.567");
  assert.strictEqual(formatThousands(999), "999");
  assert.strictEqual(formatThousands(1000), "1.000");
  assert.strictEqual(formatThousands(100000), "100.000");
  assert.strictEqual(formatThousands(1234567, ","), "1,234,567");
  assert.strictEqual(formatThousands(0), "0");
});

test("Task 4 parseDeepLink: named groups", () => {
  assert.deepStrictEqual(parseDeepLink("myapp://product/123?ref=abc"), { screen: "product", id: "123", ref: "abc" });
  assert.deepStrictEqual(parseDeepLink("myapp://cart/9"), { screen: "cart", id: "9", ref: undefined });
  assert.strictEqual(parseDeepLink("https://example.com/product/123"), null, "wrong scheme");
  assert.strictEqual(parseDeepLink("myapp://product/abc"), null, "id must be digits");
  assert.strictEqual(parseDeepLink(""), null);
});

test("Task 5 isStrongPassword: lookaheads", () => {
  assert.strictEqual(isStrongPassword("Abcdef12"), true);
  assert.strictEqual(isStrongPassword("abcdef12"), false, "no uppercase");
  assert.strictEqual(isStrongPassword("ABCDEF12"), false, "no lowercase");
  assert.strictEqual(isStrongPassword("Abcdefgh"), false, "no digit");
  assert.strictEqual(isStrongPassword("Abc12"), false, "too short");
  assert.strictEqual(isStrongPassword("Abc def 12 and more"), true, "spaces are allowed");
});

test("Task 6 maskCard: keep first and last four", () => {
  assert.strictEqual(maskCard("4111111111111111"), "4111 **** **** 1111");
  assert.strictEqual(maskCard("411111111111111"), null, "15 digits");
  assert.strictEqual(maskCard("41111111111111112"), null, "17 digits");
  assert.strictEqual(maskCard("4111 1111 1111 1111"), null, "spaces not allowed");
});

test("Task 7 extractHashtags: find them all", () => {
  assert.deepStrictEqual(extractHashtags("Learning #ReactNative and #regex_2026!"), ["ReactNative", "regex_2026"]);
  assert.deepStrictEqual(extractHashtags("no tags here"), []);
  assert.deepStrictEqual(extractHashtags("#a#b"), ["a", "b"]);
});
