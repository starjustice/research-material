const test = require("node:test");
const assert = require("node:assert");
const {
  parseSse, formatSse, missedEvents, acceptKey, handshake, encodeFrame, decodeFrame, backoffDelay, chooseTransport, deliver,
} = require("./07-websockets-and-server-sent-events");

const copy = (value) => JSON.parse(JSON.stringify(value));
const hex = (buffer) => buffer.toString("hex");

// ---------- parseSse ----------

test("parseSse: one simple event", () => {
  assert.deepStrictEqual(parseSse("data: hello\n\n"), { events: [{ event: "message", data: "hello", id: "" }], retry: null });
});

test("parseSse: id and data", () => {
  assert.deepStrictEqual(parseSse("id: 1\ndata: tick 1\n\n").events, [{ event: "message", data: "tick 1", id: "1" }]);
});

test("parseSse: the real stream I captured from a server", () => {
  const text = "retry: 500\n\nid: 1\ndata: tick 1\n\nid: 2\ndata: tick 2\n\nid: 3\ndata: tick 3\n\n";
  const result = parseSse(text);
  assert.strictEqual(result.retry, 500);
  assert.deepStrictEqual(result.events.map((e) => e.data + "/" + e.id), ["tick 1/1", "tick 2/2", "tick 3/3"]);
});

test("parseSse: a named event", () => {
  assert.deepStrictEqual(parseSse("event: userconnect\ndata: bobby\n\n").events, [{ event: "userconnect", data: "bobby", id: "" }]);
});

test("parseSse: the event name is used once and then forgotten", () => {
  const { events } = parseSse("event: a\ndata: 1\n\ndata: 2\n\n");
  assert.deepStrictEqual(events.map((e) => e.event), ["a", "message"]);
});

test("parseSse: several data lines are joined with a line break", () => {
  assert.strictEqual(parseSse("data: first\ndata: second\ndata: third\n\n").events[0].data, "first\nsecond\nthird");
});

test("parseSse: a comment line is ignored", () => {
  assert.deepStrictEqual(parseSse(": keep alive\n\ndata: x\n\n").events, [{ event: "message", data: "x", id: "" }]);
  assert.deepStrictEqual(parseSse(": only a comment\n\n").events, []);
});

test("parseSse: only one space after the colon is dropped", () => {
  assert.strictEqual(parseSse("data:  two spaces\n\n").events[0].data, " two spaces");
  assert.strictEqual(parseSse("data:none\n\n").events[0].data, "none");
});

test("parseSse: a value can contain a colon", () => {
  assert.strictEqual(parseSse('data: {"time": "02:33:48"}\n\n').events[0].data, '{"time": "02:33:48"}');
});

test("parseSse: a line without a colon is a field with an empty value", () => {
  assert.deepStrictEqual(parseSse("data\n\n").events, [{ event: "message", data: "", id: "" }]);
});

test("parseSse: an empty data line still makes an event", () => {
  assert.strictEqual(parseSse("data:\n\n").events.length, 1);
  assert.strictEqual(parseSse("data:\n\n").events[0].data, "");
});

test("parseSse: no data line means no event", () => {
  assert.deepStrictEqual(parseSse("event: ping\n\n").events, []);
});

test("parseSse: the id stays set for the next events", () => {
  const { events } = parseSse("id: 5\ndata: a\n\ndata: b\n\nid: 9\ndata: c\n\n");
  assert.deepStrictEqual(events.map((e) => e.id), ["5", "5", "9"]);
});

test("parseSse: an id without data is remembered for the next event", () => {
  const { events } = parseSse("id: 4\n\ndata: a\n\n");
  assert.deepStrictEqual(events, [{ event: "message", data: "a", id: "4" }]);
});

test("parseSse: retry needs digits only, and the last good one wins", () => {
  assert.strictEqual(parseSse("retry: 3000\n\n").retry, 3000);
  assert.strictEqual(parseSse("retry: soon\n\n").retry, null);
  assert.strictEqual(parseSse("retry: 100\nretry: 2x\nretry: 250\n\n").retry, 250);
});

test("parseSse: unknown fields are ignored", () => {
  assert.deepStrictEqual(parseSse("color: red\ndata: x\n\n").events, [{ event: "message", data: "x", id: "" }]);
});

