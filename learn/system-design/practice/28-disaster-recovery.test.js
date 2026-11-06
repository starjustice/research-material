const test = require("node:test");
const assert = require("node:assert");
const { lostCommits, checkTargets, worstCaseRto, pickStrategy, pickBackup, createFailover } = require("./28-disaster-recovery");

// ---- lostCommits ----
test("lostCommits returns the commits after the copy point", () => {
  const commits = [{ id: "c1", at: 10 }, { id: "c2", at: 12 }, { id: "c3", at: 15 }, { id: "c4", at: 16 }];
  assert.deepStrictEqual(lostCommits(commits, 12), ["c3", "c4"]);
});

test("lostCommits: a commit exactly at the copy point is safe", () => {
  assert.deepStrictEqual(lostCommits([{ id: "x", at: 5 }], 5), []);
});

test("lostCommits: nothing is lost when the copy is up to date, everything when it has nothing", () => {
  const commits = [{ id: "a", at: 1 }, { id: "b", at: 2 }];
  assert.deepStrictEqual(lostCommits(commits, 100), []);
  assert.deepStrictEqual(lostCommits(commits, 0), ["a", "b"]);
});

// ---- checkTargets ----
test("checkTargets measures rpo and rto in seconds", () => {
  const r = checkTargets({ rpoTarget: 300, rtoTarget: 600, lastCopyAt: 1000, failureAt: 1120, backAt: 1500 });
  assert.deepStrictEqual(r, { rpo: 120, rto: 380, rpoOk: true, rtoOk: true });
});

test("checkTargets: one target can be met while the other is missed", () => {
  const r = checkTargets({ rpoTarget: 60, rtoTarget: 600, lastCopyAt: 0, failureAt: 3600, backAt: 4000 });
  assert.strictEqual(r.rpo, 3600);
  assert.strictEqual(r.rpoOk, false);
  assert.strictEqual(r.rtoOk, true);
  const r2 = checkTargets({ rpoTarget: 3600, rtoTarget: 100, lastCopyAt: 0, failureAt: 10, backAt: 400 });
  assert.strictEqual(r2.rpoOk, true);
  assert.strictEqual(r2.rtoOk, false);
});

test("checkTargets: exactly on the target is ok", () => {
  const r = checkTargets({ rpoTarget: 60, rtoTarget: 90, lastCopyAt: 100, failureAt: 160, backAt: 250 });
  assert.strictEqual(r.rpoOk, true);
  assert.strictEqual(r.rtoOk, true);
});

// ---- worstCaseRto ----
test("worstCaseRto adds every step of the chain", () => {
  assert.strictEqual(worstCaseRto({ detect: 30, decide: 300, promote: 120, dnsTtl: 300 }), 750);
});

test("worstCaseRto counts warmup when given, and treats it as 0 when missing", () => {
  assert.strictEqual(worstCaseRto({ detect: 30, decide: 0, promote: 60, dnsTtl: 60, warmup: 240 }), 390);
  assert.strictEqual(worstCaseRto({ detect: 1, decide: 2, promote: 3, dnsTtl: 4 }), 10);
});

test("worstCaseRto: the DNS wait alone can break a one minute target", () => {
  const rto = worstCaseRto({ detect: 10, decide: 0, promote: 20, dnsTtl: 300 });
  assert.ok(rto > 60);
});

// ---- pickStrategy ----
test("pickStrategy picks the cheapest that meets both targets", () => {
  assert.strictEqual(pickStrategy({ rpo: 1440, rto: 480 }), "backup-and-restore");
  assert.strictEqual(pickStrategy({ rpo: 60, rto: 120 }), "pilot-light");
  assert.strictEqual(pickStrategy({ rpo: 5, rto: 60 }), "pilot-light");
  assert.strictEqual(pickStrategy({ rpo: 5, rto: 30 }), "warm-standby");
  assert.strictEqual(pickStrategy({ rpo: 1, rto: 15 }), "warm-standby");
});

