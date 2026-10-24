const test = require("node:test");
const assert = require("node:assert");
const { acceptKey, formatSseEvent, parseSse, reconnectDelay, createHub, answers } = require("./17-websockets-and-server-sent-events");

// ---- Task 1: acceptKey ----

test("acceptKey: the example from the standard (RFC 6455)", () => {
  assert.strictEqual(acceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
});

test("acceptKey: another key gives another answer, and the answer is 28 letters of base64", () => {
  const a = acceptKey("x3JJHMbDL1EzLkh9GBhXDw==");
  assert.notStrictEqual(a, acceptKey("dGhlIHNhbXBsZSBub25jZQ=="));
  assert.match(a, /^[A-Za-z0-9+/]{27}=$/);
  assert.strictEqual(a, acceptKey("x3JJHMbDL1EzLkh9GBhXDw=="), "the same key always gives the same answer");
});

// ---- Task 2: formatSseEvent ----

test("formatSseEvent: id, event and a multi-line data (the real event 3 from the lesson)", () => {
  assert.strictEqual(formatSseEvent({ id: 3, event: "note", data: "line one\nline two" }), "id: 3\nevent: note\ndata: line one\ndata: line two\n\n");
});

test("formatSseEvent: a simple event", () => {
  assert.strictEqual(formatSseEvent({ id: 1, event: "price", data: "65000" }), "id: 1\nevent: price\ndata: 65000\n\n");
});

test("formatSseEvent: data can be a number", () => {
  assert.strictEqual(formatSseEvent({ data: 65000 }), "data: 65000\n\n");
});

test("formatSseEvent: a retry block and a comment block", () => {
  assert.strictEqual(formatSseEvent({ retry: 3000 }), "retry: 3000\n\n");
  assert.strictEqual(formatSseEvent({ comment: "keep-alive comment" }), ": keep-alive comment\n\n");
});

test("formatSseEvent: the order is comment, retry, id, event, data", () => {
  assert.strictEqual(formatSseEvent({ data: "x", event: "e", id: 1, retry: 5, comment: "c" }), ": c\nretry: 5\nid: 1\nevent: e\ndata: x\n\n");
});

test("formatSseEvent: every kind of newline in data makes a new data line", () => {
  const out = formatSseEvent({ data: "a\r\nb\rc\nd" });
  assert.strictEqual(out.split("\n").filter((l) => l.startsWith("data:")).length, 4);
  assert.ok(out.endsWith("\n\n"));
  assert.ok(!out.includes("\r"), "no carriage return may be left in the text");
});

test("formatSseEvent: an id of 0 is written (it is not 'missing')", () => {
  assert.strictEqual(formatSseEvent({ id: 0, data: "x" }), "id: 0\ndata: x\n\n");
});

// ---- Task 3: parseSse ----

const REAL_STREAM =
  ": keep-alive comment\n\nretry: 3000\n\n" +
  "id: 1\nevent: price\ndata: 65000\n\n" +
  "id: 2\nevent: price\ndata: 65500\n\n" +
  "id: 3\nevent: note\ndata: line one\ndata: line two\n\n";

test("parseSse: the real stream from the lesson", () => {
  assert.deepStrictEqual(parseSse(REAL_STREAM), {
    events: [
      { id: "1", event: "price", data: "65000" },
      { id: "2", event: "price", data: "65500" },
      { id: "3", event: "note", data: "line one\nline two" },
    ],
    retry: 3000,
  });
});

test("parseSse: the Predict question (a retry block and a comment make no event)", () => {
  const text = "retry: 1000\n\nid: 7\ndata: hello\n\n: just a keep-alive\n\nid: 8\nevent: price\ndata: 65000\ndata: 65500\n\n";
  assert.deepStrictEqual(parseSse(text), {
    events: [
      { id: "7", event: "message", data: "hello" },
      { id: "8", event: "price", data: "65000\n65500" },
    ],
    retry: 1000,
  });
});

test("parseSse: only one space after the colon is dropped", () => {
  assert.strictEqual(parseSse("data: x\n\n").events[0].data, "x");
  assert.strictEqual(parseSse("data:x\n\n").events[0].data, "x");
  assert.strictEqual(parseSse("data:  x\n\n").events[0].data, " x");
});

test("parseSse: the last id stays for later events", () => {
  const out = parseSse("id: 5\ndata: a\n\ndata: b\n\nid: 6\ndata: c\n\n");
  assert.deepStrictEqual(out.events.map((e) => e.id), ["5", "5", "6"]);
});

test("parseSse: a line with no colon is a field with an empty value", () => {
  assert.deepStrictEqual(parseSse("data\n\n").events, [{ id: "", event: "message", data: "" }]);
});

test("parseSse: Windows and old Mac newlines work", () => {
  assert.strictEqual(parseSse("data: a\r\n\r\n").events.length, 1);
  assert.strictEqual(parseSse("data: a\r\rdata: b\r\r").events.length, 2);
});

test("parseSse: a bad retry is ignored, and a missing retry is null", () => {
  assert.strictEqual(parseSse("retry: abc\n\ndata: x\n\n").retry, null);
  assert.strictEqual(parseSse("retry: 12.5\n\n").retry, null);
  assert.strictEqual(parseSse("data: x\n\n").retry, null);
  assert.strictEqual(parseSse("retry: 100\n\nretry: 200\n\n").retry, 200, "the last good retry wins");
});

test("parseSse: unknown fields, comments and empty text make no events", () => {
  assert.deepStrictEqual(parseSse("foo: bar\ndata: x\n\n").events, [{ id: "", event: "message", data: "x" }]);
  assert.deepStrictEqual(parseSse(": only a comment\n\n"), { events: [], retry: null });
  assert.deepStrictEqual(parseSse(""), { events: [], retry: null });
});

test("parseSse: format then parse gives the same events", () => {
  const sent = [{ id: "1", event: "a", data: "one" }, { id: "2", event: "b", data: "x\ny\n\nz" }, { id: "3", event: "message", data: "" }];
  const text = sent.map((e) => formatSseEvent({ id: e.id, event: e.event === "message" ? undefined : e.event, data: e.data })).join("");
  assert.deepStrictEqual(parseSse(text).events, sent);
});

// ---- Task 4: reconnectDelay ----

test("reconnectDelay: with random at 0.5 the wait is half of the limit, and the limit doubles", () => {
  const half = () => 0.5;
  assert.deepStrictEqual([0, 1, 2, 3].map((n) => reconnectDelay(n, {}, half)), [250, 500, 1000, 2000]);
});

test("reconnectDelay: it stops growing at the cap", () => {
  const half = () => 0.5;
  assert.strictEqual(reconnectDelay(6, {}, half), 15000, "500 * 64 = 32000, but the cap is 30000");
  assert.strictEqual(reconnectDelay(20, {}, half), 15000);
  assert.strictEqual(reconnectDelay(1000, {}, half), 15000, "a huge attempt number must not break it");
});

test("reconnectDelay: random 0 gives 0, and a random just under 1 stays under the limit", () => {
  assert.strictEqual(reconnectDelay(5, {}, () => 0), 0);
  assert.strictEqual(reconnectDelay(0, {}, () => 0.999999), 499);
});

test("reconnectDelay: your own base and cap", () => {
  assert.strictEqual(reconnectDelay(5, { baseMs: 100, capMs: 1000 }, () => 0.5), 500);
  assert.strictEqual(reconnectDelay(1, { baseMs: 100, capMs: 1000 }, () => 0.5), 100);
});

test("reconnectDelay: a bad attempt counts as 0", () => {
  for (const bad of [-1, -50, NaN, undefined, null, "x"]) assert.strictEqual(reconnectDelay(bad, {}, () => 0.5), 250, String(bad));
});

test("reconnectDelay: the answer is a whole number, and Math.random is the default", () => {
  const samples = Array.from({ length: 200 }, () => reconnectDelay(3));
  assert.ok(samples.every((n) => Number.isInteger(n) && n >= 0 && n < 4000));
  assert.ok(new Set(samples).size > 20, "random values must differ");
});

// ---- Task 5: createHub ----

const fake = (readyState = 1) => ({ readyState, sent: [], send(m) { this.sent.push(m); } });

test("hub: a broadcast reaches only the open sockets of that room", () => {
  const hub = createHub();
  const a = fake(), b = fake(), c = fake();
  hub.join("football", a); hub.join("football", b); hub.join("chess", c);
  assert.strictEqual(hub.broadcast("football", "goal!"), 2);
  assert.deepStrictEqual(a.sent, ["goal!"]);
  assert.deepStrictEqual(b.sent, ["goal!"]);
  assert.deepStrictEqual(c.sent, []);
});

test("hub: the sender can be left out", () => {
  const hub = createHub();
  const a = fake(), b = fake();
  hub.join("r", a); hub.join("r", b);
  assert.strictEqual(hub.broadcast("r", "hi", a), 1);
  assert.deepStrictEqual(a.sent, []);
  assert.deepStrictEqual(b.sent, ["hi"]);
});

test("hub: sockets that are not open are dropped and get nothing", () => {
  const hub = createHub();
  const open = fake(1), connecting = fake(0), closing = fake(2), closed = fake(3);
  for (const s of [open, connecting, closing, closed]) hub.join("r", s);
  assert.strictEqual(hub.size("r"), 4);
  assert.strictEqual(hub.broadcast("r", "x"), 1);
  assert.deepStrictEqual([connecting.sent, closing.sent, closed.sent], [[], [], []]);
  assert.strictEqual(hub.size("r"), 1, "the three dead sockets were removed");
});

test("hub: an unknown room is 0, and joining twice is one", () => {
  const hub = createHub();
  assert.strictEqual(hub.broadcast("nobody", "x"), 0);
  assert.strictEqual(hub.size("nobody"), 0);
  const a = fake();
  hub.join("r", a); hub.join("r", a);
  assert.strictEqual(hub.size("r"), 1);
  hub.broadcast("r", "once");
  assert.deepStrictEqual(a.sent, ["once"], "one message, not two");
});

test("hub: leave removes the socket from every room", () => {
  const hub = createHub();
  const a = fake(), b = fake();
  hub.join("r1", a); hub.join("r2", a); hub.join("r1", b);
  hub.leave(a);
  assert.strictEqual(hub.size("r1"), 1);
  assert.strictEqual(hub.size("r2"), 0);
  hub.broadcast("r1", "x"); hub.broadcast("r2", "y");
  assert.deepStrictEqual(a.sent, []);
  assert.deepStrictEqual(b.sent, ["x"]);
});

test("hub: leaving a socket that is not in any room does nothing", () => {
  const hub = createHub();
  assert.doesNotThrow(() => hub.leave(fake()));
});

// ---- Task 6: answers ----

test("answers: the six short answers", () => {
  assert.deepStrictEqual(answers, {
    oneWayLivePrices: "sse",
    chatBothWays: "websocket",
    rareUpdates: "polling",
    sseConnectionsPerBrowserOnHttp1: 6,
    closeCodeNormal: 1000,
    serversShareMessagesWith: "message bus",
  });
});
