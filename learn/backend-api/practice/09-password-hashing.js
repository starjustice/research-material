// Lesson 09: Password hashing. Do the four tasks below, then run:
//   node --test learn/backend-api/practice/09-password-hashing.test.js
const { scrypt, randomBytes, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const scryptAsync = promisify(scrypt);

// Given to you: the slow hash. It runs on helper threads, so it does not block the server.
// It returns a Buffer of keylen bytes.
function derive(plain, salt, { N, r, p }, keylen = 32) {
  return scryptAsync(plain, salt, keylen, { N, r, p, maxmem: 256 * 1024 * 1024 });
}

// The stored string has SIX parts joined with "$":
//   scrypt$N$r$p$salt$hash
//   - salt and hash are base64url text (Buffer.toString("base64url"))
//   - N, r and p are the cost, saved NEXT TO the hash so we can read them back at login
// Example: scrypt$16384$8$1$obLD1OX2BxgpOktcbX6PkA$NMkrDYAyXIYnEJlVHJXzkvgEkZSUlsixxzfHhvGBYYk

// 1. WRITE IT: hashPassword(plain, { N = 16384, r = 8, p = 1 } = {})
//    Make a NEW random salt of 16 bytes every time (randomBytes(16)).
//    Hash with derive(). Return the stored string. It must be async (return a Promise).
//    The plain password must not appear in the stored string.
async function hashPassword(plain, { N = 16384, r = 8, p = 1 } = {}) {
  // TODO
}

// 2. WRITE IT: verifyPassword(plain, stored)  returns true or false
//    Read N, r, p, salt and hash from the stored string. Hash the typed password with
//    the SAME salt and the SAME cost. Compare with timingSafeEqual.
//    It must NEVER throw. Return false for anything that is not a good stored string:
//    not a string, wrong number of parts, not "scrypt", cost that is not a positive integer,
//    a hash that is not exactly 32 bytes, a plain password that is not a string.
//    Do NOT use the stored hash length as the key length. scrypt's short output is only the
//    START of its long output, so a cut hash would match. Always make 32 bytes.
//    timingSafeEqual throws when the lengths differ, so the 32 byte check also protects it.
async function verifyPassword(plain, stored) {
  // TODO
}

// 3. WRITE IT: needsRehash(stored, wanted = { N: 16384, r: 8, p: 1 })  returns true or false
//    true when the stored cost is LOWER than wanted (N, r or p lower), so it should be hashed
//    again the next time the user logs in. Also true when the string cannot be read.
//    false when the cost is the same or higher. Not async.
function needsRehash(stored, wanted = { N: 16384, r: 8, p: 1 }) {
  // TODO
}

// 4. THINK: for each way of saving a password, write "good" or "bad".
const verdict = {
  plainText: "",
  encrypted: "",         // reversible with a key
  md5WithSalt: "",
  sha256NoSalt: "",
  bcryptCost12: "",
  scryptSalted: "",
  argon2id: "",
};

module.exports = { derive, hashPassword, verifyPassword, needsRehash, verdict };
