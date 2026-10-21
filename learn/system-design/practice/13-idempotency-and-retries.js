// Lesson 13: Idempotency and retries. Write the two functions below, then run:
//   node --test learn/system-design/practice/13-idempotency-and-retries.test.js
//
// Part 1 plays the server's idempotency_keys table. Part 2 is the client's "should I try again?" rule.
// Time is a plain number of hours, for example now = 0 and now = 25.
//
// ---- Part 1: createKeyStore({ keepHours = 24 } = {}) returns an object with: ----
//
//   start(key, body, now = 0)  ->  one of these answers
//     { action: "reject", status: 400 }   the key is missing (undefined or "")
//     { action: "run" }                   a new key: save it as "in progress", then the caller does the work
//     { action: "reject", status: 422 }   the key was seen with a DIFFERENT body
//     { action: "wait", status: 409 }     the key was seen, same body, and it is still in progress
//     { action: "replay", response }      the key was seen, same body, and it is done: the saved answer
//     Check the body before the status: a different body is always 422.
//     Compare bodies with JSON.stringify(body). (A real server saves a short hash of the body.)
//
//   finish(key, response)
//     The work is done. Save the response and mark the key "done".
//     Save every response, even an error like { status: 500 }. A repeat gets the same answer.
//
//   forget(key)
//     The work failed before anything changed (for example the database was down).
//     Remove the key, so the next start(key, ...) answers { action: "run" } again.
//
//   removeOld(now)  ->  how many keys were removed
//     Remove every key that was started keepHours or more ago (now - startedAt >= keepHours).
//
// ---- Part 2: shouldRetry({ method, status, hasKey = false })  ->  true or false ----
//
//   method is "GET", "HEAD", "OPTIONS", "PUT", "DELETE", "POST" or "PATCH".
//   status is a number like 503, or the text "timeout" when no answer came back.
//   1. Only retry what is safe to repeat: GET, HEAD, OPTIONS, PUT and DELETE always are.
//      POST and PATCH are safe only when hasKey is true.
//   2. Retry when the answer is "timeout", or any 5xx (500 to 599).
//   3. Also retry 409 (in this lesson it means "still in progress") and 429 (too many requests).
//      Both mean "ask again later".
//   4. Never retry other 4xx answers (400, 401, 404, 422 ...): the same request will fail the same way.
//      Never retry a 2xx answer: it worked.

function createKeyStore({ keepHours = 24 } = {}) {
  // TODO
}

function shouldRetry({ method, status, hasKey = false }) {
  // TODO
}

module.exports = { createKeyStore, shouldRetry };