test("parseSse: Windows line endings and old Mac line endings", () => {
  assert.strictEqual(parseSse("data: a\r\n\r\ndata: b\r\r").events.length, 2);
  assert.deepStrictEqual(parseSse("id: 1\r\ndata: a\r\n\r\n").events, [{ event: "message", data: "a", id: "1" }]);
});

test("parseSse: an event that is not finished makes nothing", () => {
  const { events } = parseSse("data: done\n\ndata: half");
  assert.deepStrictEqual(events.map((e) => e.data), ["done"]);
});

test("parseSse: empty text", () => {
  assert.deepStrictEqual(parseSse(""), { events: [], retry: null });
});

// ---------- formatSse ----------

test("formatSse: data only", () => {
  assert.strictEqual(formatSse({ data: "hello" }), "data: hello\n\n");
});

test("formatSse: id and data", () => {
  assert.strictEqual(formatSse({ id: 7, data: "hi" }), "id: 7\ndata: hi\n\n");
});

test("formatSse: the order is id, event, retry, data", () => {
  assert.strictEqual(formatSse({ data: "d", retry: 500, event: "e", id: "1" }), "id: 1\nevent: e\nretry: 500\ndata: d\n\n");
});

test("formatSse: a data value with line breaks becomes several data lines", () => {
  assert.strictEqual(formatSse({ data: "a\nb\r\nc" }), "data: a\ndata: b\ndata: c\n\n");
});

test("formatSse: a retry message with no data", () => {
  assert.strictEqual(formatSse({ retry: 500 }), "retry: 500\n\n");
});

test("formatSse: id 0 is still written", () => {
  assert.strictEqual(formatSse({ id: 0, data: "x" }), "id: 0\ndata: x\n\n");
});

test("formatSse: an id with a line break throws", () => {
  assert.throws(() => formatSse({ id: "a\nb", data: "x" }), /id must not contain a line break/);
  assert.throws(() => formatSse({ id: "a\rb", data: "x" }), /id must not contain a line break/);
});

test("formatSse and parseSse are opposites", () => {
  const message = { id: "42", event: "price", data: "line one\nline two" };
  const { events } = parseSse(formatSse(message));
  assert.deepStrictEqual(events, [{ event: "price", data: "line one\nline two", id: "42" }]);
});

// ---------- missedEvents ----------

const history = [{ id: 1, data: "a" }, { id: 2, data: "b" }, { id: 3, data: "c" }, { id: 4, data: "d" }];

test("missedEvents: a new visitor gets nothing old", () => {
  assert.deepStrictEqual(missedEvents(history, undefined), []);
  assert.deepStrictEqual(missedEvents(history, ""), []);
  assert.deepStrictEqual(missedEvents(history, null), []);
});

test("missedEvents: everything after the last id", () => {
  assert.deepStrictEqual(missedEvents(history, "2"), [{ id: 3, data: "c" }, { id: 4, data: "d" }]);
});

test("missedEvents: the header is text, the ids are numbers", () => {
  assert.deepStrictEqual(missedEvents(history, "1").map((x) => x.data), ["b", "c", "d"]);
  assert.deepStrictEqual(missedEvents(history, 3).map((x) => x.data), ["d"]);
});

test("missedEvents: the newest id means nothing was missed", () => {
  assert.deepStrictEqual(missedEvents(history, "4"), []);
});

test("missedEvents: an id that is no longer in the history returns null", () => {
  assert.strictEqual(missedEvents(history, "0"), null);
  assert.strictEqual(missedEvents(history, "99"), null);
  assert.strictEqual(missedEvents([], "5"), null);
});

test("missedEvents: does not change the history", () => {
  const before = copy(history);
  missedEvents(history, "2");
  assert.deepStrictEqual(history, before);
});

// ---------- acceptKey ----------

