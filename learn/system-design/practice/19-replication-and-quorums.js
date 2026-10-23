// Lesson 19: Replication and quorums. Write createCluster and canBeStale below, then run:
//   node --test learn/system-design/practice/19-replication-and-quorums.test.js

// createCluster({ n = 3, w = 2, r = 2 }) makes a small store with n copies of one value.
//   w = how many copies must save a write before the write counts.
//   r = how many copies must answer a read.
// Every copy starts as { version: 1, value: "v1", up: true }.
// Copies are numbered 0 to n-1. It returns an object with these methods:
//
//   write(value, reached)   `reached` is an array of copy numbers: the copies that saved the write
//                           before the leader said OK. The other copies are late: they still hold the old value.
//                           A copy that is down cannot save anything, so drop it from `reached`.
//                           Count the copies that really saved it (ignore repeated numbers).
//                           - If that count is at least w: every one of those copies now holds
//                             { version: newest + 1, value, up: true }. Return { ok: true, acks: count }.
//                           - If the count is less than w: the write is refused and NO copy changes.
//                             Return { ok: false, acks: count }.
//                           (In a real store a refused write can still stay on some copies. Ignore that here.)
//
//   read(answered)          `answered` is an array of copy numbers: the copies whose answers you use.
//                           A copy that is down cannot answer, so drop it from `answered`.
//                           - If fewer than r answers are left, return { ok: false }.
//                           - Otherwise take the answer with the highest version and return
//                             { ok: true, value, version, stale }.
//                             stale is true when that version is lower than the version of the newest
//                             write that was acknowledged (ok: true). The start value v1 is version 1.
//
//   down(i), up(i)         copy i stops, or starts again. A copy that comes back keeps its old value.
//   catchUp(i)             copy i takes the version and value of the newest copy that is up.
//   canWrite()             true when at least w copies are up.
//   canRead()              true when at least r copies are up.
//   copies()               an array with one { version, value, up } for each copy. A snapshot: changing it
//                          must not change the cluster.
function createCluster(options) {
  // TODO
}

// canBeStale(n, w, r) answers one question: with n copies, can a read ever come back stale?
//   Try EVERY group of w copies that saved the write, and for each one, EVERY group of r copies that
//   answer the read. Use createCluster: write "v2" to the group, read from the other group.
//   Return true if any read was stale, false if none was.
//   Do not just return the rule r + w <= n. The point is to see the rule appear from the tries.
function canBeStale(n, w, r) {
  // TODO
}

module.exports = { createCluster, canBeStale };
