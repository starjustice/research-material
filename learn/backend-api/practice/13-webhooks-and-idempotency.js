// Lesson 13: Webhooks and idempotency. Do the six tasks below, then run:
//   node --test learn/backend-api/practice/13-webhooks-and-idempotency.test.js
//
// Only Node's built-in modules are needed.
const { createHmac, timingSafeEqual } = require("node:crypto");

// 1. WRITE IT: sign(secret, timestamp, rawBody)
//    Return the HMAC-SHA256 of the text  `${timestamp}.` followed by the raw body,
//    as a lower-case hex string (64 letters). rawBody is a string or a Buffer.
function sign(secret, timestamp, rawBody) {
  // TODO
}

// 2. WRITE IT: verifySignature({ secret, header, rawBody, nowSec, toleranceSec = 300 })  returns true or false
//    header looks like  "t=1000,v1=<hex>"  and may hold several v1 values (while a secret is being changed)
//    and other schemes such as v0 (ignore those):  "t=1000,v1=aaa,v1=bbb,v0=ccc"
//    Return true only when ALL of these hold:
//      - there is a t, and |nowSec - t| <= toleranceSec   (too old or too far in the future: false)
//      - at least ONE v1 equals sign(secret, t, rawBody), compared with timingSafeEqual
//    Check that the lengths are equal before timingSafeEqual (it throws when they differ).
//    It must NEVER throw. A missing or broken header, or a rawBody that is not a string or Buffer, gives false.
function verifySignature({ secret, header, rawBody, nowSec, toleranceSec = 300 }) {
  // TODO
}

// 3. WRITE IT: createWebhookReceiver({ secret, store, queue })  returns { receive }
//    store.insertIfNew(id) -> true if the id is new (and now saved), false if it was seen before.
//    store.remove(id)      -> forget an id.
//    queue.add(event)      -> may return a Promise. It may THROW (the queue is down).
//    receive({ headers, rawBody, nowSec }) is async and returns { status }. The signature header is
//    headers["x-signature"]. Do these in order:
//      1. signature wrong, missing or too old            -> { status: 400 }, nothing saved, nothing queued
//      2. rawBody is not valid JSON, or event.id is not a string -> { status: 400 }
//      3. store.insertIfNew(event.id) is false (a repeat) -> { status: 200 }, nothing queued
//      4. queue.add(event)                               -> { status: 200 }
//         If queue.add throws: store.remove(event.id), then { status: 500 }
//         (so that the sender's retry is not mistaken for a repeat)
function createWebhookReceiver({ secret, store, queue }) {
  // TODO
}

// 4. WRITE IT: applyRefund(state, event)   the second guard, inside the work itself
//    state is { points: number, applied: Set }. event is { id, points }.
//    If state.applied already has event.id: change nothing and return false.
//    Otherwise: add event.points to state.points, add event.id to state.applied, return true.
function applyRefund(state, event) {
  // TODO
}

// 5. WRITE IT: withIdempotencyKey(store, key, bodyText, handler)
//    store is a Map. handler() returns a response { status, body }. bodyText is the request body as text.
//    Return { status, body, replayed }.
//      - no key (undefined or "")      -> run handler, return its response with replayed: false. Save nothing.
//      - a new key                     -> run handler, save { fingerprint: bodyText, response } under the key,
//                                         return the response with replayed: false
//      - the key was seen, same body   -> do NOT run handler. Return the saved response with replayed: true
//      - the key was seen, other body  -> do NOT run handler. Return
//                                         { status: 422, body: { title: "Idempotency-Key was used with a different request" }, replayed: false }
function withIdempotencyKey(store, key, bodyText, handler) {
  // TODO
}

// 6. THINK: write the status code for each case (a number).
const statuses = {
  badSignature: 0,          // the signature does not match
  firstDelivery: 0,         // a valid, new event
  duplicateDelivery: 0,     // a valid event we have already seen
  ourDatabaseIsDown: 0,     // we cannot save the event id, and we want the sender to try again
  eventTypeWeDoNotUse: 0,   // valid and new, but we ignore this kind of event
};

module.exports = { sign, verifySignature, createWebhookReceiver, applyRefund, withIdempotencyKey, statuses };