test("acceptKey: the example from RFC 6455", () => {
  assert.strictEqual(acceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
});

test("acceptKey: another key gives another answer", () => {
  assert.notStrictEqual(acceptKey("x3JJHMbDL1EzLkh9GBhXDw=="), acceptKey("dGhlIHNhbXBsZSBub25jZQ=="));
  assert.strictEqual(acceptKey("x3JJHMbDL1EzLkh9GBhXDw=="), "HSmrc0sMlYUkAGmm5OPpG2HaGWk=");
});

// ---------- handshake ----------

const good = () => ({
  method: "GET",
  headers: { Host: "example.com", Upgrade: "websocket", Connection: "Upgrade", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==", "Sec-WebSocket-Version": "13" },
});

test("handshake: a good request gets 101 and the accept key", () => {
  assert.deepStrictEqual(handshake(good()), {
    status: 101,
    reason: "Switching Protocols",
    headers: { Upgrade: "websocket", Connection: "Upgrade", "Sec-WebSocket-Accept": "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" },
  });
});

test("handshake: header names and the method can be in any letter case", () => {
  const r = { method: "get", headers: { upgrade: "WebSocket", CONNECTION: "upgrade", "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==", "SEC-WEBSOCKET-VERSION": "13" } };
  assert.strictEqual(handshake(r).status, 101);
});

test("handshake: Connection can be a list", () => {
  const r = good();
  r.headers.Connection = "keep-alive, Upgrade";
  assert.strictEqual(handshake(r).status, 101);
});

test("handshake: a POST gets 405", () => {
  const r = good();
  r.method = "POST";
  assert.deepStrictEqual(handshake(r), { status: 405, reason: "method must be GET", headers: {} });
});

test("handshake: a plain GET without Upgrade gets 426", () => {
  const r = { method: "GET", headers: { Host: "example.com" } };
  assert.deepStrictEqual(handshake(r), { status: 426, reason: "Upgrade Required", headers: {} });
});

test("handshake: Upgrade must say websocket", () => {
  const r = good();
  r.headers.Upgrade = "h2c";
  assert.strictEqual(handshake(r).status, 426);
});

test("handshake: Connection must have upgrade", () => {
  const r = good();
  r.headers.Connection = "keep-alive";
  assert.strictEqual(handshake(r).status, 426);
  delete r.headers.Connection;
  assert.strictEqual(handshake(r).status, 426);
});

test("handshake: a missing key gets 400", () => {
  const r = good();
  delete r.headers["Sec-WebSocket-Key"];
  assert.deepStrictEqual(handshake(r), { status: 400, reason: "missing Sec-WebSocket-Key", headers: {} });
});

test("handshake: another version gets 426 and says which one it knows", () => {
  const r = good();
  r.headers["Sec-WebSocket-Version"] = "8";
  assert.deepStrictEqual(handshake(r), { status: 426, reason: "unsupported version", headers: { "Sec-WebSocket-Version": "13" } });
  delete r.headers["Sec-WebSocket-Version"];
  assert.strictEqual(handshake(r).status, 426);
});

test("handshake: the order of the checks: method, then upgrade, then key, then version", () => {
  const noKeyBadVersion = good();
  delete noKeyBadVersion.headers["Sec-WebSocket-Key"];
  noKeyBadVersion.headers["Sec-WebSocket-Version"] = "8";
  assert.strictEqual(handshake(noKeyBadVersion).status, 400);
  const postNoUpgrade = { method: "POST", headers: {} };
  assert.strictEqual(handshake(postNoUpgrade).status, 405);
});

test("handshake: an origin in the list is accepted", () => {
  const r = good();
  r.headers.Origin = "http://localhost:3000";
  assert.strictEqual(handshake(r, { allowedOrigins: ["http://localhost:3000", "https://app.example.com"] }).status, 101);
});

test("handshake: an origin that is not in the list gets 403", () => {
  const r = good();
  r.headers.Origin = "http://evil.com";
  assert.deepStrictEqual(handshake(r, { allowedOrigins: ["http://localhost:3000"] }), { status: 403, reason: "origin not allowed", headers: {} });
});

test("handshake: the origin must match exactly", () => {
  const r = good();
  r.headers.origin = "http://localhost:3000/";
  assert.strictEqual(handshake(r, { allowedOrigins: ["http://localhost:3000"] }).status, 403);
  r.headers.origin = "http://localhost:3001";
  assert.strictEqual(handshake(r, { allowedOrigins: ["http://localhost:3000"] }).status, 403);
});

test("handshake: with no list, any origin is accepted (the default of most servers)", () => {
  const r = good();
  r.headers.Origin = "http://evil.com";
  assert.strictEqual(handshake(r).status, 101);
  assert.strictEqual(handshake(r, {}).status, 101);
});

test("handshake: a client with no Origin header (curl) is let through", () => {
  assert.strictEqual(handshake(good(), { allowedOrigins: ["http://localhost:3000"] }).status, 101);
});

test("handshake: a bad version is reported before a bad origin", () => {
  const r = good();
  r.headers.Origin = "http://evil.com";
  r.headers["Sec-WebSocket-Version"] = "8";
  assert.strictEqual(handshake(r, { allowedOrigins: [] }).status, 426);
});

test("handshake: does not change the request", () => {
  const r = good();
  const before = copy(r);
  handshake(r, { allowedOrigins: ["x"] });
  assert.deepStrictEqual(r, before);
});

// ---------- encodeFrame ----------

test("encodeFrame: the server frame I captured, text echo: hi", () => {
  assert.strictEqual(hex(encodeFrame({ opcode: 1, payload: "echo: hi" })), "81086563686f3a206869");
});

test("encodeFrame: the client frame I captured, masked text hi", () => {
  assert.strictEqual(hex(encodeFrame({ opcode: 1, payload: "hi", maskKey: [1, 2, 3, 4] })), "818201020304696b");
});

test("encodeFrame: the example from MDN, hello with mask 1 2 3 4", () => {
  assert.deepStrictEqual([...encodeFrame({ opcode: 1, payload: "hello", maskKey: [1, 2, 3, 4] })], [129, 133, 1, 2, 3, 4, 105, 103, 111, 104, 110]);
});

test("encodeFrame: an empty text frame", () => {
  assert.strictEqual(hex(encodeFrame({ opcode: 1, payload: "" })), "8100");
});

test("encodeFrame: ping and pong", () => {
  assert.strictEqual(hex(encodeFrame({ opcode: 10, payload: "p" })), "8a0170");
  assert.strictEqual(hex(encodeFrame({ opcode: 9, payload: "p", maskKey: [9, 9, 9, 9] })), "89810909090979");
});

test("encodeFrame: binary frame from a Buffer", () => {
  assert.strictEqual(hex(encodeFrame({ opcode: 2, payload: Buffer.from([1, 2, 3]) })), "8203010203");
});

test("encodeFrame: fin false is the first piece of a longer message", () => {
  assert.strictEqual(hex(encodeFrame({ opcode: 1, payload: "ab", fin: false })), "01026162");
  assert.strictEqual(hex(encodeFrame({ opcode: 0, payload: "cd", fin: true })), "80026364");
});

test("encodeFrame: 125 bytes is the longest short length", () => {
  const bytes = encodeFrame({ opcode: 2, payload: Buffer.alloc(125, 7) });
  assert.strictEqual(bytes.length, 127);
  assert.strictEqual(bytes[1], 125);
});

test("encodeFrame: 126 bytes uses two length bytes", () => {
  const bytes = encodeFrame({ opcode: 2, payload: Buffer.alloc(126, 7) });
  assert.deepStrictEqual([...bytes.subarray(0, 4)], [0x82, 126, 0, 126]);
  assert.strictEqual(bytes.length, 4 + 126);
});

test("encodeFrame: 300 bytes, masked", () => {
  const bytes = encodeFrame({ opcode: 2, payload: Buffer.alloc(300, 0), maskKey: [1, 2, 3, 4] });
  assert.deepStrictEqual([...bytes.subarray(0, 8)], [0x82, 0x80 | 126, 1, 44, 1, 2, 3, 4]);
  assert.strictEqual(bytes.length, 8 + 300);
  assert.deepStrictEqual([...bytes.subarray(8, 12)], [1, 2, 3, 4]);
});

test("encodeFrame: letters with more than one byte count in bytes", () => {
  const bytes = encodeFrame({ opcode: 1, payload: "é" });
  assert.strictEqual(bytes[1], 2);
  assert.strictEqual(bytes.length, 4);
});

test("encodeFrame: a long control frame throws", () => {
  assert.throws(() => encodeFrame({ opcode: 9, payload: "x".repeat(126) }), /control frame payload is at most 125 bytes/);
  assert.throws(() => encodeFrame({ opcode: 8, payload: Buffer.alloc(200) }), /control frame payload is at most 125 bytes/);
  assert.doesNotThrow(() => encodeFrame({ opcode: 9, payload: "x".repeat(125) }));
});

test("encodeFrame: a huge payload throws", () => {
  assert.throws(() => encodeFrame({ opcode: 2, payload: Buffer.alloc(65536) }), /payload too large for this exercise/);
  assert.doesNotThrow(() => encodeFrame({ opcode: 2, payload: Buffer.alloc(65535) }));
});

test("encodeFrame: does not change the mask key or the payload", () => {
  const key = [1, 2, 3, 4];
  const payload = Buffer.from("hello");
  encodeFrame({ opcode: 1, payload, maskKey: key });
  assert.deepStrictEqual(key, [1, 2, 3, 4]);
  assert.strictEqual(payload.toString(), "hello");
});

// ---------- decodeFrame ----------

test("decodeFrame: a masked client frame", () => {
  const frame = decodeFrame(Buffer.from("818201020304696b", "hex"));
  assert.strictEqual(frame.fin, true);
  assert.strictEqual(frame.opcode, 1);
  assert.strictEqual(frame.type, "text");
  assert.strictEqual(frame.masked, true);
  assert.strictEqual(frame.payload.toString(), "hi");
  assert.strictEqual(frame.size, 8);
});

test("decodeFrame: an unmasked server frame", () => {
  const frame = decodeFrame(Buffer.from("81086563686f3a206869", "hex"));
  assert.strictEqual(frame.masked, false);
  assert.strictEqual(frame.payload.toString(), "echo: hi");
  assert.strictEqual(frame.size, 10);
});

test("decodeFrame: the example from MDN", () => {
  const bytes = Buffer.from([129, 133, 1, 2, 3, 4, 105, 103, 111, 104, 110]);
  assert.strictEqual(decodeFrame(bytes).payload.toString(), "hello");
});

test("decodeFrame: the names of the opcodes", () => {
  const type = (hexText) => decodeFrame(Buffer.from(hexText, "hex")).type;
  assert.strictEqual(type("0100"), "text");
  assert.strictEqual(type("8200"), "binary");
  assert.strictEqual(type("8000"), "continuation");
  assert.strictEqual(type("8800"), "close");
  assert.strictEqual(type("8900"), "ping");
  assert.strictEqual(type("8a00"), "pong");
  assert.strictEqual(type("8300"), "unknown");
});

test("decodeFrame: fin false", () => {
  const frame = decodeFrame(Buffer.from("01026162", "hex"));
  assert.strictEqual(frame.fin, false);
  assert.strictEqual(frame.payload.toString(), "ab");
});

test("decodeFrame: a pong with a payload", () => {
  const frame = decodeFrame(Buffer.from("8a0170", "hex"));
  assert.strictEqual(frame.type, "pong");
  assert.strictEqual(frame.payload.toString(), "p");
});

test("decodeFrame: two byte length", () => {
  const frame = decodeFrame(encodeFrame({ opcode: 2, payload: Buffer.alloc(300, 5), maskKey: [9, 8, 7, 6] }));
  assert.strictEqual(frame.payload.length, 300);
  assert.ok(frame.payload.every((b) => b === 5));
  assert.strictEqual(frame.size, 8 + 300);
});

test("decodeFrame: a buffer that is not a whole frame yet gives null", () => {
  assert.strictEqual(decodeFrame(Buffer.alloc(0)), null);
  assert.strictEqual(decodeFrame(Buffer.from("81", "hex")), null);
  assert.strictEqual(decodeFrame(Buffer.from("818201020304", "hex")), null);
  assert.strictEqual(decodeFrame(Buffer.from("8108656368", "hex")), null);
  assert.strictEqual(decodeFrame(Buffer.from("827e", "hex")), null);
});

test("decodeFrame: size lets you read the next frame from the same buffer", () => {
  const both = Buffer.concat([encodeFrame({ opcode: 1, payload: "one" }), encodeFrame({ opcode: 1, payload: "two" })]);
  const first = decodeFrame(both);
  const second = decodeFrame(both.subarray(first.size));
  assert.strictEqual(first.payload.toString(), "one");
  assert.strictEqual(second.payload.toString(), "two");
});

test("decodeFrame: eight length bytes throw", () => {
  const bytes = Buffer.concat([Buffer.from("827f", "hex"), Buffer.alloc(8)]);
  assert.throws(() => decodeFrame(bytes), /payload too large for this exercise/);
});

test("decodeFrame: does not change the buffer", () => {
  const bytes = Buffer.from("818201020304696b", "hex");
  decodeFrame(bytes);
  assert.strictEqual(hex(bytes), "818201020304696b");
});

test("encodeFrame and decodeFrame are opposites, with and without a mask", () => {
  for (const maskKey of [undefined, [200, 100, 50, 25]]) {
    for (const text of ["", "a", "hello world", "x".repeat(125), "y".repeat(126), "z".repeat(1000), "naïve café"]) {
      const frame = decodeFrame(encodeFrame({ opcode: 1, payload: text, maskKey }));
      assert.strictEqual(frame.payload.toString("utf8"), text);
      assert.strictEqual(frame.masked, Boolean(maskKey));
    }
  }
});

// ---------- backoffDelay ----------

test("backoffDelay: doubles each time", () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((n) => backoffDelay(n)), [1000, 2000, 4000, 8000, 16000]);
});