test("pickStrategy needs BOTH numbers to fit", () => {
  // rpo is loose but rto is tight: a slow strategy must not win
  assert.strictEqual(pickStrategy({ rpo: 1440, rto: 5 }), "active-active");
  // rto is loose but rpo is tight
  assert.strictEqual(pickStrategy({ rpo: 0, rto: 600 }), "active-active");
});

test("pickStrategy returns null when nothing fits", () => {
  assert.strictEqual(pickStrategy({ rpo: 0, rto: 0 }), null);
});

// ---- pickBackup ----
const backups = [{ name: "sun", at: 100 }, { name: "mon", at: 200 }, { name: "tue", at: 300 }];

test("pickBackup takes the latest backup at or before the target", () => {
  assert.deepStrictEqual(pickBackup(backups, 1000, 250), { backup: "mon" });
  assert.deepStrictEqual(pickBackup(backups, 1000, 300), { backup: "tue" });
  assert.deepStrictEqual(pickBackup(backups, 1000, 999), { backup: "tue" });
});

test("pickBackup does not care how the list is ordered", () => {
  const shuffled = [backups[2], backups[0], backups[1]];
  assert.deepStrictEqual(pickBackup(shuffled, 1000, 250), { backup: "mon" });
});

test("pickBackup: no backup old enough is an error", () => {
  assert.deepStrictEqual(pickBackup(backups, 1000, 50), { error: "no backup before target" });
  assert.deepStrictEqual(pickBackup([], 1000, 500), { error: "no backup before target" });
});

test("pickBackup: an archive that stops before the target is an error", () => {
  assert.deepStrictEqual(pickBackup(backups, 240, 250), { error: "archive stops before target" });
  assert.deepStrictEqual(pickBackup(backups, 250, 250), { backup: "mon" });
});

test("pickBackup reports the backup problem first", () => {
  assert.deepStrictEqual(pickBackup(backups, 10, 50), { error: "no backup before target" });
});

// ---- createFailover ----
test("createFailover starts with a as primary and epoch 1", () => {
  const f = createFailover({ threshold: 3 });
  assert.strictEqual(f.primary(), "a");
  assert.strictEqual(f.epoch(), 1);
});

test("createFailover waits for threshold failed checks in a row", () => {
  const f = createFailover({ threshold: 3 });
  assert.strictEqual(f.check(false), "suspect");
  assert.strictEqual(f.check(false), "suspect");
  assert.strictEqual(f.primary(), "a");
  assert.strictEqual(f.check(false), "failover");
  assert.strictEqual(f.primary(), "b");
  assert.strictEqual(f.epoch(), 2);
});

test("createFailover: one good check starts the count again", () => {
  const f = createFailover({ threshold: 3 });
  f.check(false); f.check(false);
  assert.strictEqual(f.check(true), "up");
  assert.strictEqual(f.check(false), "suspect");
  assert.strictEqual(f.check(false), "suspect");
  assert.strictEqual(f.primary(), "a");
  assert.strictEqual(f.check(false), "failover");
});

test("createFailover: a healthy primary never fails over", () => {
  const f = createFailover({ threshold: 2 });
  for (let i = 0; i < 20; i++) assert.strictEqual(f.check(true), "up");
  assert.strictEqual(f.primary(), "a");
  assert.strictEqual(f.epoch(), 1);
});

test("fencing: the old primary is refused after a failover", () => {
  const f = createFailover({ threshold: 1 });
  assert.strictEqual(f.write("a", 1), true);
  assert.strictEqual(f.check(false), "failover");
  assert.strictEqual(f.write("a", 1), false);   // the old primary wakes up and still thinks it is in charge
  assert.strictEqual(f.write("b", 1), false);   // the right server, but with an old epoch
  assert.strictEqual(f.write("b", 2), true);
});

test("createFailover can fail over again, back to a, with epoch 3", () => {
  const f = createFailover({ threshold: 1 });
  f.check(false);
  assert.strictEqual(f.check(false), "failover");
  assert.strictEqual(f.primary(), "a");
  assert.strictEqual(f.epoch(), 3);
  assert.strictEqual(f.write("a", 3), true);
});
