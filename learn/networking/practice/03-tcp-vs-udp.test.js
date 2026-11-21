const test = require("node:test");
const assert = require("node:assert");
const { handshake, splitIntoSegments, reassemble, sendReliably, udpDeliver, closeConnection, chooseProtocol, sendLimit, congestionWindows, canBind } = require("./03-tcp-vs-udp");

const same = (value) => JSON.parse(JSON.stringify(value));

// ---------- handshake ----------

test("handshake: SYN, then SYN+ACK, then ACK", () => {
  assert.deepStrictEqual(handshake(100, 300), [
    { from: "client", flags: ["SYN"], seq: 100 },
    { from: "server", flags: ["SYN", "ACK"], seq: 300, ack: 101 },
    { from: "client", flags: ["ACK"], seq: 101, ack: 301 },
  ]);
});

test("handshake: each side answers with the other side's number plus one", () => {
  const [syn, synAck, ack] = handshake(7, 9000);
  assert.strictEqual(synAck.ack, syn.seq + 1);
  assert.strictEqual(ack.ack, synAck.seq + 1);
  assert.strictEqual(ack.seq, syn.seq + 1);
});

test("handshake: zero is a fine start number", () => {
  const list = handshake(0, 0);
  assert.strictEqual(list[1].ack, 1);
  assert.strictEqual(list[2].ack, 1);
  assert.strictEqual(list[2].seq, 1);
});

test("handshake: the first segment has no ack key", () => {
  assert.strictEqual("ack" in handshake(1, 2)[0], false);
});

test("handshake: bad numbers throw", () => {
  assert.throws(() => handshake(-1, 5), Error);
  assert.throws(() => handshake(1.5, 5), Error);
  assert.throws(() => handshake(1, "5"), Error);
  assert.throws(() => handshake(1), Error);
});

// ---------- splitIntoSegments ----------

test("splitIntoSegments: cuts into pieces and numbers the first byte of each", () => {
  assert.deepStrictEqual(splitIntoSegments("HELLOWORLD", 4), [
    { seq: 0, data: "HELL" },
    { seq: 4, data: "OWOR" },
    { seq: 8, data: "LD" },
  ]);
});

test("splitIntoSegments: a short text is one piece", () => {
  assert.deepStrictEqual(splitIntoSegments("hi", 1460), [{ seq: 0, data: "hi" }]);
});

test("splitIntoSegments: an exact multiple has no empty last piece", () => {
  assert.deepStrictEqual(splitIntoSegments("abcd", 2), [{ seq: 0, data: "ab" }, { seq: 2, data: "cd" }]);
});

test("splitIntoSegments: empty text gives no pieces", () => {
  assert.deepStrictEqual(splitIntoSegments("", 3), []);
});

test("splitIntoSegments: mss must be a whole number of 1 or more", () => {
  assert.throws(() => splitIntoSegments("abc", 0), Error);
  assert.throws(() => splitIntoSegments("abc", -2), Error);
  assert.throws(() => splitIntoSegments("abc", 2.5), Error);
});

// ---------- reassemble ----------

test("reassemble: pieces in order give the whole text", () => {
  const parts = splitIntoSegments("HELLOWORLD", 4);
  assert.deepStrictEqual(reassemble(parts), { data: "HELLOWORLD", ack: 10 });
});

test("reassemble: pieces in the wrong order are put right", () => {
  const parts = splitIntoSegments("HELLOWORLD", 4);
  const mixed = [parts[2], parts[0], parts[1]];
  assert.deepStrictEqual(reassemble(mixed), { data: "HELLOWORLD", ack: 10 });
});

test("reassemble: a gap stops the data and ack points at the missing byte", () => {
  const parts = splitIntoSegments("HELLOWORLD", 4);
  assert.deepStrictEqual(reassemble([parts[0], parts[2]]), { data: "HELL", ack: 4 });
});

test("reassemble: a piece that arrives after a gap is kept until the gap is filled", () => {
  const parts = splitIntoSegments("HELLOWORLD", 4);
  assert.strictEqual(reassemble([parts[1], parts[2]]).data, "");
  assert.strictEqual(reassemble([parts[1], parts[2]]).ack, 0);
  assert.strictEqual(reassemble([parts[1], parts[2], parts[0]]).data, "HELLOWORLD");
});

test("reassemble: a piece that arrives twice is used once", () => {
  const parts = splitIntoSegments("HELLOWORLD", 4);
  assert.deepStrictEqual(reassemble([parts[0], parts[0], parts[1], parts[1], parts[2]]), { data: "HELLOWORLD", ack: 10 });
});

