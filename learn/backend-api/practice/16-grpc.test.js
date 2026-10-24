const test = require("node:test");
const assert = require("node:assert");
const {
  encodeVarint, decodeVarint, encodeMessage, decodeMessage, grpcToHttp, retryAdvice, remainingMs, answers,
} = require("./16-grpc");

const hex = (b) => Buffer.from(b).toString("hex").replace(/(..)/g, "$1 ").trim();
const fromHex = (s) => Buffer.from(s.replace(/\s+/g, ""), "hex");

// ---- Task 1: encodeVarint (every value below was made by the real protobuf library) ----

test("encodeVarint: small numbers are one byte", () => {
  assert.strictEqual(hex(encodeVarint(0)), "00");
  assert.strictEqual(hex(encodeVarint(1)), "01");
  assert.strictEqual(hex(encodeVarint(127)), "7f");
});

test("encodeVarint: 128 and more need more bytes (the top bit says more follows)", () => {
  assert.strictEqual(hex(encodeVarint(128)), "80 01");
  assert.strictEqual(hex(encodeVarint(150)), "96 01", "the example from the protobuf docs");
  assert.strictEqual(hex(encodeVarint(300)), "ac 02");
  assert.strictEqual(hex(encodeVarint(16384)), "80 80 01");
});

test("encodeVarint: it returns a Buffer", () => {
  assert.ok(Buffer.isBuffer(encodeVarint(5)));
});

test("encodeVarint: a number bigger than 32 bits still works (no bit shifts)", () => {
  const big = 2 ** 33 + 5;
  const bytes = encodeVarint(big);
  assert.ok(bytes.length >= 5);
  assert.strictEqual(decodeVarint(bytes).value, big);
});

// ---- Task 2: decodeVarint ----

test("decodeVarint: reads the number and says how many bytes it used", () => {
  assert.deepStrictEqual(decodeVarint(fromHex("96 01")), { value: 150, length: 2 });
  assert.deepStrictEqual(decodeVarint(fromHex("01")), { value: 1, length: 1 });
  assert.deepStrictEqual(decodeVarint(fromHex("80 80 01")), { value: 16384, length: 3 });
});

test("decodeVarint: reads from an offset, and stops at the end of the number", () => {
  const buf = fromHex("08 96 01 10 01");
  assert.deepStrictEqual(decodeVarint(buf, 1), { value: 150, length: 2 });
  assert.deepStrictEqual(decodeVarint(buf, 4), { value: 1, length: 1 });
});

test("decodeVarint: encode then decode gives the number back", () => {
  for (const n of [0, 1, 2, 63, 64, 127, 128, 129, 255, 256, 300, 16383, 16384, 2 ** 21, 2 ** 28, 2 ** 31, 2 ** 40]) {
    assert.deepStrictEqual(decodeVarint(encodeVarint(n)).value, n, String(n));
  }
});

test("decodeVarint: a number that is cut off is an error", () => {
  assert.throws(() => decodeVarint(fromHex("96")), Error);
  assert.throws(() => decodeVarint(Buffer.alloc(0)), Error);
});

// ---- Task 3: encodeMessage and decodeMessage ----

test("encodeMessage: the number example from the protobuf docs", () => {
  assert.strictEqual(hex(encodeMessage([[1, 150]])), "08 96 01");
});

test("encodeMessage: the text example from the protobuf docs", () => {
  assert.strictEqual(hex(encodeMessage([[2, "testing"]])), "12 07 74 65 73 74 69 6e 67");
});

test("encodeMessage: Point { x: 150, y: 1 } (the lesson's Predict question)", () => {
  assert.strictEqual(hex(encodeMessage([[1, 150], [2, 1]])), "08 96 01 10 01");
});

test("encodeMessage: the real User from the lesson is 24 bytes", () => {
  const bytes = encodeMessage([[1, 1], [2, "Ana"], [3, "ana@example.com"]]);
  assert.strictEqual(hex(bytes), "08 01 12 03 41 6e 61 1a 0f 61 6e 61 40 65 78 61 6d 70 6c 65 2e 63 6f 6d");
  assert.strictEqual(bytes.length, 24);
  assert.strictEqual(Buffer.byteLength(JSON.stringify({ id: 1, name: "Ana", email: "ana@example.com" })), 47);
});

