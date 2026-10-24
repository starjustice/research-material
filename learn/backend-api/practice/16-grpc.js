// Lesson 16: gRPC. Do the six tasks below, then run:
//   node --test learn/backend-api/practice/16-grpc.test.js
//
// You build a tiny protobuf from scratch. No packages needed.
//
// How protobuf writes a message (section 2d of the lesson):
//   - A message is a list of fields. Each field is: a TAG, then the value.
//   - The tag is a varint with the value  (fieldNumber * 8) + kind.   kind 0 = a number, kind 2 = text.
//   - A number is written as a varint.
//   - A text is written as: its length (a varint), then its UTF-8 bytes.
//   - A VARINT writes a whole number 7 bits at a time, lowest bits first. Every byte except the last has its
//     top bit set to 1, which means "another byte follows".
//       0 -> 00     1 -> 01     127 -> 7f     128 -> 80 01     150 -> 96 01     300 -> ac 02     16384 -> 80 80 01

// 1. WRITE IT: encodeVarint(n)   n is a whole number, 0 or more. Return a Buffer.
//    Do not use the bit-shift operators (<< and >>). JavaScript uses only 32 bits for them. Use % and Math.floor.
function encodeVarint(n) {
  // TODO
}

// 2. WRITE IT: decodeVarint(buf, offset = 0)   Return { value, length }:
//    the number that starts at buf[offset], and how many bytes it used.
//    If the bytes end while the top bit still says "more follows", throw an Error.
function decodeVarint(buf, offset = 0) {
  // TODO
}

// 3. WRITE IT: encodeMessage(fields)  and  decodeMessage(buf)
//    encodeMessage takes a list like [[1, 1], [2, "Ana"], [3, "ana@example.com"]]: [fieldNumber, value] pairs.
//      A value that is a number is written as kind 0. A value that is a string is written as kind 2. Return a Buffer.
//      Example:  encodeMessage([[1, 150]])  is  08 96 01
//                encodeMessage([[2, "testing"]])  is  12 07 74 65 73 74 69 6e 67
//    decodeMessage goes the other way. It returns a list of { field, wireType, value }:
//      kind 0 -> value is a number.     kind 2 -> value is a string (UTF-8).
//    decodeMessage must throw an Error when:  the kind is not 0 or 2  ("unsupported wire type"),
//    or a text says it is longer than the bytes that are left.
function encodeMessage(fields) {
  // TODO
}
function decodeMessage(buf) {
  // TODO
}

// 4. WRITE IT: grpcToHttp(code)   code is the gRPC status number 0 to 16. From Google's code.proto:
//      0 OK 200, 1 CANCELLED 499, 2 UNKNOWN 500, 3 INVALID_ARGUMENT 400, 4 DEADLINE_EXCEEDED 504, 5 NOT_FOUND 404,
//      6 ALREADY_EXISTS 409, 7 PERMISSION_DENIED 403, 8 RESOURCE_EXHAUSTED 429, 9 FAILED_PRECONDITION 400,
//      10 ABORTED 409, 11 OUT_OF_RANGE 400, 12 UNIMPLEMENTED 501, 13 INTERNAL 500, 14 UNAVAILABLE 503,
//      15 DATA_LOSS 500, 16 UNAUTHENTICATED 401
//    Anything else (17, -1, 1.5, "5", undefined) gives 500. Never throw.
function grpcToHttp(code) {
  // TODO
}

// 5. WRITE IT: retryAdvice(name)  and  remainingMs(deadlineAtMs, nowMs)
//    retryAdvice takes a status NAME such as "UNAVAILABLE" and returns one of these texts (from the gRPC docs):
//      UNAVAILABLE          -> "retry with backoff"
//      ABORTED              -> "retry at a higher level"
//      FAILED_PRECONDITION  -> "fix first"
//      any other name       -> "do not retry"
//    remainingMs is the time left on a deadline: deadlineAtMs - nowMs, but never below 0.
//    A service that calls another service passes THIS value on, so the whole chain shares one deadline.
function retryAdvice(name) {
  // TODO
}
function remainingMs(deadlineAtMs, nowMs) {
  // TODO
}

// 6. THINK: fill in each answer.
const answers = {
  fieldNamesAreInTheBytes: null,        // true or false
  httpStatusOfAFailedGrpcCall: 0,       // a number (look at section 5 of the lesson)
  defaultDeadline: "",                  // "none" or "30 seconds"
  whenYouDeleteAField: "",              // "reserve its number" or "reuse its number"
  browserNeedsSomethingExtra: null,     // true or false: can a browser call a gRPC server directly?
};

module.exports = { encodeVarint, decodeVarint, encodeMessage, decodeMessage, grpcToHttp, retryAdvice, remainingMs, answers };
