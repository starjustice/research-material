// Lesson 06: Sessions vs JWT. Do the three tasks below, then run:
//   node --test learn/backend-api/practice/06-sessions-vs-jwt.test.js
const { randomBytes, createHmac, timingSafeEqual } = require("node:crypto");

// Given to you: turn an object into base64url text, and back.
const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const decode = (text) => JSON.parse(Buffer.from(text, "base64url").toString("utf8"));

// 1. WRITE IT: createSessionStore
//    The server keeps the note. The browser only gets an id.
//    create(data)  makes a random id (32 letters or digits from randomBytes(16).toString("hex")),
//                  keeps data under that id, and returns the id.
//    get(id)       returns the data. It returns null if the id is unknown, or if the
//                  session has run out of time.
//    destroy(id)   removes the session at once.
//    A session runs out ttlMs after it was made. Read the time with now(), not with
//    Date.now() directly, so the test can move the clock.
function createSessionStore({ ttlMs = 60_000, now = () => Date.now() } = {}) {
  // TODO
}

// 2. WRITE IT: signToken and verifyToken (a small JWT with HS256)
//    A token is three parts joined with dots: header.payload.signature
//      header     encode({ alg: "HS256", typ: "JWT" })
//      payload    encode({ ...payload, exp })      exp = seconds since 1970 when it ends
//      signature  the HMAC SHA-256 of "header.payload" with the secret, as base64url
//    signToken(payload, secret, { expiresInSeconds = 900, now = () => Date.now() } = {})
//      returns the token string. now() gives milliseconds.
//    verifyToken(token, secret, { now = () => Date.now() } = {})
//      returns the payload object, or null if ANYTHING is wrong:
//        - the token is not a string, or does not have exactly 3 parts
//        - the header says an algorithm other than "HS256" (for example "none")
//        - the signature does not fit
//        - exp is in the past
//      It must never throw. Compare signatures with timingSafeEqual.
//      timingSafeEqual throws when the two buffers have different lengths, so check the lengths first.
function signToken(payload, secret, options = {}) {
  // TODO
}
function verifyToken(token, secret, options = {}) {
  // TODO
}

// 3. THINK: for each fact, write "session" or "jwt".
//    Which one fits the fact? Draw the two time lines from lesson section 2c first.
const facts = {
  canBeBlockedAtOnce: "",              // the server can cancel a login right now
  noLookupOnEachRequest: "",           // the server only checks a stamp
  manyServersNeedASharedStore: "",     // one notebook that all the servers must read
  anyoneCanReadTheContent: "",         // the facts are in plain sight, but cannot be changed
  browserHoldsOnlyARandomId: "",       // the browser holds no facts at all
  factsCanGoStaleUntilItRunsOut: "",   // the role changed, but the old role still shows
};

module.exports = { createSessionStore, signToken, verifyToken, facts, encode, decode };
