const test = require("node:test");
const assert = require("node:assert");
const { majority, toleratedFailures, createCluster } = require("./24-consensus-and-raft");

const five = () => createCluster(["A", "B", "C", "D", "E"]);
const commands = (c, id) => c.state(id).log.map((e) => e.command);

// ---------- majority ----------

test("majority: the smallest number that is more than half", () => {
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7].map(majority), [1, 2, 2, 3, 3, 4, 4]);
});

test("majority: any two majorities share a server (checked for 5 servers)", () => {
  const ids = [0, 1, 2, 3, 4];
  const groups = [];
  for (let mask = 0; mask < 32; mask++) {
    const g = ids.filter((i) => mask & (1 << i));
    if (g.length >= majority(5)) groups.push(g);
  }
  assert.strictEqual(groups.length, 16);                 // 10 groups of 3, 5 of 4 and 1 of 5
  for (const a of groups) for (const b of groups) assert.ok(a.some((x) => b.includes(x)), `${a} and ${b}`);
});

test("toleratedFailures: 3 -> 1, 5 -> 2, 7 -> 3", () => {
  assert.strictEqual(toleratedFailures(3), 1);
  assert.strictEqual(toleratedFailures(5), 2);
  assert.strictEqual(toleratedFailures(7), 3);
});

test("toleratedFailures: an even number adds nothing (4 -> 1, 6 -> 2, 1 -> 0, 2 -> 0)", () => {
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6].map(toleratedFailures), [0, 0, 1, 1, 2, 2]);
});

// ---------- electing a leader ----------

test("a new cluster: everyone is a follower in term 0 with an empty log", () => {
  const c = five();
  for (const id of "ABCDE") assert.deepStrictEqual(c.state(id), { role: "follower", term: 0, votedFor: null, log: [], commitIndex: 0 });
});

test("elect: a healthy cluster elects the candidate, in term 1, and everyone voted for it", () => {
  const c = five();
  assert.strictEqual(c.elect("A"), true);
  assert.strictEqual(c.state("A").role, "leader");
  assert.strictEqual(c.state("A").term, 1);
  for (const id of "BCDE") {
    assert.strictEqual(c.state(id).term, 1);
    assert.strictEqual(c.state(id).votedFor, "A");
    assert.strictEqual(c.state(id).role, "follower");
  }
});

test("elect: a candidate with only a minority of the servers does not win", () => {
  const c = five();
  c.partition([["A", "B"], ["C", "D", "E"]]);
  assert.strictEqual(c.elect("A"), false);
  assert.strictEqual(c.state("A").role, "candidate");
  assert.strictEqual(c.state("A").term, 1);
  assert.strictEqual(c.state("B").votedFor, "A");        // B did vote for A, but 2 of 5 is not a majority
  assert.strictEqual(c.elect("C"), true);                // 3 of 5 is
  assert.strictEqual(c.state("C").role, "leader");
});

test("elect: a server votes for one candidate in a term", () => {
  const c = five();
  c.partition([["A", "B", "C"], ["D", "E"]]);
  assert.strictEqual(c.elect("A"), true);                // term 1: A, B and C voted for A
  c.heal();
  assert.strictEqual(c.elect("D"), false);               // D is also in term 1. A, B and C already voted, only E votes for D
  assert.strictEqual(c.state("D").term, 1);
  assert.strictEqual(c.state("D").role, "candidate");
  assert.strictEqual(c.state("A").role, "leader");       // A is still the leader of term 1
  assert.strictEqual(c.state("B").votedFor, "A");
});

test("elect: a candidate in a bigger term wins and the old leader becomes a follower", () => {
  const c = five();
  c.elect("A");
  assert.strictEqual(c.elect("B"), true);
  assert.strictEqual(c.state("B").term, 2);
  assert.strictEqual(c.state("A").role, "follower");
  assert.strictEqual(c.state("A").term, 2);
  assert.strictEqual(c.state("A").votedFor, "B");
});

test("elect: a candidate whose term is too old steps down when it hears a bigger term", () => {
  const c = five();
  c.partition([["A", "B", "C"], ["D", "E"]]);
  c.elect("A");
  c.elect("A");                                          // A is in term 2 with B and C
  c.heal();
  assert.strictEqual(c.elect("D"), false);               // D goes to term 1, A's group has term 2, so they refuse
  assert.strictEqual(c.state("D").role, "follower");
  assert.strictEqual(c.state("D").term, 2);
});

test("elect: with 3 of 5 servers cut off, nobody can win", () => {
  const c = five();
  c.partition([["A", "B"], ["C"], ["D"], ["E"]]);
  for (const id of "ABCDE") assert.strictEqual(c.elect(id), false);
});

// ---------- adding to the log ----------

test("append: only a leader can append", () => {
  const c = five();
  assert.throws(() => c.append("A", "x=1"), /not leader/);
  c.elect("A");
  assert.throws(() => c.append("B", "x=1"), /not leader/);
});

