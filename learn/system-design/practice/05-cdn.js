// Lesson 05: CDN. Write howLong and createEdge below, then run:
//   node --test learn/system-design/practice/05-cdn.test.js

// howLong(cacheControl) -> how many seconds a shared cache (the CDN edge) may keep an answer. 0 means do not keep it.
//
//   cacheControl is the text of the Cache-Control header, for example "public, max-age=60".
//   It can also be undefined or "" (the origin wrote no note at all).
//   Directives are separated by commas. Ignore spaces and upper or lower case.
//   The rules of this edge (card 2 of the lesson):
//     - "private", "no-store" or "no-cache" anywhere in the note: 0. This edge never keeps these.
//       (A real edge may keep a no-cache answer and ask the origin first. This one does not do that.)
//     - "s-maxage=N" is the time for a shared cache. If it is there, it wins over "max-age=N".
//     - "max-age=N" is the time otherwise.
//     - no time at all (no note, or just "public"): 0. This edge does not guess.
//     - a time that is 0, below 0 or not a number: 0.
//   Other words, such as "public" and "immutable", change nothing.
//   Examples: "public, max-age=60" -> 60   "public, max-age=60, s-maxage=300" -> 300
//             "private, max-age=60" -> 0   "no-store" -> 0   undefined -> 0
//
// createEdge(origin, now) makes one edge server with its own shelf.
//
//   origin(url)  is your own server. It returns { body, cacheControl }.
//   now()        returns the time in seconds. A test can move it. The default is real time: () => Date.now() / 1000.
//
// It returns an object with these methods:
//
//   get(url)     a user asks the edge for this url. It returns { body, hit }.
//                - If the shelf has a copy for the url and the copy is still fresh, answer from the shelf: hit is true.
//                  The origin is not asked. A copy saved at time t for s seconds is fresh while now() < t + s.
//                - Otherwise it is a miss: ask the origin, hit is false. Save the copy on the shelf only when
//                  howLong(cacheControl) is above 0. A copy that is too old is replaced by the new answer.
//   purge(url)   throw the copy of this url away now. Return true if there was one, otherwise false.
//   stats()      returns { requests, hits, misses, originCalls, hitRatio }.
//                hitRatio is hits / requests, and 0 when there are no requests yet.
function howLong(cacheControl) {
  // TODO
}

function createEdge(origin, now) {
  // TODO
}

module.exports = { howLong, createEdge };
