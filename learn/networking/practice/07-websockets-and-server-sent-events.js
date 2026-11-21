// Lesson 07: WebSockets and server sent events. Write the ten pieces below, then run:
//   node --test learn/networking/practice/07-websockets-and-server-sent-events.test.js
//
// The helpers below the comments (crypto, WS_GUID, OPCODES, lower, list) are already written for you.
// Never change the objects you are given.
//
//   parseSse(text)
//       Read the text of an event stream (what the server sends, card 3). Return { events, retry }.
//       Rules, the same as the browser's EventSource:
//         - lines end with \n, \r\n or \r. A blank line ends one event.
//         - a line that starts with ":" is a comment. Ignore it.
//         - "field: value". If the value starts with one space, drop that one space. A line without ":" is a field with value "".
//         - field "data":  add the value as one line of data. Several data lines are joined with "\n".
//         - field "event": the name of the event. When it is missing the name is "message".
//         - field "id":    the last event id. It stays set for the next events (until another id line comes). Start with "".
//         - field "retry": only when the value is only digits. retry is that number. The last good one wins. Start with null.
//         - any other field: ignore it.
//         - A blank line only makes an event when there was at least one data line.
//           Otherwise nothing is made (but an id that was set stays).
//         - Text after the last blank line is not finished. It makes no event.
//       events is a list of { event, data, id }. Example:
//         parseSse("id: 1\ndata: a\n\n") gives { events: [{ event: "message", data: "a", id: "1" }], retry: null }
//
//   formatSse(message)
//       The opposite. message: { id, event, data, retry }, all optional. Return the text to write to the stream.
//       Write the lines in this order: id, event, retry, then one "data: " line for each line of data.
//       Each line ends with "\n". The whole message ends with one more "\n". Leave out what is undefined.
//       A message with an id that has a line break (\n or \r): throw an Error("id must not contain a line break").
//       Example: formatSse({ id: 7, data: "hi" }) gives "id: 7\ndata: hi\n\n"
//
//   missedEvents(history, lastEventId)
//       What to send after a browser reconnects. history is a list of { id, data }, oldest first.
//       lastEventId is the Last-Event-ID header the browser sent (text, number or undefined).
//         - undefined, null or "": a new visitor. Return [].
//         - the id is in the history (compare as text): return the items after it (maybe an empty list).
//         - the id is not in the history (it is too old): return null. It means "start again from scratch".
//
//   acceptKey(key)
//       The Sec-WebSocket-Accept value: SHA-1 of (key + WS_GUID), as base64. Use the crypto helper.
//       acceptKey("dGhlIHNhbXBsZSBub25jZQ==") is "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" (the example in RFC 6455).
//
//   handshake(request, options)
//       What a WebSocket server answers to the first HTTP request. request: { method, headers }.
//       options is optional: { allowedOrigins: ["http://localhost:3000"] }.
//       Return { status, reason, headers }. Header names in the request can be in any letter case (use lower()).
//       Check in this order and stop at the first problem:
//         1. method is not GET (letter case does not matter):   405, reason "method must be GET"
//         2. Upgrade is not "websocket" (letter case does not matter) OR the Connection list has no "upgrade"
//            (a list like "keep-alive, Upgrade" is fine):        426, reason "Upgrade Required"
//         3. no Sec-WebSocket-Key:                               400, reason "missing Sec-WebSocket-Key"
//         4. Sec-WebSocket-Version is not "13":                  426, reason "unsupported version",
//                                                                 headers { "Sec-WebSocket-Version": "13" }
//         5. options.allowedOrigins is given AND the request has an Origin header that is not in the list:
//                                                                403, reason "origin not allowed"
//            (A request with no Origin header at all, like curl, is let through. A script can fake Origin anyway.)
//         6. otherwise: status 101, reason "Switching Protocols" and headers
//            { Upgrade: "websocket", Connection: "Upgrade", "Sec-WebSocket-Accept": acceptKey(the key) }
//       In steps 1 to 3 and 5, headers is {} (an empty object).
//
//   encodeFrame(frame)
//       Make the bytes of one WebSocket frame. frame: { opcode, payload, fin, maskKey }.
//       opcode: 1 text, 2 binary, 8 close, 9 ping, 10 pong. payload: a string (write it as UTF-8) or a Buffer.
//       fin: true unless it is exactly false. maskKey: a list of 4 numbers, or missing (no mask).
//       Bytes: first byte = (fin ? 0x80 : 0) + opcode.
//              second byte = (mask ? 0x80 : 0) + length, when the length is 0 to 125.
//              A length of 126 to 65535: the second byte holds 126 (plus the mask bit), then two bytes with the length (big end first).
//              Then the 4 mask bytes (only when masked), then the payload.
//              A masked payload: byte i is XOR with maskKey[i % 4].
//       Throw an Error("control frame payload is at most 125 bytes") for opcode 8 or higher with a longer payload.
//       Throw an Error("payload too large for this exercise") for a payload over 65535 bytes.
//       Return a Buffer. Browsers always mask the frames they send. Servers never do.
//
//   decodeFrame(buffer)
//       The opposite. Return { fin, opcode, type, masked, payload, size } or null.
//       type comes from OPCODES (use "unknown" for a number that is not in it). payload is a Buffer, already unmasked.
//       size is how many bytes the frame used (the buffer may hold more than one frame).
//       Return null when the buffer does not hold a whole frame yet.
//       Length 127 (eight length bytes): throw an Error("payload too large for this exercise").
//
//   backoffDelay(attempt, options)
//       How long to wait before reconnecting (milliseconds). attempt starts at 0.
//       options is optional: { base, max }. base defaults to 1000, max to 30000.
//       The wait doubles each time and never goes above max: min(max, base * 2 ** attempt).
//
//   chooseTransport(need)
//       Pick a tool. need: { serverPushes, clientSendsOften, binary, delayOkSeconds }.
//       Check in this order:
//         1. the server never needs to push (serverPushes is false):         "plain-http"
//         2. binary is true OR clientSendsOften is true:                      "websocket"
//         3. delayOkSeconds is 30 or more (a late update is fine):            "polling"
//         4. otherwise (the server pushes, and quickly):                      "sse"
//
//   deliver(connections, sender, usePubSub)
//       Who gets a chat message? connections: [{ user, server }]. sender: the name of the user who wrote it.
//       Return the list of user names who receive it, in the order of connections. The sender gets it too.
//         - usePubSub false: only the users on the SAME server as the sender.
//         - usePubSub true:  every user (the servers share the message, for example through Redis pub/sub).
//       When the sender is not in connections, return [].

// ---------- helpers, already written ----------
const crypto = require("node:crypto");
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const OPCODES = { 0: "continuation", 1: "text", 2: "binary", 8: "close", 9: "ping", 10: "pong" };

// A copy of an object with every key in lower case, and every value as text.
function lower(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) out[k.toLowerCase()] = String(v);
  return out;
}

// "keep-alive, Upgrade" becomes ["keep-alive", "Upgrade"].
const list = (text) => (text || "").split(",").map((s) => s.trim()).filter(Boolean);

// ---------- your ten pieces ----------

function parseSse(text) {
  // TODO
}

function formatSse(message) {
  // TODO
}

function missedEvents(history, lastEventId) {
  // TODO
}

function acceptKey(key) {
  // TODO
}

function handshake(request, options) {
  // TODO
}

function encodeFrame(frame) {
  // TODO
}

function decodeFrame(buffer) {
  // TODO
}

function backoffDelay(attempt, options) {
  // TODO
}

function chooseTransport(need) {
  // TODO
}

function deliver(connections, sender, usePubSub) {
  // TODO
}

module.exports = { parseSse, formatSse, missedEvents, acceptKey, handshake, encodeFrame, decodeFrame, backoffDelay, chooseTransport, deliver };
