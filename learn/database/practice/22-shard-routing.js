// Lesson 22: Partitioning and sharding. The JavaScript part: which shard does a row go to?
// Write the three functions marked TODO, then run (from the folder that contains learn/):
//   node --test learn/database/practice/22-shard-routing.test.js
//
// No npm install is needed. There is no database here: a "shard" is only a number (0, 1, 2, ...).

// A small, stable hash (FNV-1a, 32 bit). It gives the same number on every machine. Do not change it.
function hash(id) {
  let h = 0x811c9dc5;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// How many of these ids go to a different shard with router "before" than with router "after"? (Do not change it.)
function countMoved(ids, before, after) {
  return ids.filter(id => before(id) !== after(id)).length;
}

// ---------------------------------------------------------------------------
// Task 1. The simple way: the shard is the hash, divided by the number of shards, remainder.
// shardOf("user-1", 4) must be a number from 0 to 3. The same id must always give the same shard.
// ---------------------------------------------------------------------------
function shardOf(id, shardCount) {
  // TODO
}

// ---------------------------------------------------------------------------
// Task 2. The better way: 1024 buckets. A list ("owners") says which shard owns each bucket.
// owners[7] === 2 means: bucket 7 lives on shard 2.
// makeBucketRouter(owners) returns a function: id => the shard that owns the bucket of that id.
// The bucket of an id is hash(id) % owners.length.
// ---------------------------------------------------------------------------
function makeBucketRouter(owners) {
  // TODO
}

// ---------------------------------------------------------------------------
// Task 3. Add a shard without moving everything.
// addShard(owners, newShard) returns a NEW list. Let n = newShard + 1 (the new number of shards).
// Every bucket b where b % n === n - 1 now belongs to newShard. All other buckets keep their owner.
// Do not change the list you were given.
// ---------------------------------------------------------------------------
function addShard(owners, newShard) {
  // TODO
}

module.exports = { hash, countMoved, shardOf, makeBucketRouter, addShard };
