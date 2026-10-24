// Lesson 17: WebSockets and Server-Sent Events. Do the six tasks below, then run:
//   node --test learn/backend-api/practice/17-websockets-and-server-sent-events.test.js
//
// Only Node's built-in modules are needed.
const { createHash } = require("node:crypto");

// The fixed text from the WebSocket standard (RFC 6455). Given to you.
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// 1. WRITE IT: acceptKey(clientKey)   the Sec-WebSocket-Accept value
//    Take the client's Sec-WebSocket-Key text, add GUID after it, make a SHA-1 hash, and return it in base64.
//    The standard's own example:  "dGhlIHNhbXBsZSBub25jZQ=="  ->  "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
function acceptKey(clientKey) {
  // TODO
}

// 2. WRITE IT: formatSseEvent({ id, event, data, retry, comment })  returns a string
//    Write one Server-Sent Event, in this order. Leave out every field that is undefined.
//      comment -> ": <comment>\n"
//      retry   -> "retry: <retry>\n"
//      id      -> "id: <id>\n"
//      event   -> "event: <event>\n"
//      data    -> one "data: <line>\n" for EACH line of data (a line ends at \n, \r\n or \r). data can be a number.
//    Then one more "\n" (the blank line that ends the event). Always add it.
//    Example:  { id: 3, event: "note", data: "line one\nline two" }
//              -> "id: 3\nevent: note\ndata: line one\ndata: line two\n\n"
function formatSseEvent({ id, event, data, retry, comment } = {}) {
  // TODO
}

// 3. WRITE IT: parseSse(text)   returns { events, retry }
//    Read an event stream the way a browser does. Treat \r\n and \r as \n. Blocks are separated by a blank line.
//    In each block, read the lines:
//      - an empty line, or a line that starts with ":" is a comment. Ignore it.
//      - otherwise it is "field: value". Split at the FIRST colon. If the value starts with ONE space, drop that space.
//        A line with no colon at all is a field name with an empty value.
//      - field "data":  add the value. Several data lines are joined with "\n".
//      - field "event": the name of the event.
//      - field "id":    sets the last id. The last id STAYS for the later events too, until another id line changes it.
//      - field "retry": if the value is only digits, it is the reconnect time in milliseconds (a number).
//      - any other field is ignored.
//    A block makes an event ONLY if it had at least one data line. The event is
//        { id: <last id so far, or "">, event: <name, or "message" if none>, data: <the joined text> }
//    The result is { events: [...], retry: <the last valid retry as a number, or null> }.
function parseSse(text) {
  // TODO
}

// 4. WRITE IT: reconnectDelay(attempt, { baseMs = 500, capMs = 30000 } = {}, random = Math.random)
//    The time to wait before the next reconnect, in whole milliseconds ("full jitter"):
//      limit = the smaller of capMs and baseMs * 2 ** attempt
//      wait  = a random whole number from 0 up to (but not including) limit  ->  Math.floor(random() * limit)
//    random is a function that returns a number from 0 up to but not including 1. A test can pass its own.
//    An attempt that is negative or not a number counts as 0.
function reconnectDelay(attempt, { baseMs = 500, capMs = 30000 } = {}, random = Math.random) {
  // TODO
}

// 5. WRITE IT: createHub()   a tiny chat hub with rooms. A socket is { readyState, send(message) }.
//    readyState 1 means open. Any other number (0 connecting, 2 closing, 3 closed) means it cannot be sent to.
//    Return an object with these four functions:
//      join(room, socket)             add the socket to the room. Joining twice is still one.
//      leave(socket)                  remove the socket from EVERY room. A room with no sockets is forgotten.
//      broadcast(room, message, except)  send message to every OPEN socket in the room except the one called except.
//                                     A socket that is not open is removed from the room and gets nothing.
//                                     Return how many sockets the message was sent to. An unknown room gives 0.
//      size(room)                     how many sockets are in the room now. An unknown room gives 0.
function createHub() {
  // TODO
}

// 6. THINK: fill in each answer.
const answers = {
  oneWayLivePrices: "",                // "polling", "sse" or "websocket"
  chatBothWays: "",                    // "polling", "sse" or "websocket"
  rareUpdates: "",                     // "polling", "sse" or "websocket"
  sseConnectionsPerBrowserOnHttp1: 0,  // a number (see the lesson)
  closeCodeNormal: 0,                  // a number
  serversShareMessagesWith: "",        // "server memory" or "message bus"
};

module.exports = { GUID, acceptKey, formatSseEvent, parseSse, reconnectDelay, createHub, answers };
