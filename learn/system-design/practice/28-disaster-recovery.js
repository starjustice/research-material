// Lesson 28: Disaster recovery. Write the six pieces below, then run:
//   node --test learn/system-design/practice/28-disaster-recovery.test.js
// All times are in seconds unless the piece says minutes.

//   lostCommits(commits, copiedUpTo)
//       commits is a list like [{ id: "c1", at: 10 }, { id: "c2", at: 12 }] (at = second of the commit).
//       copiedUpTo is the second up to which the copy (replica or backup) has everything.
//       Return the ids of the commits that are NOT in the copy: the ones with at greater than copiedUpTo.
//
//   checkTargets({ rpoTarget, rtoTarget, lastCopyAt, failureAt, backAt })
//       rpo = how much data was lost, as time = failureAt - lastCopyAt
//       rto = how long users waited               = backAt - failureAt
//       Return { rpo, rto, rpoOk, rtoOk }. A number is ok when it is less than or equal to its target.
//
//   worstCaseRto({ detect, decide, promote, dnsTtl, warmup = 0 })
//       Recovery is a chain: find out, decide, switch the database, wait for DNS caches, warm up.
//       Return the sum of all five numbers.
//
//   pickStrategy({ rpo, rto })
//       rpo and rto are the targets in MINUTES. STRATEGIES (below) is listed from cheapest to most expensive.
//       Return the name of the first (cheapest) strategy whose own rpo AND rto are both
//       less than or equal to the targets. Return null when none fits.
//
//   pickBackup(backups, walUntil, target)
//       backups is a list like [{ name: "sun", at: 100 }, { name: "mon", at: 200 }] (at = second the backup was taken).
//       walUntil is the second up to which the archive of changes (WAL) is complete.
//       target is the second you want to go back to (just before the mistake).
//       Pick the LATEST backup taken at or before target and return { backup: name }.
//       If no backup is that old, return { error: "no backup before target" }.
//       If walUntil is less than target, return { error: "archive stops before target" }.
//       Check the backup problem first.
//
//   createFailover({ threshold })
//       Two servers: "a" starts as primary, "b" is the standby. epoch starts at 1.
//       check(ok) is called once per health check:
//         ok true  -> the count of failed checks in a row goes back to 0, return "up"
//         ok false -> count one more failed check in a row.
//                     When the count reaches threshold, promote the standby: the other server becomes primary
//                     and the epoch goes up by 1. Return "failover" on that check.
//                     Before the threshold, return "suspect".
//         After a failover the count is 0 again, and later checks work the same way for the new primary.
//       primary() returns the name of the current primary. epoch() returns the current epoch.
//       write(server, serverEpoch) returns true only when server is the current primary AND
//       serverEpoch equals the current epoch. This is fencing: the old primary comes back and is refused.

const STRATEGIES = [
  // Example numbers for this lesson, in minutes. Real values depend on your setup and must be measured.
  { name: "backup-and-restore", rpo: 1440, rto: 480 },
  { name: "pilot-light", rpo: 5, rto: 60 },
  { name: "warm-standby", rpo: 1, rto: 15 },
  { name: "active-active", rpo: 0, rto: 1 },
];

function lostCommits(commits, copiedUpTo) {
  // TODO
}

function checkTargets(options) {
  // TODO
}

function worstCaseRto(options) {
  // TODO
}

function pickStrategy(target) {
  // TODO
}

function pickBackup(backups, walUntil, target) {
  // TODO
}

function createFailover(options) {
  // TODO
}

module.exports = { STRATEGIES, lostCommits, checkTargets, worstCaseRto, pickStrategy, pickBackup, createFailover };
