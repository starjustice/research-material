// Lesson 24: Consensus and Raft. Write the three things below, then run:
//   node --test learn/system-design/practice/24-consensus-and-raft.test.js
//
// This is a very small Raft. There are no timers and no network. You call elect() and append() by hand,
// and a "partition" says which servers can talk to each other. It keeps the three ideas of the lesson:
// a majority is needed, a server votes once in each term, and a term that is too old is refused.

// majority(n): the smallest number of servers that is MORE than half of n.
//   majority(3) is 2, majority(4) is 3, majority(5) is 3.
function majority(n) {
  // TODO
}

// toleratedFailures(n): how many servers can be down while the others still make a majority.
//   toleratedFailures(5) is 2.
function toleratedFailures(n) {
  // TODO
}

// createCluster(ids): ids is a list of names, for example ["A", "B", "C", "D", "E"].
//
// Every server starts with: role "follower", term 0, votedFor null, log [], commitIndex 0.
// A log entry is { term, command }. The term is the term of the leader that created the entry.
//
// The returned object has these methods:
//
//   state(id)         returns a COPY of { role, term, votedFor, log, commitIndex } for that server.
//
//   partition(groups) groups is a list of lists, for example [["A", "B"], ["C", "D", "E"]].
//                     Servers can only talk to servers in their own group. A server that is in no
//                     group is alone. Sending a message to yourself is never needed.
//   heal()            everyone can talk to everyone again.
//
//   elect(id)         server id runs for leader. Return true if it wins, false if not.
//     1. It goes to the next term (term + 1), becomes a "candidate" and votes for itself (votedFor = id).
//     2. It asks each server it can talk to for a vote, sending
//        { term, candidateId, lastLogTerm, lastLogLength }.
//        lastLogTerm is the term of its last log entry (0 when the log is empty).
//        A server answers with these rules, in this order:
//          a. If the candidate's term is smaller than my term: refuse.
//          b. If the candidate's term is bigger than my term: take that term, forget my vote
//             (votedFor = null) and become a "follower". (Then go on to c and d.)
//          c. If the candidate's log is behind mine: refuse. The candidate's log is behind when
//             its lastLogTerm is smaller than my last entry's term, or the two terms are equal and
//             its log is shorter than mine.
//          d. If I already voted for a DIFFERENT candidate in this term: refuse. Otherwise grant
//             and remember it (votedFor = candidateId).
//     3. If a server refused because its term is bigger than the candidate's, the candidate takes
//        that term, becomes a "follower" and elect() returns false at once.
//     4. If the votes (its own included) reach majority(ids.length), its role becomes "leader" and
//        elect() returns true. If not, its role stays "candidate" and elect() returns false.
//
//   append(id, command)  the leader id adds a command.
//     - If server id is not a "leader", throw an Error whose message is "not leader".
//     - Add { term: its term, command } to the end of its own log.
//     - Send its whole log to each server it can talk to, one by one, in the order of the ids list. A server with a bigger term than the leader
//       refuses, and then the leader takes that term, becomes a "follower", and append() returns
//       { committed: false, acks } at once (acks counts the leader and the servers that took the log before that one).
//       Any other server takes the leader's term (if bigger), becomes a "follower", replaces its log
//       with a copy of the leader's log, and counts as one ack.
//     - acks counts the leader itself plus every server that took the log.
//     - If acks reach majority(ids.length), the entry is committed: the leader and every server that
//       took the log set commitIndex to the length of the leader's log. Return { committed: true, acks }.
//       Otherwise return { committed: false, acks }. The entry stays in the leader's log.
function createCluster(ids) {
  // TODO
}

module.exports = { majority, toleratedFailures, createCluster };