test("backoffDelay: never goes above 30 seconds by default", () => {
  assert.strictEqual(backoffDelay(5), 30000);
  assert.strictEqual(backoffDelay(50), 30000);
});

test("backoffDelay: base and max can be set", () => {
  assert.strictEqual(backoffDelay(0, { base: 250 }), 250);
  assert.strictEqual(backoffDelay(3, { base: 250 }), 2000);
  assert.strictEqual(backoffDelay(10, { base: 250, max: 5000 }), 5000);
  assert.strictEqual(backoffDelay(2, { max: 3000 }), 3000);
  assert.strictEqual(backoffDelay(1, {}), 2000);
});

// ---------- chooseTransport ----------

test("chooseTransport: a normal page that never gets pushes", () => {
  assert.strictEqual(chooseTransport({ serverPushes: false, clientSendsOften: false, binary: false, delayOkSeconds: 0 }), "plain-http");
});

test("chooseTransport: a chat needs a WebSocket", () => {
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: true, binary: false, delayOkSeconds: 0 }), "websocket");
});

test("chooseTransport: binary data needs a WebSocket", () => {
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: false, binary: true, delayOkSeconds: 0 }), "websocket");
});

test("chooseTransport: a live feed that only goes down is SSE", () => {
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: false, binary: false, delayOkSeconds: 1 }), "sse");
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: false, binary: false, delayOkSeconds: 29 }), "sse");
});

