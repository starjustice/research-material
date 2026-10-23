// Lesson 01: HTTP basics. Write the three functions below, then run:
//   node --test learn/backend-api/practice/01-http-basics.test.js
//
// No npm install. Plain functions, no server. Pictures 2d and 2h in the lesson are the rules.
//
// ---- Part 1: parseRequest(rawText) -> { method, path, query, headers, body } ----
//
//   rawText is the plain text of one HTTP request, for example:
//     "POST /products?shop=7 HTTP/1.1\r\nHost: shop.example.com\r\nContent-Type: application/json\r\n\r\n{\"name\":\"Rice\"}"
//   1. Lines end with "\r\n". Also accept plain "\n".
//   2. The first line is the request line: METHOD, a space, the target, a space, the version.
//      method is the first word, as written ("GET").
//      path is the target up to "?" ("/products"). query is an object from the part after "?"
//      ({ shop: "7" }), or {} when there is no "?". Values stay text.
//   3. Then one header per line, "Name: value", until the first empty line.
//      headers is an object. Keys are lowercase ("content-type"). Values have no spaces around them.
//      Split each line at the FIRST ":" only, because values can contain ":" too ("Host: localhost:3000").
//   4. Everything after the first empty line is the body.
//      body is null when there is no empty line or nothing comes after it.
//      When the content-type header starts with "application/json", body is JSON.parse(text).
//      Otherwise body is the text as it is.
//
// ---- Part 2: pickStatus(situation) -> a status code number ----
//
//   situation is an object. Any missing field takes the default shown here:
//     { crashed = false, tooMany = false, loggedIn = true, allowed = true, found = true,
//       readable = true, valid = true, conflict = false, created = false, empty = false }
//   Check in THIS order. The first rule that matches wins:
//     1. crashed         -> 500  the server broke
//     2. tooMany         -> 429  too many requests, wait and try later
//     3. !loggedIn       -> 401  "who are you?" no token, or a bad or expired one
//     4. !allowed        -> 403  "I know you, but you may not do this"
//     5. !found          -> 404  the thing is not there
//     6. !readable       -> 400  the server cannot read the request (broken JSON, wrong shape)
//     7. !valid          -> 422  readable, but it breaks a rule (price below 0)
//     8. conflict        -> 409  it clashes with what is already there (the email is taken)
//     9. created         -> 201  a new thing was made
//    10. empty           -> 204  it worked, and there is nothing to send back
//    11. otherwise       -> 200  it worked
//
// ---- Part 3: family(code) -> one of these texts ----
//
//     100 to 199 -> "info"
//     200 to 299 -> "worked"
//     300 to 399 -> "look elsewhere"
//     400 to 499 -> "your request is wrong"
//     500 to 599 -> "server broke"
//     anything else (99, 600, 404.5, "404") -> "unknown"

function parseRequest(rawText) {
  // TODO
}

function pickStatus(situation = {}) {
  // TODO
}

function family(code) {
  // TODO
}

module.exports = { parseRequest, pickStatus, family };
