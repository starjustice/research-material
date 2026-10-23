// Lesson 07: Access and refresh tokens. Write the four TODO parts, then run:
//   node --test learn/backend-api/practice/07-access-and-refresh-tokens.test.js
const { randomBytes, createHash, createHmac, timingSafeEqual } = require("node:crypto");

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// ---- Given to you: a small JWT (from lesson 06). You do not change these two. ----
const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const decode = (text) => JSON.parse(Buffer.from(text, "base64url").toString("utf8"));
const stamp = (text, secret) => createHmac("sha256", secret).update(text).digest("base64url");

function signJwt(payload, secret, { expiresInSeconds, now }) {
  const exp = Math.floor(now() / 1000) + expiresInSeconds;
  const body = encode({ alg: "HS256", typ: "JWT" }) + "." + encode({ ...payload, exp });
  return body + "." + stamp(body, secret);
}
function verifyJwt(token, secret, { now }) {
  try {
    const [h, p, s] = String(token).split(".");
    if (!h || !p || !s || decode(h).alg !== "HS256") return null;
    const good = Buffer.from(stamp(h + "." + p, secret));
    const got = Buffer.from(s);
    if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
    const payload = decode(p);
    return payload.exp * 1000 > now() ? payload : null;
  } catch {
    return null;
  }
}

// ---- The service. now() gives milliseconds. The test moves the clock. ----
function createAuthService({ secret, now = () => Date.now(), accessTtlSeconds = 900, refreshTtlSeconds = 7 * 24 * 3600 }) {
  // The database table. The key is the SHA-256 HEX of the refresh token (never the token itself).
  // The value is { userId, familyId, status, expiresAt }.
  // status is "active", "used" or "revoked". expiresAt is in milliseconds.
  const rows = new Map();

  // 1. WRITE IT: issuePair(userId, familyId)
  //    Make an access token: signJwt({ sub: String(userId) }, secret, { expiresInSeconds: accessTtlSeconds, now })
  //    Make a refresh token: 32 random bytes as base64url text.
  //    Save a row for it in `rows` (key: sha256 of the refresh token) with status "active"
  //    and expiresAt = now() + refreshTtlSeconds * 1000.
  //    Return { accessToken, refreshToken }.
  function issuePair(userId, familyId) {
    // TODO
  }

  // 2. WRITE IT: verifyAccess(token)
  //    Return the payload of a good access token, or null. (One line, using verifyJwt.)
  function verifyAccess(token) {
    // TODO
  }

  // 3. WRITE IT: refresh(refreshToken)  with rotation and reuse detection
  //    - not a string, or not in the table                 -> null
  //    - status is not "active" (it was used or revoked)   -> REUSE: set every row of the same
  //                                                           familyId to "revoked", then return null
  //    - it is too old (now() >= expiresAt)                -> null
  //    - otherwise: set its status to "used" (rotation) and
  //                 return issuePair(row.userId, row.familyId)  (same family)
  function refresh(refreshToken) {
    // TODO
  }

  // 4. WRITE IT: logout(refreshToken)
  //    Set every row of the token's family to "revoked". An unknown token does nothing.
  function logout(refreshToken) {
    // TODO
  }

  // Given: a login starts a new family.
  function login(userId) {
    return issuePair(userId, randomBytes(8).toString("hex"));
  }

  return { login, verifyAccess, refresh, logout, _rows: () => [...rows.values()], _keys: () => [...rows.keys()] };
}

module.exports = { createAuthService, sha256 };
