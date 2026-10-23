const test = require("node:test");
const assert = require("node:assert");
const { hash, modMoved, createRing, ringMoved } = require("./20-consistent-hashing");

const keys = (n) => Array.from({ length: n }, (_, i) => "user-" + i);

// A fake hash so that the ring has exact positions. Server spots are named "A#0", "B#0" ...
// A key named "k45" sits at position 45 on the ring.
const table = { "A#0": 10, "B#0": 40, "C#0": 70, "D#0": 55 };
const fake = (s) => (s in table ? table[s] : Number(s.slice(1)));
const smallRing = () => {
  const ring = createRing({ vnodes: 1, hash: fake });
  ["A", "B", "C"].forEach((s) => ring.addServer(s));
  return ring;
};
const where = (ring, ks) => Object.fromEntries(ks.map((k) => [k, ring.serverFor(k)]));
const shareOf = (ring, ks) => {
  const count = {};
  for (const k of ks) count[ring.serverFor(k)] = (count[ring.serverFor(k)] || 0) + 1;
  return count;
};

test("hash gives a whole number, and the same text gives the same number", () => {
  assert.strictEqual(hash("user-7"), hash("user-7"));
  assert.notStrictEqual(hash("user-7"), hash("user-8"));
  assert.ok(Number.isInteger(hash("user-7")) && hash("user-7") >= 0);
});

test("modMoved: nothing moves when the number of servers stays the same", () => {
  assert.strictEqual(modMoved(keys(500), 4, 4), 0);
});

test("modMoved: with hash numbers 0 to 11, going from 3 to 4 servers moves 9 of 12 keys", () => {
  const twelve = Array.from({ length: 12 }, (_, i) => String(i));
  assert.strictEqual(modMoved(twelve, 3, 4, Number), 9);
});

test("modMoved: going from 4 to 5 servers moves about 80 percent of 1000 keys", () => {
  const moved = modMoved(keys(1000), 4, 5);
  assert.ok(moved > 700 && moved < 900, "moved " + moved);
});

test("a ring with no servers finds nothing", () => {
  assert.strictEqual(createRing().serverFor("user-1"), null);
});

test("a ring with one server sends every key to it", () => {
  const ring = createRing();
  ring.addServer("A");
  assert.ok(keys(200).every((k) => ring.serverFor(k) === "A"));
});

test("each key goes to the next spot clockwise, and the last spot wraps to the first", () => {
  const ring = smallRing();                                    // A at 10, B at 40, C at 70
  assert.deepStrictEqual(where(ring, ["k5", "k25", "k45", "k65", "k85"]),
    { k5: "A", k25: "B", k45: "C", k65: "C", k85: "A" });
});

test("a key exactly on a spot belongs to that spot", () => {
  const ring = smallRing();
  assert.strictEqual(ring.serverFor("k40"), "B");
  assert.strictEqual(ring.serverFor("k41"), "C");
});

test("adding a server moves only the keys between it and the spot before it", () => {
  const ring = smallRing();
  const ks = ["k5", "k25", "k45", "k65", "k85"];
  const before = where(ring, ks);
  ring.addServer("D");                                         // D at 55
  const after = where(ring, ks);
  assert.deepStrictEqual(after, { k5: "A", k25: "B", k45: "D", k65: "C", k85: "A" });
  assert.deepStrictEqual(ks.filter((k) => before[k] !== after[k]), ["k45"]);
});

test("removing a server moves only its keys, to the next spot clockwise", () => {
  const ring = smallRing();
  assert.strictEqual(ring.removeServer("B"), true);
  assert.deepStrictEqual(where(ring, ["k5", "k25", "k45", "k65", "k85"]),
    { k5: "A", k25: "C", k45: "C", k65: "C", k85: "A" });
});

test("servers() lists the names in order, and repeated or unknown names are refused", () => {
  const ring = createRing({ vnodes: 3 });
  assert.strictEqual(ring.addServer("B"), true);
  assert.strictEqual(ring.addServer("A"), true);
  assert.strictEqual(ring.addServer("A"), false);
  assert.strictEqual(ring.removeServer("Z"), false);
  assert.deepStrictEqual(ring.servers(), ["A", "B"]);
});

test("ringMoved counts the keys that change server", () => {
  const ring = smallRing();
  const n = ringMoved(["k5", "k25", "k45", "k65", "k85"], ring, (r) => r.addServer("D"));
  assert.strictEqual(n, 1);
  assert.deepStrictEqual(ring.servers(), ["A", "B", "C", "D"]);   // the change really ran
});

test("with 100 spots each, going from 4 to 5 servers moves about 1 key in 5, all of them to the new server", () => {
  const ring = createRing({ vnodes: 100 });
  ["A", "B", "C", "D"].forEach((s) => ring.addServer(s));
  const ks = keys(1000);
  const before = where(ring, ks);
  const moved = ringMoved(ks, ring, (r) => r.addServer("E"));
  assert.ok(moved > 100 && moved < 300, "moved " + moved);
  const after = where(ring, ks);
  for (const k of ks) if (before[k] !== after[k]) assert.strictEqual(after[k], "E");   // nobody moves between old servers
});

test("removing a server leaves no key on it, and keys on the other servers stay", () => {
  const ring = createRing({ vnodes: 100 });
  ["A", "B", "C", "D"].forEach((s) => ring.addServer(s));
  const ks = keys(1000);
  const before = where(ring, ks);
  ring.removeServer("C");
  const after = where(ring, ks);
  for (const k of ks) {
    assert.notStrictEqual(after[k], "C");
    if (before[k] !== "C") assert.strictEqual(after[k], before[k]);
  }
});

test("100 spots each share the keys evenly, 1 spot each does not", () => {
  const ks = keys(10000);
  const make = (v) => {
    const ring = createRing({ vnodes: v });
    ["A", "B", "C", "D"].forEach((s) => ring.addServer(s));
    return Object.values(shareOf(ring, ks));
  };
  const many = make(100);
  assert.strictEqual(many.length, 4);
  assert.ok(Math.min(...many) > 2000 && Math.max(...many) < 3000, many.join(" "));
  const few = make(1);
  assert.ok(Math.max(...few) > 2 * Math.min(...few), few.join(" "));
});

test("with many spots, a removed server's keys spread over all the others", () => {
  const ks = keys(4000);
  const spread = (v) => {
    const ring = createRing({ vnodes: v });
    ["A", "B", "C", "D"].forEach((s) => ring.addServer(s));
    const before = where(ring, ks);
    ring.removeServer("D");
    const after = where(ring, ks);
    return new Set(ks.filter((k) => before[k] === "D").map((k) => after[k]));
  };
  assert.strictEqual(spread(100).size, 3);
  assert.strictEqual(spread(1).size, 1);
});
