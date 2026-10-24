// Lesson 15: tRPC. Do the five tasks below, then run:
//   node --test learn/backend-api/practice/15-trpc.test.js
//
// You build a tiny tRPC. No packages needed.
//
// A router is a plain object. Routers can sit inside routers, so the path "user.byId" means router.user.byId.
// A procedure is an object:
//   { type: "query" | "mutation",
//     input:       (raw) => ({ ok: true, value }) or ({ ok: false, message })      (optional: the validator)
//     middlewares: [ (ctx) => newCtx, ... ]                                         (optional, may be async, may throw)
//     handler:     ({ input, ctx }) => anything                                     (may be async, may throw) }

// Given to you: an error with a code, like TRPCError in the real library.
class TRPCError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
}

// 1. WRITE IT: httpStatusFor(code)   from the tRPC docs:
//      PARSE_ERROR 400, BAD_REQUEST 400, UNAUTHORIZED 401, PAYMENT_REQUIRED 402, FORBIDDEN 403, NOT_FOUND 404,
//      METHOD_NOT_SUPPORTED 405, TIMEOUT 408, CONFLICT 409, PRECONDITION_FAILED 412, PAYLOAD_TOO_LARGE 413,
//      UNSUPPORTED_MEDIA_TYPE 415, UNPROCESSABLE_CONTENT 422, PRECONDITION_REQUIRED 428, TOO_MANY_REQUESTS 429,
//      CLIENT_CLOSED_REQUEST 499, INTERNAL_SERVER_ERROR 500, NOT_IMPLEMENTED 501, BAD_GATEWAY 502,
//      SERVICE_UNAVAILABLE 503, GATEWAY_TIMEOUT 504
//    Any other value (also "toString" or undefined) gives 500. It must never throw.
function httpStatusFor(code) {
  // TODO
}

// 2. WRITE IT: parseRpcUrl({ method, url, body, basePath = "/trpc/" })
//    Read the tRPC wire format. Return { batch, calls } where calls is a list of { path, input }.
//      - The path is the part of the URL path after basePath ("/trpc/user.byId" -> "user.byId").
//      - A query is a GET: the input is JSON in the "input" query parameter. No input parameter: input is undefined.
//      - A mutation is a POST: the input is the JSON in body. An empty body: input is undefined.
//      - A batch needs the query parameter batch=1. The paths are joined with commas
//        ("/trpc/a,b?batch=1") and the input is an object keyed by position: {"0": inputOfA, "1": inputOfB}.
//        A position with no key: that call's input is undefined.
//      - Not a batch: calls has exactly one item and batch is false.
//    Errors (return an object, never throw):
//      - the JSON is broken                                  -> { error: "parse error" }
//      - the URL path does not start with basePath, or has no name after it -> { error: "bad request" }
//      - several comma-joined paths but no batch=1           -> { error: "bad request" }
function parseRpcUrl({ method, url, body, basePath = "/trpc/" }) {
  // TODO
}

// 3. WRITE IT: async callProcedure({ router, path, method, rawInput, ctx })
//    Return { ok: true, data } or { ok: false, error: { code, message } }. It must never throw. Do these in order:
//      a. Walk the dotted path through the router (use Object.hasOwn, so "__proto__" or "constructor" finds nothing).
//         No procedure there (it has no handler function)      -> error NOT_FOUND
//      b. method must be "GET" for a query and "POST" for a mutation. Else -> error METHOD_NOT_SUPPORTED
//      c. Run the middlewares in order, each with the current ctx. If a middleware returns a value, that is the
//         new ctx. If it returns nothing, keep the old ctx. If one throws, stop. (Login check FIRST.)
//      d. If the procedure has an input validator, run it on rawInput.
//         { ok: false, message } -> error BAD_REQUEST with that message. { ok: true, value } -> use value as the input.
//      e. Run handler({ input, ctx }) and return { ok: true, data: whatItReturned }.
//    A thrown TRPCError gives { ok: false, error: { code: err.code, message: err.message } }.
//    Any OTHER thrown error is unknown: give { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong. Try again later." }
//    and NEVER put the real message in the answer.
async function callProcedure({ router, path, method, rawInput, ctx }) {
  // TODO
}

// 4. WRITE IT: batchStatus(statuses)    statuses is a list of numbers, one per call in a batch
//    If all are the same, return that status. If they differ, return 207 (Multi-Status). An empty list: 200.
function batchStatus(statuses) {
  // TODO
}

// 5. THINK: fill in each answer.
const answers = {
  typesExistAtRuntime: null,            // true or false
  needsRuntimeValidator: null,          // true or false
  queryHttpMethod: "",                  // "GET" or "POST"
  mutationHttpMethod: "",               // "GET" or "POST"
  publicApiForOtherCompanies: "",       // "rest" or "trpc"
};

module.exports = { TRPCError, httpStatusFor, parseRpcUrl, callProcedure, batchStatus, answers };