test("reassemble: nothing arrived", () => {
  assert.deepStrictEqual(reassemble([]), { data: "", ack: 0 });
});

test("reassemble: a piece that starts later than byte 0 cannot start the data", () => {
  assert.deepStrictEqual(reassemble([{ seq: 1, data: "bc" }]), { data: "", ack: 0 });
});

test("reassemble: overlapping pieces do not repeat bytes", () => {
  assert.deepStrictEqual(reassemble([{ seq: 0, data: "abcd" }, { seq: 2, data: "cdef" }]), { data: "abcdef", ack: 6 });
});

test("reassemble: does not change its input", () => {
  const parts = [{ seq: 4, data: "OWOR" }, { seq: 0, data: "HELL" }];
  const copy = same(parts);
  reassemble(parts);
  assert.deepStrictEqual(parts, copy);
});

// ---------- sendReliably ----------

test("sendReliably: no loss means one send per piece", () => {
  const result = sendReliably("HELLOWORLD", 4, []);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.data, "HELLOWORLD");
  assert.strictEqual(result.retransmissions, 0);
  assert.deepStrictEqual(result.log, [
    { n: 1, seq: 0, attempt: 1, lost: false },
    { n: 2, seq: 4, attempt: 1, lost: false },
    { n: 3, seq: 8, attempt: 1, lost: false },
  ]);
});

test("sendReliably: a lost send is sent again and the text still arrives whole", () => {
  const result = sendReliably("HELLOWORLD", 4, [2]);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.data, "HELLOWORLD");
  assert.strictEqual(result.retransmissions, 1);
  assert.deepStrictEqual(result.log, [
    { n: 1, seq: 0, attempt: 1, lost: false },
    { n: 2, seq: 4, attempt: 1, lost: true },
    { n: 3, seq: 4, attempt: 2, lost: false },
    { n: 4, seq: 8, attempt: 1, lost: false },
  ]);
});

test("sendReliably: the send number counts the retries too", () => {
  // Sends 1 and 2 are lost: the first piece needs three sends. Send 4 is the second piece.
  const result = sendReliably("abcd", 2, [1, 2]);
  assert.deepStrictEqual(result.log.map((e) => [e.n, e.seq, e.attempt, e.lost]), [
    [1, 0, 1, true],
    [2, 0, 2, true],
    [3, 0, 3, false],
    [4, 2, 1, false],
  ]);
  assert.strictEqual(result.retransmissions, 2);
});

test("sendReliably: a lost send number can hit a retry", () => {
  const result = sendReliably("abcd", 2, [3]);
  assert.deepStrictEqual(result.log.map((e) => [e.n, e.seq, e.attempt, e.lost]), [
    [1, 0, 1, false],
    [2, 2, 1, false],
  ]);
  const second = sendReliably("abcd", 2, [2, 3]);
  assert.deepStrictEqual(second.log.map((e) => [e.n, e.seq, e.attempt, e.lost]), [
    [1, 0, 1, false],
    [2, 2, 1, true],
    [3, 2, 2, true],
    [4, 2, 3, false],
  ]);
  assert.strictEqual(second.data, "abcd");
});

test("sendReliably: it gives up after maxAttempts and keeps what arrived before", () => {
  const result = sendReliably("HELLOWORLD", 4, [2, 3, 4], 3);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.data, "HELL");
  assert.strictEqual(result.log.length, 4);
  assert.strictEqual(result.retransmissions, 2);
  assert.deepStrictEqual(result.log[3], { n: 4, seq: 4, attempt: 3, lost: true });
});

test("sendReliably: maxAttempts defaults to 5", () => {
  const five = sendReliably("ab", 2, [1, 2, 3, 4, 5]);
  assert.strictEqual(five.ok, false);
  assert.strictEqual(five.log.length, 5);
  const four = sendReliably("ab", 2, [1, 2, 3, 4]);
  assert.strictEqual(four.ok, true);
  assert.strictEqual(four.log.length, 5);
});

test("sendReliably: the last allowed attempt can still work", () => {
  const result = sendReliably("ab", 2, [1, 2], 3);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.data, "ab");
});

test("sendReliably: empty text sends nothing", () => {
  assert.deepStrictEqual(sendReliably("", 4, [1]), { ok: true, data: "", log: [], retransmissions: 0 });
});

test("sendReliably: does not change the list of lost sends", () => {
  const lost = [2, 3];
  sendReliably("HELLOWORLD", 4, lost);
  assert.deepStrictEqual(lost, [2, 3]);
});

