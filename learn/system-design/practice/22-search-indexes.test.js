const test = require("node:test");
const assert = require("node:assert");
const { tokenize, createIndex, createSync } = require("./22-search-indexes");

test("tokenize lowercases and splits on everything that is not a letter or digit", () => {
  assert.deepStrictEqual(tokenize("Red Shoes, size 42!"), ["red", "shoes", "size", "42"]);
  assert.deepStrictEqual(tokenize("well-made  T-SHIRT"), ["well", "made", "t", "shirt"]);
});

test("tokenize keeps repeated words, and gives [] when there are no words", () => {
  assert.deepStrictEqual(tokenize("go go go"), ["go", "go", "go"]);
  assert.deepStrictEqual(tokenize(""), []);
  assert.deepStrictEqual(tokenize("!!! ... ---"), []);
});

const shop = () => {
  const index = createIndex();
  index.add(1, "red running shoes");
  index.add(2, "blue running shirt");
  index.add(3, "red red shirt");
  index.add(4, "green hat");
  return index;
};

test("postings lists the ids that contain a word, sorted", () => {
  const index = shop();
  assert.deepStrictEqual(index.postings("red"), [1, 3]);
  assert.deepStrictEqual(index.postings("running"), [1, 2]);
  assert.deepStrictEqual(index.postings("RED"), [1, 3]);
  assert.deepStrictEqual(index.postings("purple"), []);
});

test("search one word: the more times it appears, the higher the score", () => {
  assert.deepStrictEqual(shop().search("red"), [{ id: 3, score: 2 }, { id: 1, score: 1 }]);
});

test("search with several words needs every word in the document", () => {
  const index = shop();
  assert.deepStrictEqual(index.search("red shirt"), [{ id: 3, score: 3 }]);
  assert.deepStrictEqual(index.search("running"), [{ id: 1, score: 1 }, { id: 2, score: 1 }]);
  assert.deepStrictEqual(index.search("red hat"), []);
});

test("search ignores case, punctuation and repeated words in the query", () => {
  const index = shop();
  assert.deepStrictEqual(index.search("RED, Shirt!"), index.search("red shirt"));
  assert.deepStrictEqual(index.search("red red"), index.search("red"));
});

test("a word nobody has, or an empty query, gives no results", () => {
  const index = shop();
  assert.deepStrictEqual(index.search("purple"), []);
  assert.deepStrictEqual(index.search("red purple"), []);
  assert.deepStrictEqual(index.search(""), []);
  assert.deepStrictEqual(index.search("???"), []);
});

test("equal scores: the smaller id comes first, and limit cuts the list", () => {
  const index = createIndex();
  [5, 2, 9, 7].forEach((id) => index.add(id, "shoe"));
  assert.deepStrictEqual(index.search("shoe").map((h) => h.id), [2, 5, 7, 9]);
  assert.deepStrictEqual(index.search("shoe", 2).map((h) => h.id), [2, 5]);
});

test("ids can be strings", () => {
  const index = createIndex();
  index.add("b", "tea");
  index.add("a", "tea");
  assert.deepStrictEqual(index.search("tea").map((h) => h.id), ["a", "b"]);
  assert.deepStrictEqual(index.postings("tea"), ["a", "b"]);
});

test("adding the same id again replaces the old text", () => {
  const index = shop();
  index.add(1, "yellow boots");
  assert.deepStrictEqual(index.postings("red"), [3]);
  assert.deepStrictEqual(index.postings("shoes"), []);
  assert.deepStrictEqual(index.search("yellow boots"), [{ id: 1, score: 2 }]);
});

test("remove takes a document out, and returns false for an unknown id", () => {
  const index = shop();
  assert.strictEqual(index.remove(3), true);
  assert.deepStrictEqual(index.search("red"), [{ id: 1, score: 1 }]);
  assert.strictEqual(index.remove(3), false);
  assert.strictEqual(index.remove(99), false);
});

test("stats counts documents and different words, and a word with no documents leaves", () => {
  const index = shop();
  assert.deepStrictEqual(index.stats(), { docs: 4, terms: 7 });   // red, running, shoes, blue, shirt, green, hat
  index.remove(4);                                                // green and hat are gone
  assert.deepStrictEqual(index.stats(), { docs: 3, terms: 5 });
});

test("sync applies a change, and ignores a repeat of the same version", () => {
  const index = createIndex();
  const sync = createSync(index);
  assert.strictEqual(sync.apply({ op: "upsert", id: 1, version: 1, text: "red shoes" }), "applied");
  assert.strictEqual(sync.apply({ op: "upsert", id: 1, version: 1, text: "red shoes" }), "stale");
  assert.deepStrictEqual(index.search("red"), [{ id: 1, score: 1 }]);
});

test("sync: an older change that arrives late does not undo a newer one", () => {
  const index = createIndex();
  const sync = createSync(index);
  sync.apply({ op: "upsert", id: 1, version: 2, text: "blue shoes" });
  assert.strictEqual(sync.apply({ op: "upsert", id: 1, version: 1, text: "red shoes" }), "stale");
  assert.deepStrictEqual(index.postings("blue"), [1]);
  assert.deepStrictEqual(index.postings("red"), []);
});

test("sync: a delete wins over a late older upsert", () => {
  const index = createIndex();
  const sync = createSync(index);
  sync.apply({ op: "upsert", id: 1, version: 1, text: "red shoes" });
  assert.strictEqual(sync.apply({ op: "delete", id: 1, version: 3 }), "applied");
  assert.strictEqual(sync.apply({ op: "upsert", id: 1, version: 2, text: "red shoes" }), "stale");
  assert.deepStrictEqual(index.search("red"), []);
  assert.deepStrictEqual(index.stats(), { docs: 0, terms: 0 });
});

test("sync: each id has its own version, and an unknown op throws", () => {
  const index = createIndex();
  const sync = createSync(index);
  sync.apply({ op: "upsert", id: 1, version: 5, text: "a" });
  assert.strictEqual(sync.apply({ op: "upsert", id: 2, version: 1, text: "b" }), "applied");
  assert.throws(() => sync.apply({ op: "merge", id: 3, version: 1 }), Error);
});
