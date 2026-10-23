// Lesson 03: Express middleware. Write the two functions below, then run:
//   node --test learn/backend-api/practice/03-express-middleware.test.js
//
// You build a tiny copy of how Express runs middleware. No real server, no npm install.
// Everything is synchronous, so handle() gives back the answer at once.
//
// ---- Part 1: createResponse() returns a tiny res object ----
//
//   res.statusCode      starts at 200
//   res.body            starts as undefined
//   res.headersSent     starts as false. It becomes true after the first send.
//   res.status(code)    sets statusCode and returns res, so res.status(401).json(...) works
//   res.json(body)      sends: saves body, sets headersSent to true, returns res
//   res.send(body)      the same as json in this tiny copy
//   Sending a second time throws new Error("Cannot set headers after they are sent to the client")
//   and keeps the first body.
//   After a send, status(code) changes nothing (the client already has the answer), but still returns res.
//
// ---- Part 2: createApp() returns { use(fn), handle(req) } ----
//
//   use(fn)       adds fn to the end of the line. The order of use() calls is the order they run.
//
//   handle(req)   runs one request through the line and returns what the client gets:
//                   { status, body }   when something was sent
//                   "hang"             when nothing was sent (the client would wait forever)
//
//   1. A normal function has fewer than 4 parameters: fn(req, res, next).
//      An error function has exactly 4 parameters: fn(err, req, res, next). Check fn.length === 4.
//   2. handle() starts with the first normal function. The same req and res go to every function.
//   3. next() with no value runs the next NORMAL function. Error functions are skipped.
//   4. next(err) with any value is an error. It skips normal functions and runs the next
//      ERROR function, with that err as the first argument.
//   5. A function that throws counts as next(thrownError). handle() itself must never throw.
//      An error function can pass the error on with next(err), or throw too.
//   6. A function that sends and does not call next() stops the line.
//      A function that does neither leaves the request hanging: handle() returns "hang".
//   7. When next() goes past the last function:
//        no error, nothing sent    ->  send status 404, body { error: "Not Found" }
//        an error, nothing sent    ->  send status 500, body { error: "Internal Server Error" }
//        something already sent    ->  keep what was sent
//      (Real Express does the same, with an HTML page instead of JSON.)

function createResponse() {
  // TODO
}

function createApp() {
  // TODO
}

module.exports = { createResponse, createApp };
