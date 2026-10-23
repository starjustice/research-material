// Lesson 14: Observability. Write percentile and createRecorder below, then run:
//   node --test learn/system-design/practice/14-observability.test.js
//
// One small object plays the three tools: spans for traces, log lines, and request numbers.
// All times are in milliseconds. Nothing here uses the real clock, so the tests are exact.
//
// percentile(values, p)  ->  number or null
//   The "nearest rank" way, the one this lesson uses:
//     1. Copy the values and sort the copy from small to big. Do not change the input array.
//     2. rank = Math.ceil((p * count) / 100). Use (p * count) / 100, not p / 100 * count,
//        so 99 * 100 / 100 is exactly 99.
//     3. Return the value at position rank, counting from 1 (so sorted[rank - 1]).
//   p is bigger than 0 and at most 100. An empty array gives null.
//   Example: [5, 1, 3, 2, 4] with p = 50 -> sorted [1, 2, 3, 4, 5], rank 3, answer 3.
//
// createRecorder() returns an object with:
//
//   span({ traceId, spanId, parentId, service, name, start, ms })
//     Keeps one timed step. parentId is the spanId of the step that called it,
//     or null for the first step of the request.
//
//   slowestStep(traceId)  ->  the span with the most "own time", plus ownMs, or null
//     Own time = the span's ms minus the ms of its direct children (spans whose parentId is its spanId).
//     Return a copy of that span with one extra field: { ...span, ownMs }.
//     Only look at spans of this traceId. No spans for it -> null.
//     If two spans have the same own time, return the one that was recorded first.
//
//   log(traceId, service, level, msg, fields = {})  ->  the line as a JSON string
//     Build { level, traceId, service, msg, ...fields } in exactly that key order,
//     turn it into a string with JSON.stringify, keep it, and return it.
//     Safety net: a field whose name in lower case is "password", "token",
//     "authorization" or "cardnumber" gets the value "[hidden]" instead.
//     Only check the top level of fields.
//
//   logsFor(traceId)  ->  [strings]
//     Every kept line with this traceId, oldest first. None -> [].
//
//   request(route, status, ms)
//     Counts one finished request for a route like "POST /checkout".
//     A status of 500 or more is an error. 4xx is not an error.
//
//   stats(route)  ->  { requests, errors, errorRate, p50, p99 }
//     errorRate = errors / requests (0 when there are no requests).
//     p50 and p99 use percentile on this route's ms values (null when there are none).
function percentile(values, p) {
  // TODO
}

function createRecorder() {
  // TODO
}

module.exports = { percentile, createRecorder };
