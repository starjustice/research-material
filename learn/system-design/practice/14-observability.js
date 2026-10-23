// Lesson 14: Observability. Write createTelemetry below, then run:
//   node --test learn/system-design/practice/14-observability.test.js

// createTelemetry({ clock }) makes three small tools that leave clues: a log, a counter and a span.
// clock is a function that returns the time now in milliseconds. The tests give it a fake clock,
// so the answers are exact. It returns an object with these methods:
//
//   log(traceId, msg, fields)  writes ONE structured log line. That is a line of JSON text.
//                              The JSON has traceId, msg, and every key of fields (fields is optional).
//                              It saves the line, and it returns the same line.
//
//   count(name, labels)        adds 1 to a counter. labels is an object, for example
//                              { route: "/orders", status: "ok" }.
//                              The counter key is the name, then the labels sorted by label name:
//                                requests{route=/orders,status=ok}
//                              With no labels, the key is only the name: requests
//                              Labels in a different order must give the same key.
//                              Throw an Error when a label NAME is userId, orderId, traceId or email.
//                              Those values never repeat, so each one would start a new series
//                              (picture 2e). The counter must not change when it throws.
//
//   span(traceId, name, fn)    runs fn(), measures how long it took with clock, and saves
//                              { traceId, name, ms }. It returns what fn returns.
//                              If fn throws, save the span first, then throw the same error again.
//
//   lines()                    an array of the saved log lines, oldest first.
//   counters()                 an object of key -> number.
//   spans()                    an array of the saved spans, in the order they ended.
//   seriesCount()              how many different counter keys exist.
function createTelemetry(options) {
  // TODO
}

// handleRequest is finished for you. It uses your tools the way the lesson does.
// steps is a list of [name, work] pairs. work is a function that does one step of the request.
// If a step throws, the request fails: the status is "error", and the next steps do not run.
function handleRequest(t, { traceId, route, steps }) {
  let status = "ok";
  try {
    for (const [name, work] of steps) t.span(traceId, name, work);
  } catch (err) {
    status = "error";
  }
  t.count("requests", { route, status });
  t.log(traceId, "request done", { route, status });
  return status;
}

module.exports = { createTelemetry, handleRequest };
