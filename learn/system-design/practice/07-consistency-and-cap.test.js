const test = require("node:test");
const assert = require("node:assert");
const { createStore, createUser, readDuringSplit } = require("./07-consistency-and-cap");

test("both copies start with the same value", () => {
  const s = createStore();
  assert.strictEqual(s.leader(), "Andi");
  assert.strictEqual(s.follower(0), "Andi");
  assert.strictEqual(createStore({ initial: "x" }).follower(5), "x");
});

test("the leader changes at once, the follower a few ticks later (a stale read)", () => {
  const s = createStore({ delay: 3 });
  s.write(0, "Budi");
  assert.strictEqual(s.leader(), "Budi");
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((t) => s.follower(t)), ["Andi", "Andi", "Andi", "Budi", "Budi"]);
});

test("practice A of the lesson: two writes with a delay of 2", () => {
  const s = createStore({ delay: 2 });
  s.write(0, "Budi");
  s.write(1, "Citra");
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((t) => s.follower(t)), ["Andi", "Andi", "Budi", "Citra", "Citra"]);
  assert.strictEqual(s.leader(), "Citra");
});

test("a copy that has landed stays on the follower", () => {
  const s = createStore({ delay: 1 });
  s.write(0, "Budi");
  assert.strictEqual(s.follower(10), "Budi");
  assert.strictEqual(s.follower(11), "Budi");
});

test("read your own writes: Sam never sees the old name, a stranger does (the table of card 2)", () => {
  const s = createStore({ delay: 3 });
  const sam = createUser(s, { window: 4 });
  sam.write(0, "Budi");
  const samSees = [], strangerSees = [];
  for (const t of [0, 1, 2, 3, 4]) { samSees.push(sam.read(t)); strangerSees.push(s.follower(t)); }
  assert.deepStrictEqual(samSees, ["Budi", "Budi", "Budi", "Budi", "Budi"]);
  assert.deepStrictEqual(strangerSees, ["Andi", "Andi", "Andi", "Budi", "Budi"]);
});

test("the window is exactly how many ticks the reads go to the leader", () => {
  const s = createStore({ delay: 3 });
  const sam = createUser(s, { window: 2 });
  sam.write(0, "Budi");
  assert.strictEqual(sam.read(0), "Budi");       // 0 ticks after the write: leader
  assert.strictEqual(sam.read(1), "Budi");       // 1 tick after: leader
  assert.strictEqual(sam.read(2), "Andi");       // 2 ticks after: the window is over, and the copy is still on its way
});

test("a window that is shorter than the delay brings the bug back; a longer one fixes it", () => {
  const short = createStore({ delay: 5 });
  const a = createUser(short, { window: 3 });
  a.write(0, "Budi");
  assert.strictEqual(a.read(4), "Andi");         // window over, copy not here yet: Sam lost his own change for a moment
  const long = createStore({ delay: 5 });
  const b = createUser(long, { window: 6 });
  b.write(0, "Budi");
  assert.strictEqual(b.read(4), "Budi");
  assert.strictEqual(b.read(6), "Budi");         // window over, and the copy landed at tick 5
});

test("a person who never wrote reads the follower, and each person has their own window", () => {
  const s = createStore({ delay: 3 });
  const sam = createUser(s);
  const mia = createUser(s);
  sam.write(0, "Budi");
  assert.strictEqual(mia.read(1), "Andi");       // Mia did not write, so she reads the follower
  assert.strictEqual(sam.read(1), "Budi");
});

test("a person's window starts again at each new write", () => {
  const s = createStore({ delay: 3 });
  const sam = createUser(s, { window: 2 });
  sam.write(0, "Budi");
  sam.write(5, "Citra");
  assert.strictEqual(sam.read(6), "Citra");      // 1 tick after the second write: leader
  assert.strictEqual(sam.read(7), "Budi");       // window over, and the copy of Citra lands at tick 8
});

test("cut: copies do not land while the line is down, and land after it heals", () => {
  const s = createStore({ delay: 3 });
  assert.strictEqual(s.isConnected(), true);
  s.write(0, "Budi");
  s.cut();
  assert.strictEqual(s.isConnected(), false);
  assert.strictEqual(s.follower(5), "Andi");
  assert.strictEqual(s.follower(50), "Andi");
  s.heal();
  assert.strictEqual(s.isConnected(), true);
  assert.strictEqual(s.follower(50), "Budi");
});

test("a write during a cut waits for the heal and keeps its order", () => {
  const s = createStore({ delay: 2 });
  s.cut();
  s.write(0, "Budi");
  s.write(1, "Citra");
  assert.strictEqual(s.leader(), "Citra");
  assert.strictEqual(s.follower(9), "Andi");
  s.heal();
  assert.strictEqual(s.follower(9), "Citra");
});

test("split with the line working: both choices answer from the follower", () => {
  for (const choice of ["refuse", "answer"]) {
    const s = createStore({ delay: 3 });
    s.write(0, "Budi");
    assert.deepStrictEqual(readDuringSplit(s, 1, choice), { ok: true, value: "Andi", maybeOld: true });
    assert.deepStrictEqual(readDuringSplit(s, 3, choice), { ok: true, value: "Budi", maybeOld: false });
  }
});

test("split, choice 1 (consistent): the follower refuses, so nobody hears something false", () => {
  const s = createStore({ delay: 3 });
  s.write(0, "Budi");
  s.cut();
  assert.deepStrictEqual(readDuringSplit(s, 10, "refuse"), { ok: false });
});

test("split, choice 2 (available): the follower answers, and the answer may be old", () => {
  const s = createStore({ delay: 3 });
  s.write(0, "Budi");
  s.cut();
  assert.deepStrictEqual(readDuringSplit(s, 10, "answer"), { ok: true, value: "Andi", maybeOld: true });
});

test("split, choice 2: if nothing changed on the leader, the answer is not old", () => {
  const s = createStore();
  s.cut();
  assert.deepStrictEqual(readDuringSplit(s, 10, "answer"), { ok: true, value: "Andi", maybeOld: false });
});

test("after the line works again the answers are fresh", () => {
  const s = createStore({ delay: 3 });
  s.write(0, "Budi");
  s.cut();
  s.heal();
  assert.deepStrictEqual(readDuringSplit(s, 10, "refuse"), { ok: true, value: "Budi", maybeOld: false });
});

test("a choice that is not refuse or answer throws", () => {
  const s = createStore();
  assert.throws(() => readDuringSplit(s, 0, "maybe"));
  assert.throws(() => readDuringSplit(s, 0));
});