// ---------- udpDeliver ----------

test("udpDeliver: everything arrives in order", () => {
  assert.deepStrictEqual(udpDeliver(["a", "b", "c"], [0, 1, 2]), { received: ["a", "b", "c"], lost: [], inOrder: true });
});

test("udpDeliver: a lost datagram is gone and nobody sends it again", () => {
  assert.deepStrictEqual(udpDeliver(["a", "b", "c"], [0, 2]), { received: ["a", "c"], lost: [1], inOrder: true });
});

test("udpDeliver: datagrams can arrive in another order and stay that way", () => {
  assert.deepStrictEqual(udpDeliver(["a", "b", "c"], [2, 0, 1]), { received: ["c", "a", "b"], lost: [], inOrder: false });
});

test("udpDeliver: a datagram can arrive twice, and a repeat is not in order", () => {
  assert.deepStrictEqual(udpDeliver(["a", "b"], [0, 1, 1]), { received: ["a", "b", "b"], lost: [], inOrder: false });
});

test("udpDeliver: lost list is sorted and nothing arriving means all lost", () => {
  assert.deepStrictEqual(udpDeliver(["a", "b", "c", "d"], [3, 1]), { received: ["d", "b"], lost: [0, 2], inOrder: false });
  assert.deepStrictEqual(udpDeliver(["a", "b"], []), { received: [], lost: [0, 1], inOrder: true });
});

test("udpDeliver: each datagram stays whole, even when it is long", () => {
  const sent = ["x".repeat(100), "y"];
  assert.deepStrictEqual(udpDeliver(sent, [0, 1]).received, sent);
});

test("udpDeliver: unlike TCP, a gap is not filled in", () => {
  const tcp = sendReliably("abcdef", 2, [2]);
  assert.strictEqual(tcp.data, "abcdef");
  const udp = udpDeliver(["ab", "cd", "ef"], [0, 2]);
  assert.strictEqual(udp.received.join(""), "abef");
});

// ---------- closeConnection ----------

test("closeConnection: client closes first", () => {
  assert.deepStrictEqual(closeConnection("client"), {
    steps: [
      { from: "client", flags: ["FIN"] },
      { from: "server", flags: ["ACK"] },
      { from: "server", flags: ["FIN"] },
      { from: "client", flags: ["ACK"] },
    ],
    timeWait: "client",
  });
});

test("closeConnection: server closes first, and the server waits", () => {
  const result = closeConnection("server");
  assert.deepStrictEqual(result.steps.map((s) => s.from), ["server", "client", "client", "server"]);
  assert.deepStrictEqual(result.steps.map((s) => s.flags[0]), ["FIN", "ACK", "FIN", "ACK"]);
  assert.strictEqual(result.timeWait, "server");
});

test("closeConnection: the side in TIME_WAIT sends the very last ACK", () => {
  for (const first of ["client", "server"]) {
    const result = closeConnection(first);
    const last = result.steps[result.steps.length - 1];
    assert.strictEqual(last.from, result.timeWait);
    assert.deepStrictEqual(last.flags, ["ACK"]);
  }
});

test("closeConnection: anything else throws", () => {
  assert.throws(() => closeConnection("both"), Error);
  assert.throws(() => closeConnection(), Error);
});

// ---------- chooseProtocol ----------

test("chooseProtocol: a file download must arrive and in order, so TCP", () => {
  assert.strictEqual(chooseProtocol({ mustArrive: true, inOrder: true }), "tcp");
});

test("chooseProtocol: a web page needs all the bytes, so TCP", () => {
  assert.strictEqual(chooseProtocol({ mustArrive: true }), "tcp");
});

test("chooseProtocol: order alone is enough for TCP", () => {
  assert.strictEqual(chooseProtocol({ inOrder: true }), "tcp");
});

test("chooseProtocol: a live call where old data is useless, so UDP", () => {
  assert.strictEqual(chooseProtocol({ oldDataUseless: true }), "udp");
});

test("chooseProtocol: a game that also wants every move still picks UDP when old positions are useless", () => {
  assert.strictEqual(chooseProtocol({ oldDataUseless: true, mustArrive: true, inOrder: true }), "udp");
});

test("chooseProtocol: a small question and answer, like DNS, so UDP", () => {
  assert.strictEqual(chooseProtocol({ oneSmallExchange: true, mustArrive: true }), "udp");
});

