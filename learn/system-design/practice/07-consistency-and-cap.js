// Lesson 07: Consistency and CAP. Write createStore, createUser and readDuringSplit below, then run:
//   node --test learn/system-design/practice/07-consistency-and-cap.test.js

// createStore({ delay = 3, initial = "Andi" }) makes a leader and one follower. Both start with the value `initial`.
//   Time is counted in ticks (whole numbers). A copy needs `delay` ticks to travel from the leader to the follower.
//   Time only goes forward: the ticks you pass to write, follower and read never go back. Writes come in the order of time.
//
//   write(now, value)   the leader changes at once. A copy of the change starts its trip to the follower.
//                       It lands at tick now + delay.
//   leader()            the value on the leader.
//   follower(now)       the value on the follower at tick `now`.
//                       First, every copy that lands at tick `now` or earlier is put on the follower, oldest first.
//                       But only when the line is working. While the line is cut, no copy lands. It waits on the way.
//   cut()               the line between the leader and the follower breaks.
//   heal()              the line works again. Copies that are due land the next time the follower is read.
//   isConnected()       true when the line works.
//   Example: delay 2, write(0, "Budi"), write(1, "Citra"). The follower at ticks 0 to 4 says
//            Andi Andi Budi Citra Citra, and the leader says Citra (lesson card 2, practice A).
//
// createUser(store, { window = 4 }) is one person who uses the store (read your own writes, card 2).
//   write(now, value)   writes to the store, and remembers the tick of this write.
//   read(now)           For `window` ticks after this person's own write, read the LEADER.
//                       That means: when now - lastWriteTick is below window. Otherwise read the follower at tick now.
//                       A person who has never written reads the follower.
//
// readDuringSplit(store, now, choice) is a request to the follower when the line may be cut (card 4).
//   choice is "refuse" (consistent) or "answer" (available). Anything else throws an Error.
//   - If the line works: return { ok: true, value, maybeOld } with the follower value at tick `now`.
//   - If the line is cut, and choice is "refuse": return { ok: false }.
//   - If the line is cut, and choice is "answer": return { ok: true, value, maybeOld } with the follower value.
//   maybeOld is true when that value is not the value the leader has now.
function createStore(options) {
  // TODO
}

function createUser(store, options) {
  // TODO
}

function readDuringSplit(store, now, choice) {
  // TODO
}

module.exports = { createStore, createUser, readDuringSplit };
