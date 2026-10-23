// Lesson 10: Validation and error handling. Do the five tasks below, then run:
//   node --test learn/backend-api/practice/10-validation-and-error-handling.test.js
//
// No packages needed. You write the checks by hand (in a real app, Zod does this part).

// Given to you: the short name for each status.
const TITLES = {
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
  409: "Conflict", 422: "Unprocessable Content", 429: "Too Many Requests", 500: "Internal Server Error",
};

// 1. WRITE IT: validateSignup(body)
//    body should look like { name, email, age }. The rules:
//      name:  a string, 1 to 50 characters after trim(). Keep the trimmed name.
//      email: a string like "a@b.c": something, then @, then something with a dot in it.
//             Trim it and make it lowercase.
//      age:   a whole number from 18 to 120. A number string such as "30" is fine and becomes 30.
//             Things like "abc", "30.5", "", true, null are not fine.
//    Any other field (for example role) is dropped.
//    Good input: return { ok: true, value: { name, email, age } }.
//    Bad input:  return { ok: false, errors }, where errors is { field: ["a message", ...] }
//                with a key ONLY for each field that failed.
//    It must never throw. If body is null, undefined, a string or an array, return
//    { ok: false, errors: { body: ["Body must be an object"] } }.
function validateSignup(body) {
  // TODO
}

// 2. WRITE IT: class AppError extends Error
//    new AppError(409, "That email is already used.") has:
//      .status  the number you passed
//      .message the text you passed
//      .expose  true when status is below 500, false otherwise
//    (expose means: the message is safe to show the client.)
class AppError extends Error {
  // TODO
}

// 3. WRITE IT: toProblem(err)  returns { status, body }
//    body uses the Problem Details shape: { type, title, status, detail }.
//    A KNOWN error has err.expose === true and err.status is a whole number from 400 to 499.
//      -> status = err.status
//         body  = { type: "about:blank", title: TITLES[status] (or "Error"), status, detail: err.message }
//    ANYTHING else is unknown (a plain Error, a string, null, undefined, a 404 without expose).
//      -> status = 500
//         body  = { type: "about:blank", title: "Internal Server Error", status: 500,
//                   detail: "Something went wrong. Try again later." }
//    Never put the message of an unknown error in the body. Never throw.
function toProblem(err) {
  // TODO
}

// 4. WRITE IT: makeErrorHandler(log)  returns an Express error handler (err, req, res, next)
//    - call log(err) first, for every error
//    - if res.headersSent is true, call next(err) and stop (the answer already started)
//    - otherwise use toProblem(err) and send it:
//        res.status(status).type("application/problem+json").json(body)
function makeErrorHandler(log) {
  // TODO
}

// 5. THINK: write the status code for each case (a number).
//    In this exercise a value that fails a rule is 422 and a body that is not valid JSON is 400.
const codes = {
  duplicateEmail: 0,       // the database says the email is already used
  brokenJson: 0,           // the body is {"email":
  ageTooSmall: 0,          // age 17 when the rule is 18 or more
  noToken: 0,              // the request has no login token at all
  bugInOurCode: 0,         // our code throws a TypeError
};

module.exports = { TITLES, validateSignup, AppError, toProblem, makeErrorHandler, codes };
