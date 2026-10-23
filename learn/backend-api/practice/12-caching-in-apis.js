// Lesson 12: Caching in APIs. Do the five tasks below, then run:
//   node --test learn/backend-api/practice/12-caching-in-apis.test.js
//
// Only Node's built-in modules are needed. The clock is a parameter (nowMs), so tests do not wait.
const { createHash } = require("node:crypto");

// 1. WRITE IT: makeEtag(body)    body is a string
//    Return a tag made from the body: a double quote, then the FIRST 16 letters of the
//    sha256 hex digest of the body, then a double quote.   Example shape:  "3f9a2c71b05de648"
//    The same body must always give the same tag. A different body must give a different tag.
function makeEtag(body) {
  // TODO
}

// 2. WRITE IT: conditionalGet(requestHeaders, body)  returns { status, headers, body? }
//    requestHeaders has lower-case names, for example { "if-none-match": '"abc"' }.
//    Work out the tag of body with makeEtag. The reply always has headers: { ETag: tag }.
//    The client's "if-none-match" can be:
//       - missing                           -> not a match
//       - one tag, with or without W/       -> match when it equals our tag (ignore the W/ mark)
//       - a list:  '"a", W/"b", "c"'        -> match when ANY of them equals our tag
//       - *                                 -> always a match
//    Match:    { status: 304, headers: { ETag } }       (no body key at all)
//    No match: { status: 200, headers: { ETag }, body }
function conditionalGet(requestHeaders, body) {
  // TODO
}

// 3. WRITE IT: createCacheAside({ ttlMs })  returns { getOrLoad(key, loader, nowMs), del(key) }
//    getOrLoad is async and returns { value, from }.
//      - If the key is saved and not run out: { value, from: "cache" }, and loader is NOT called.
//        A copy saved at time T with ttlMs is good while nowMs < T + ttlMs. At exactly T + ttlMs it has run out.
//      - Otherwise call loader() (it returns a Promise), save the value with a new TTL, and return
//        { value, from: "database" }.
//      - SINGLE FLIGHT: if a load for the same key is already running, do NOT call loader again.
//        Wait for the same result. Three callers at the same moment -> loader runs once.
//      - If loader throws, nothing is saved, and the error goes to the callers that waited.
//        The next call must try the loader again.
//    del(key) removes the saved copy, so the next call loads again.
function createCacheAside({ ttlMs }) {
  // TODO
}

// 4. WRITE IT: cacheControlFor(kind)  returns the Cache-Control header value as a string
//      "fingerprinted-file"  a file with a hash in its name   -> public, with a max-age of one year (31536000) and immutable
//      "public-list"         a list anyone may see            -> public, with a short max-age (at most 600 seconds)
//      "my-profile"          data about the logged-in user    -> private and no-cache
//      "bank-statement"      very private data                -> no-store
//      anything else                                          -> no-store   (the safe default)
function cacheControlFor(kind) {
  // TODO
}

// 5. THINK: fill in each answer.
const answers = {
  noCacheMeans: "",                  // "save it but check with the server before each use"  or  "never save it"
  noStoreMeans: "",                  // the same two choices
  statusWhenTagMatches: 0,           // a number
  headerThatCarriesTheSavedTag: "",  // the request header name
  afterAWriteDoThis: "",             // "delete the cache key"  or  "wait for the TTL to end"
};

module.exports = { makeEtag, conditionalGet, createCacheAside, cacheControlFor, answers };