test("encodeMessage: a text is counted in bytes, not letters", () => {
  const bytes = encodeMessage([[2, "é"]]);                       // one letter, two bytes in UTF-8
  assert.strictEqual(hex(bytes), "12 02 c3 a9");
});

test("encodeMessage: a field number of 16 or more needs a two-byte tag", () => {
  assert.strictEqual(hex(encodeMessage([[16, 1]])), "80 01 01");   // tag = 16 * 8 = 128, which is the varint 80 01
});

test("encodeMessage: an empty list is an empty message", () => {
  assert.strictEqual(encodeMessage([]).length, 0);
});

test("decodeMessage: reads the fields back", () => {
  const out = decodeMessage(fromHex("08 01 12 03 41 6e 61 1a 0f 61 6e 61 40 65 78 61 6d 70 6c 65 2e 63 6f 6d"));
  assert.deepStrictEqual(out, [
    { field: 1, wireType: 0, value: 1 },
    { field: 2, wireType: 2, value: "Ana" },
    { field: 3, wireType: 2, value: "ana@example.com" },
  ]);
});

test("decodeMessage: encode then decode gives the same fields", () => {
  const fields = [[1, 99999], [2, "héllo wörld"], [20, 7], [21, ""]];
  const out = decodeMessage(encodeMessage(fields));
  assert.deepStrictEqual(out.map((f) => [f.field, f.value]), fields);
});

test("decodeMessage: an unknown kind is an error", () => {
  assert.throws(() => decodeMessage(fromHex("0d 00 00 00 00")), /unsupported wire type/);   // tag 0d = field 1, kind 5
});

test("decodeMessage: a text that is longer than the data is an error", () => {
  assert.throws(() => decodeMessage(fromHex("12 09 41 6e 61")), Error);
});

test("decodeMessage: an empty buffer is an empty list", () => {
  assert.deepStrictEqual(decodeMessage(Buffer.alloc(0)), []);
});

// ---- Task 4: grpcToHttp ----

test("grpcToHttp: all 17 codes", () => {
  const want = [200, 499, 500, 400, 504, 404, 409, 403, 429, 400, 409, 400, 501, 500, 503, 500, 401];
  want.forEach((status, code) => assert.strictEqual(grpcToHttp(code), status, `code ${code}`));
});

test("grpcToHttp: anything else is 500, and it never throws", () => {
  for (const code of [17, -1, 1.5, "5", undefined, null, NaN, {}, "NOT_FOUND"]) {
    assert.strictEqual(grpcToHttp(code), 500, String(code));
  }
});

// ---- Task 5: retryAdvice and remainingMs ----

test("retryAdvice: the advice from the gRPC docs", () => {
  assert.strictEqual(retryAdvice("UNAVAILABLE"), "retry with backoff");
  assert.strictEqual(retryAdvice("ABORTED"), "retry at a higher level");
  assert.strictEqual(retryAdvice("FAILED_PRECONDITION"), "fix first");
});

test("retryAdvice: bad requests are not retried, and neither is anything unknown", () => {
  for (const name of ["INVALID_ARGUMENT", "NOT_FOUND", "ALREADY_EXISTS", "PERMISSION_DENIED", "UNAUTHENTICATED", "UNIMPLEMENTED", "SOMETHING_NEW", "", undefined, "toString"]) {
    assert.strictEqual(retryAdvice(name), "do not retry", String(name));
  }
});

test("remainingMs: the time left, never below zero", () => {
  assert.strictEqual(remainingMs(1000, 400), 600);
  assert.strictEqual(remainingMs(1000, 1000), 0);
  assert.strictEqual(remainingMs(1000, 1500), 0, "an expired deadline is 0, not -500");
});

test("remainingMs: a chain of services shares one deadline", () => {
  const deadline = 2000;                      // the client allowed 2 seconds from time 0
  const atB = remainingMs(deadline, 300);     // service A took 300 ms, then calls B
  const atC = remainingMs(deadline, 300 + 900);
  assert.strictEqual(atB, 1700);
  assert.strictEqual(atC, 800);
  assert.ok(atC < atB, "each hop has less time than the one before");
});

// ---- Task 6: answers ----

test("answers: the five short answers", () => {
  assert.deepStrictEqual(answers, {
    fieldNamesAreInTheBytes: false,
    httpStatusOfAFailedGrpcCall: 200,
    defaultDeadline: "none",
    whenYouDeleteAField: "reserve its number",
    browserNeedsSomethingExtra: true,
  });
});
