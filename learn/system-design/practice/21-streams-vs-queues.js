// Lesson 21: Streams vs queues. Write createLog and assign below, then run:
//   node --test learn/system-design/practice/21-streams-vs-queues.test.js
const { createHash } = require("crypto");

// hash turns any text into a number. The same text always gives the same number.
// It is done for you. Real Kafka uses a different hash (murmur2), but the idea is the same.
function hash(text) {
  return parseInt(createHash("md5").update(text).digest("hex").slice(0, 8), 16);
}

// createLog({ partitions = 2, hash: hashFn = hash }) makes a small append-only log, like one Kafka topic.
// It has `partitions` separate lists. A message is never removed. Groups only keep a bookmark.
// A message goes to partition hashFn(key) % partitions. Offsets start at 0 in each partition.
// It returns an object with these methods:
//
//   partitionOf(key)                 the partition number for this key.
//   append(key, value)               adds { key, value } to the END of the key's partition.
//                                    Returns { partition, offset }, where offset is the message's place in that partition.
//   size(partition)                  how many messages that partition holds.
//   read(group, partition, max = 10) the messages the group has not committed past yet, oldest first, at most `max`.
//                                    Each one is { partition, offset, key, value }.
//                                    It starts at the group's saved position (0 if the group never committed).
//                                    It does NOT move the saved position. Reading twice gives the same messages.
//   commit(group, partition, offset) saves the group's position: the next offset the group wants to read.
//                                    Returns true. If offset is below 0 or above size(partition),
//                                    return false and change nothing.
//                                    Committing an earlier offset is how a group replays old messages.
//   position(group, partition)       the saved position (0 if the group never committed).
//   lag(group)                       how many messages, over all partitions, the group has not committed past yet.
//
// Every group keeps its own position for every partition. Groups never affect each other.
function createLog(options) {
  // TODO
}

// assign(partitionCount, members) gives each partition to ONE member of a group.
//   Round robin: partition p goes to members[p % members.length].
//   It returns an object with one array for each member, for example
//   assign(4, ["m1", "m2"]) is { m1: [0, 2], m2: [1, 3] }.
//   A member with no partition gets an empty array. With no members it returns {}.
function assign(partitionCount, members) {
  // TODO
}

module.exports = { hash, createLog, assign };