test("chooseTransport: when 30 seconds late is fine, polling is the simple choice", () => {
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: false, binary: false, delayOkSeconds: 30 }), "polling");
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: false, binary: false, delayOkSeconds: 600 }), "polling");
});

test("chooseTransport: websocket wins over polling when the client talks a lot", () => {
  assert.strictEqual(chooseTransport({ serverPushes: true, clientSendsOften: true, binary: false, delayOkSeconds: 600 }), "websocket");
});

test("chooseTransport: no push wins over everything", () => {
  assert.strictEqual(chooseTransport({ serverPushes: false, clientSendsOften: true, binary: true, delayOkSeconds: 0 }), "plain-http");
});

test("chooseTransport: a missing delayOkSeconds means push quickly", () => {
  assert.strictEqual(chooseTransport({ serverPushes: true }), "sse");
});

// ---------- deliver ----------

const people = [
  { user: "Ann", server: "A" },
  { user: "Bob", server: "B" },
  { user: "Cy", server: "A" },
  { user: "Di", server: "C" },
];

test("deliver: without a shared bus only the same server gets it", () => {
  assert.deepStrictEqual(deliver(people, "Ann", false), ["Ann", "Cy"]);
  assert.deepStrictEqual(deliver(people, "Bob", false), ["Bob"]);
});

test("deliver: with pub/sub everybody gets it", () => {
  assert.deepStrictEqual(deliver(people, "Ann", true), ["Ann", "Bob", "Cy", "Di"]);
  assert.deepStrictEqual(deliver(people, "Di", true), ["Ann", "Bob", "Cy", "Di"]);
});

test("deliver: the order follows the connections list", () => {
  const shuffled = [people[2], people[0], people[3], people[1]];
  assert.deepStrictEqual(deliver(shuffled, "Cy", false), ["Cy", "Ann"]);
});

test("deliver: an unknown sender gives an empty list", () => {
  assert.deepStrictEqual(deliver(people, "Zed", true), []);
  assert.deepStrictEqual(deliver([], "Ann", false), []);
});

test("deliver: does not change the connections", () => {
  const before = copy(people);
  deliver(people, "Ann", true);
  assert.deepStrictEqual(people, before);
});