test("chooseProtocol: no needs at all means UDP", () => {
  assert.strictEqual(chooseProtocol({}), "udp");
});

test("chooseProtocol: needs that are false do not count", () => {
  assert.strictEqual(chooseProtocol({ mustArrive: false, inOrder: false, oldDataUseless: false, oneSmallExchange: false }), "udp");
});

test("chooseProtocol: a bad argument throws", () => {
  assert.throws(() => chooseProtocol(null), Error);
  assert.throws(() => chooseProtocol("tcp"), Error);
  assert.throws(() => chooseProtocol([]), Error);
  assert.throws(() => chooseProtocol(), Error);
});

// ---------- sendLimit ----------

test("sendLimit: the smaller window rules", () => {
  assert.strictEqual(sendLimit(65000, 10000, 4000), 6000);
  assert.strictEqual(sendLimit(5000, 10000, 1000), 4000);
});

test("sendLimit: never below zero", () => {
  assert.strictEqual(sendLimit(1000, 1000, 1000), 0);
  assert.strictEqual(sendLimit(1000, 5000, 3000), 0);
});

test("sendLimit: nothing in flight means the whole window", () => {
  assert.strictEqual(sendLimit(8000, 6000, 0), 6000);
});

// ---------- congestionWindows ----------

test("congestionWindows: slow start doubles every round", () => {
  assert.deepStrictEqual(congestionWindows(6, []), [1, 2, 4, 8, 16, 32]);
});

test("congestionWindows: after a loss the window is halved and then grows by one", () => {
  assert.deepStrictEqual(congestionWindows(8, [5]), [1, 2, 4, 8, 16, 8, 9, 10]);
});

test("congestionWindows: after a loss the growth stops doubling", () => {
  const list = congestionWindows(10, [4]);
  assert.deepStrictEqual(list, [1, 2, 4, 8, 4, 5, 6, 7, 8, 9]);
});

test("congestionWindows: a second loss halves again", () => {
  assert.deepStrictEqual(congestionWindows(9, [4, 7]), [1, 2, 4, 8, 4, 5, 6, 3, 4]);
});

test("congestionWindows: after two losses the window grows by one from the new ssthresh", () => {
  // Loss at round 5 (window 16) sets ssthresh 8. Loss at round 6 (window 8) sets ssthresh 4.
  assert.deepStrictEqual(congestionWindows(8, [5, 6]), [1, 2, 4, 8, 16, 8, 4, 5]);
  // Loss at round 4 (window 8) sets ssthresh 4, and 4 is not below ssthresh.
  assert.deepStrictEqual(congestionWindows(5, [4]), [1, 2, 4, 8, 4]);
});

test("congestionWindows: a loss at round 1 keeps ssthresh at 2 or more", () => {
  assert.deepStrictEqual(congestionWindows(5, [1]), [1, 2, 3, 4, 5]);
});

test("congestionWindows: zero rounds is an empty list", () => {
  assert.deepStrictEqual(congestionWindows(0, []), []);
});

// ---------- canBind ----------

test("canBind: the same protocol and the same port is taken", () => {
  assert.strictEqual(canBind([{ proto: "tcp", port: 3000 }], "tcp", 3000), false);
});

test("canBind: another port is free", () => {
  assert.strictEqual(canBind([{ proto: "tcp", port: 3000 }], "tcp", 3001), true);
});

test("canBind: TCP and UDP have separate port numbers", () => {
  assert.strictEqual(canBind([{ proto: "tcp", port: 53 }], "udp", 53), true);
  assert.strictEqual(canBind([{ proto: "udp", port: 53 }], "tcp", 53), true);
  assert.strictEqual(canBind([{ proto: "udp", port: 53 }], "udp", 53), false);
});

test("canBind: port 0 means any free port and always works", () => {
  assert.strictEqual(canBind([{ proto: "tcp", port: 0 }, { proto: "tcp", port: 3000 }], "tcp", 0), true);
});

test("canBind: an empty table means everything is free", () => {
  assert.strictEqual(canBind([], "tcp", 80), true);
});

test("canBind: bad input throws", () => {
  assert.throws(() => canBind([], "sctp", 80), Error);
  assert.throws(() => canBind([], "tcp", 70000), Error);
  assert.throws(() => canBind([], "tcp", 65536), Error);
  assert.strictEqual(canBind([], "tcp", 65535), true);
  assert.throws(() => canBind([], "tcp", -1), Error);
  assert.throws(() => canBind([], "tcp", 80.5), Error);
  assert.throws(() => canBind([], "tcp", "80"), Error);
});