test("append: a healthy cluster commits, and every server has the entry", () => {
  const c = five();
  c.elect("A");
  assert.deepStrictEqual(c.append("A", "x=1"), { committed: true, acks: 5 });
  for (const id of "ABCDE") {
    assert.deepStrictEqual(c.state(id).log, [{ term: 1, command: "x=1" }]);
    assert.strictEqual(c.state(id).commitIndex, 1);
  }
});

test("append: 3 of 5 servers are enough, 2 of 5 are not", () => {
  const c = five();
  c.elect("A");
  c.partition([["A", "B", "C"], ["D", "E"]]);
  assert.deepStrictEqual(c.append("A", "x=1"), { committed: true, acks: 3 });
  assert.strictEqual(c.state("D").log.length, 0);        // D never heard of it
  c.partition([["A", "B"], ["C", "D", "E"]]);
  assert.deepStrictEqual(c.append("A", "x=2"), { committed: false, acks: 2 });
  assert.strictEqual(c.state("A").commitIndex, 1);       // still only x=1 is committed
  assert.deepStrictEqual(commands(c, "A"), ["x=1", "x=2"]);   // x=2 sits in A's log, not committed
});

test("append: followers get the next entries in order", () => {
  const c = five();
  c.elect("A");
  c.append("A", "x=1");
  c.append("A", "x=2");
  assert.deepStrictEqual(commands(c, "E"), ["x=1", "x=2"]);
  assert.strictEqual(c.state("E").commitIndex, 2);
});

// ---------- safety ----------

test("state returns a copy: changing it does not change the cluster", () => {
  const c = five();
  c.elect("A");
  c.append("A", "x=1");
  const s = c.state("A");
  s.role = "follower";
  s.log.push({ term: 9, command: "bad" });
  assert.strictEqual(c.state("A").role, "leader");
  assert.strictEqual(c.state("A").log.length, 1);
});

test("a server that missed a committed entry cannot become leader", () => {
  const c = five();
  c.elect("A");
  c.partition([["A", "B", "C"], ["D", "E"]]);
  c.append("A", "x=1");                                  // committed on A, B and C
  c.elect("D");                                          // D and E cannot make a majority; D moves to term 2
  c.elect("D");                                          // term 3
  c.heal();
  assert.strictEqual(c.elect("D"), false);               // D has the biggest term but an empty log
  assert.strictEqual(c.state("D").role, "candidate");
  assert.strictEqual(c.state("A").role, "follower");     // A, B and C took D's term and stepped down
  assert.strictEqual(c.elect("B"), true);                // B has the entry
  assert.deepStrictEqual(commands(c, "B"), ["x=1"]);
});

test("split brain: the old leader cannot commit, the new leader can, and the old leader steps down", () => {
  const c = five();
  c.elect("A");
  assert.strictEqual(c.append("A", "x=1").committed, true);
  c.partition([["A", "B"], ["C", "D", "E"]]);

  assert.deepStrictEqual(c.append("A", "x=2"), { committed: false, acks: 2 });   // the old leader is on the small side
  assert.strictEqual(c.elect("C"), true);                                        // the big side elects a new leader
  assert.strictEqual(c.state("C").term, 2);
  assert.deepStrictEqual(c.append("C", "y=1"), { committed: true, acks: 3 });

  assert.strictEqual(c.state("A").role, "leader");                               // A does not know yet
  c.heal();
  assert.deepStrictEqual(c.append("A", "x=3"), { committed: false, acks: 2 });   // B (term 1) takes it, then C (term 2) refuses A
  assert.strictEqual(c.state("A").role, "follower");
  assert.strictEqual(c.state("A").term, 2);

  assert.deepStrictEqual(c.append("C", "z=1"), { committed: true, acks: 5 });
  for (const id of "ABCDE") assert.deepStrictEqual(commands(c, id), ["x=1", "y=1", "z=1"]);   // x=2 and x=3 are gone
});

test("a stale leader's append is refused by the first server that has a bigger term", () => {
  const c = five();
  c.elect("A");
  c.partition([["A"], ["B", "C", "D", "E"]]);
  c.elect("B");
  c.heal();
  const result = c.append("A", "late");
  assert.strictEqual(result.committed, false);
  assert.strictEqual(c.state("A").role, "follower");
  assert.strictEqual(c.state("B").role, "leader");
  assert.ok(!commands(c, "B").includes("late"));
});

test("a 3 server cluster keeps working with 1 server down, and stops with 2 down", () => {
  const c = createCluster(["A", "B", "C"]);
  c.elect("A");
  c.partition([["A", "B"], ["C"]]);
  assert.strictEqual(c.append("A", "x=1").committed, true);
  c.partition([["A"], ["B"], ["C"]]);
  assert.strictEqual(c.append("A", "x=2").committed, false);
});
