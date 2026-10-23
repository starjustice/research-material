// Lesson 20: Consistent hashing. Write modMoved, createRing and ringMoved below, then run:
//   node --test learn/system-design/practice/20-consistent-hashing.test.js
const { createHash } = require("crypto");

// hash turns any text into a number from 0 to 4294967295. The same text always gives the same number.
// It is done for you. Use it for keys and for server spots.
function hash(text) {
  return parseInt(createHash("md5").update(text).digest("hex").slice(0, 8), 16);
}

// modMoved(keys, from, to, hashFn = hash)
//   The plain rule puts a key on server number hashFn(key) % servers.
//   Return how many keys end up on a different server when the number of servers
//   goes from `from` to `to`.
//   Example: keys "0" to "11", hashFn = Number, from 3 to 4 servers -> 9 keys move.
function modMoved(keys, from, to, hashFn = hash) {
  // TODO
}

// createRing({ vnodes = 100, hash: hashFn = hash })
//   Makes a ring. Every server gets `vnodes` spots on the ring.
//   Spot number i of server S sits at position hashFn(S + "#" + i).   (for example "A#0", "A#1")
//   A key sits at position hashFn(key). It belongs to the FIRST spot at or after its position,
//   walking up the numbers. A key past the last spot wraps round to the FIRST spot (the smallest position).
//   Returns an object with these methods:
//
//   addServer(name)     adds the server's spots to the ring. Returns true.
//                       If the name is already on the ring, it returns false and changes nothing.
//   removeServer(name)  removes all of the server's spots. Returns true.
//                       If the name is not on the ring, it returns false and changes nothing.
//   serverFor(key)      returns the name of the server that owns the key.
//                       When the ring has no servers it returns null.
//   servers()           an array of the server names on the ring, in alphabetical order.
function createRing(options) {
  // TODO
}

// ringMoved(keys, ring, change)
//   Count the keys that change server when change(ring) runs.
//   Example: ringMoved(keys, ring, (r) => r.addServer("E"))
//   The change must really run on the ring you passed in.
function ringMoved(keys, ring, change) {
  // TODO
}

module.exports = { hash, modMoved, createRing, ringMoved };
