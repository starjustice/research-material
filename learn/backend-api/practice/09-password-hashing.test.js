const test = require("node:test");
const assert = require("node:assert");
const { hashPassword, verifyPassword, needsRehash, verdict } = require("./09-password-hashing");

// ---- Task 1: hashPassword ----

test("hashPassword: it is async (it returns a Promise)", () => {
  const result = hashPassword("hunter2");
  assert.ok(result instanceof Promise, "use the async derive(), so the server is not blocked");
  return result.then((stored) => assert.strictEqual(typeof stored, "string", "return the stored string"));
});

test("hashPassword: the stored string has six parts and starts with scrypt", async () => {
  const stored = await hashPassword("hunter2");
  const parts = stored.split("$");
  assert.strictEqual(parts.length, 6);
  assert.strictEqual(parts[0], "scrypt");
  assert.deepStrictEqual(parts.slice(1, 4), ["16384", "8", "1"]);
  assert.match(parts[4], /^[A-Za-z0-9_-]+$/, "salt is base64url");
  assert.match(parts[5], /^[A-Za-z0-9_-]+$/, "hash is base64url");
  assert.strictEqual(Buffer.from(parts[4], "base64url").length, 16, "salt is 16 bytes");
  assert.strictEqual(Buffer.from(parts[5], "base64url").length, 32, "hash is 32 bytes");
});

test("hashPassword: the password is not in the stored string", async () => {
  const stored = await hashPassword("hunter2");
  assert.ok(!stored.includes("hunter2"));
});

test("hashPassword: the same password gives a different string each time (a new salt)", async () => {
  const a = await hashPassword("hunter2");
  const b = await hashPassword("hunter2");
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(a.split("$")[4], b.split("$")[4], "the salts must differ");
});

test("hashPassword: the cost you ask for is saved in the string", async () => {
  const stored = await hashPassword("hunter2", { N: 1024, r: 8, p: 1 });
  assert.deepStrictEqual(stored.split("$").slice(1, 4), ["1024", "8", "1"]);
});

// ---- Task 2: verifyPassword ----

test("verifyPassword: the right password is true, a wrong one is false", async () => {
  const stored = await hashPassword("hunter2");
  assert.strictEqual(await verifyPassword("hunter2", stored), true);
  assert.strictEqual(await verifyPassword("hunter3", stored), false);
  assert.strictEqual(await verifyPassword("", stored), false);
  assert.strictEqual(await verifyPassword("HUNTER2", stored), false);
});

test("verifyPassword: two hashes of the same password both verify (each has its own salt)", async () => {
  const a = await hashPassword("hunter2");
  const b = await hashPassword("hunter2");
  assert.strictEqual(await verifyPassword("hunter2", a), true);
  assert.strictEqual(await verifyPassword("hunter2", b), true);
});

test("verifyPassword: it uses the cost saved in the string, not today's default", async () => {
  const old = await hashPassword("hunter2", { N: 1024, r: 8, p: 1 });
  assert.strictEqual(await verifyPassword("hunter2", old), true);
  assert.strictEqual(await verifyPassword("nope", old), false);
});

test("verifyPassword: unicode and long passwords work", async () => {
  const pw = "pässwörd-密码-" + "x".repeat(200);
  const stored = await hashPassword(pw);
  assert.strictEqual(await verifyPassword(pw, stored), true);
  assert.strictEqual(await verifyPassword(pw + "y", stored), false);
});

test("verifyPassword: a broken stored string gives false and never throws", async () => {
  const good = await hashPassword("hunter2");
  const parts = good.split("$");
  const broken = [
    "", "abc", null, undefined, 42, {},
    "scrypt$1$2",
    "bcrypt$16384$8$1$" + parts[4] + "$" + parts[5],
    ["scrypt", "x", "8", "1", parts[4], parts[5]].join("$"),
    ["scrypt", "0", "8", "1", parts[4], parts[5]].join("$"),
    ["scrypt", "16384", "8", "1", parts[4], ""].join("$"),
    ["scrypt", "16384", "8", "1", parts[4], parts[5].slice(0, 10)].join("$"),
  ];
  for (const stored of broken) {
    assert.strictEqual(await verifyPassword("hunter2", stored), false, "input: " + String(stored));
  }
});

test("verifyPassword: a plain password that is not a string gives false", async () => {
  const stored = await hashPassword("hunter2");
  assert.strictEqual(await verifyPassword(undefined, stored), false);
  assert.strictEqual(await verifyPassword(12345, stored), false);
});

test("verifyPassword: a changed hash part is rejected", async () => {
  const stored = await hashPassword("hunter2");
  const parts = stored.split("$");
  const flipped = parts[5][0] === "A" ? "B" : "A";
  parts[5] = flipped + parts[5].slice(1);
  assert.strictEqual(await verifyPassword("hunter2", parts.join("$")), false);
});

// ---- Task 3: needsRehash ----

test("needsRehash: a lower cost needs a new hash", async () => {
  const old = await hashPassword("hunter2", { N: 1024, r: 8, p: 1 });
  assert.strictEqual(needsRehash(old), true);
});

test("needsRehash: the same cost does not", async () => {
  const fresh = await hashPassword("hunter2");
  assert.strictEqual(needsRehash(fresh), false);
});

test("needsRehash: a higher cost does not", async () => {
  const strong = await hashPassword("hunter2", { N: 32768, r: 8, p: 1 });
  assert.strictEqual(needsRehash(strong), false);
});

test("needsRehash: it compares with the cost you want", async () => {
  const fresh = await hashPassword("hunter2");
  assert.strictEqual(needsRehash(fresh, { N: 32768, r: 8, p: 1 }), true);
  assert.strictEqual(needsRehash(fresh, { N: 16384, r: 8, p: 2 }), true);
});

test("needsRehash: a string it cannot read needs a new hash", () => {
  assert.strictEqual(needsRehash("abc"), true);
  assert.strictEqual(needsRehash(null), true);
  assert.strictEqual(needsRehash("5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"), true);
});

// ---- Task 4: verdict ----

const expected = {
  plainText: "bad",
  encrypted: "bad",
  md5WithSalt: "bad",
  sha256NoSalt: "bad",
  bcryptCost12: "good",
  scryptSalted: "good",
  argon2id: "good",
};

for (const key of Object.keys(expected)) {
  test(`verdict: ${key}`, () => {
    assert.ok(verdict[key], "write \"good\" or \"bad\" first");
    assert.strictEqual(verdict[key], expected[key], "Is it one-way? Is it salted? Is it slow on purpose?");
  });
}
