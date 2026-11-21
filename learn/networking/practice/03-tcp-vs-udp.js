// Lesson 03: TCP vs UDP. Write the ten pieces below, then run:
//   node --test learn/networking/practice/03-tcp-vs-udp.test.js
//
// This is a tiny model of TCP and UDP. Text stands for bytes: one character is one byte.
// Nothing here uses the network. Never change the arguments you are given.
//
//   handshake(clientSeq, serverSeq)
//       The three way handshake. Return a list of 3 segments (plain objects):
//         { from: "client", flags: ["SYN"], seq: clientSeq }
//         { from: "server", flags: ["SYN", "ACK"], seq: serverSeq, ack: clientSeq + 1 }
//         { from: "client", flags: ["ACK"], seq: clientSeq + 1, ack: serverSeq + 1 }
//       Throw an Error when a number is not a whole number of 0 or more.
//
//   splitIntoSegments(text, mss)
//       Cut text into pieces of at most mss characters (mss = maximum segment size).
//       Return [{ seq, data }]. seq is the number of the first byte of the piece, counted from 0.
//       "" gives []. Throw an Error when mss is not a whole number of 1 or more.
//
//   reassemble(segments)
//       The receiver. The segments arrive in any order, and some arrive twice.
//       Return { data, ack }. data is the text that is complete from byte 0, with no gap.
//       ack is the number of the next byte the receiver wants (it is data.length).
//       A piece that comes after a gap waits: it is not in data yet.
//
//   sendReliably(text, mss, lostSends, maxAttempts = 5)
//       Send text piece by piece, one piece at a time. After a lost send the sender waits for its
//       timer and sends the same piece again. lostSends is a list of send numbers that get lost.
//       Send number 1 is the first send of all, number 2 the next one, and so on, counting retries.
//       Return { ok, data, log, retransmissions }.
//         log: one { n, seq, attempt, lost } for every send. attempt starts at 1 for each piece.
//         A piece that has used maxAttempts sends and was lost every time: stop, ok is false.
//         data is the text the receiver has (everything before the piece that failed).
//         retransmissions: how many sends had attempt 2 or more.
//
//   udpDeliver(sent, arrivalOrder)
//       UDP does not retry and does not reorder. sent is a list of datagrams. arrivalOrder is a
//       list of positions in sent, in the order they arrive. A position that is not in the list
//       was lost. A position can appear twice (UDP can duplicate).
//       Return { received, lost, inOrder }.
//         received: the datagrams in the order they arrived, each one whole.
//         lost: the positions that never arrived, sorted.
//         inOrder: true when the arrived positions only go up (a repeat is not up).
//
//   closeConnection(first)
//       first is "client" or "server": who closes first. Return { steps, timeWait }.
//         steps: [ first sends FIN, the other sends ACK, the other sends FIN, first sends ACK ]
//                each one is { from, flags: [...] }
//         timeWait: who waits in TIME_WAIT at the end: the one that closed first.
//       Throw an Error for any other value.
//
//   chooseProtocol(need)
//       need is an object. Missing keys count as false. Return "tcp" or "udp". Check in this order:
//         oldDataUseless    (a late video frame, an old game position)  -> "udp"
//         oneSmallExchange  (one small question, one small answer, the app can ask again) -> "udp"
//         mustArrive or inOrder -> "tcp"
//         anything else -> "udp"
//       Throw an Error when need is not an object.
//
//   sendLimit(rwnd, cwnd, inFlight)
//       How many more bytes the sender may send now. It may not pass the smaller of the
//       receiver's window (rwnd, flow control) and its own window (cwnd, congestion control).
//       Return min(rwnd, cwnd) - inFlight, but never less than 0.
//
//   congestionWindows(rounds, lossRounds)
//       The size of the sender's window in each round. Return a list with one number per round.
//       The window starts at 1 and ssthresh starts at Infinity. In each round: add the window
//       to the list, then change it for the next round:
//         if round number (counting from 1) is in lossRounds: ssthresh = max(2, floor(window / 2)),
//            window = ssthresh
//         else if window < ssthresh: window = window * 2                        (slow start)
//         else: window = window + 1                                       (careful growth)
//
//   canBind(table, proto, port)
//       table is a list of { proto, port } that are already in use on this computer.
//       proto is "tcp" or "udp". Return false when the same proto and the same port are in use.
//       TCP port 53 and UDP port 53 are different, so both can be used. Port 0 means "pick any
//       free port" and always works. Throw an Error for another proto or a port that is not a
//       whole number from 0 to 65535.

function handshake(clientSeq, serverSeq) {
  // TODO
}

function splitIntoSegments(text, mss) {
  // TODO
}

function reassemble(segments) {
  // TODO
}

function sendReliably(text, mss, lostSends, maxAttempts = 5) {
  // TODO
}

function udpDeliver(sent, arrivalOrder) {
  // TODO
}

function closeConnection(first) {
  // TODO
}

function chooseProtocol(need) {
  // TODO
}

function sendLimit(rwnd, cwnd, inFlight) {
  // TODO
}

function congestionWindows(rounds, lossRounds) {
  // TODO
}

function canBind(table, proto, port) {
  // TODO
}

module.exports = { handshake, splitIntoSegments, reassemble, sendReliably, udpDeliver, closeConnection, chooseProtocol, sendLimit, congestionWindows, canBind };
