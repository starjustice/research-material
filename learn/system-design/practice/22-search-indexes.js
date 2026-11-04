// Lesson 22: Search indexes. Write tokenize, createIndex and createSync below, then run:
//   node --test learn/system-design/practice/22-search-indexes.test.js

// tokenize(text) -> an array of words
//   Make the text lowercase. A word is a run of letters a to z or digits 0 to 9.
//   Everything else (spaces, commas, dashes ...) separates words. Keep repeated words.
//   Example: "Red Shoes, size 42!" -> ["red", "shoes", "size", "42"]
//   No words (for example "" or "!!!") -> [].
function tokenize(text) {
  // TODO
}

// createIndex() makes a small search index: an inverted index.
//   For every word it keeps the documents that contain it, and how many times.
//   Document ids are numbers or strings. Compare ids with < and > (numbers by value, strings by order).
//
//   add(id, text)     Index a document. If this id was added before, the old words are removed first,
//                     so the new text replaces the old one.
//   remove(id)        Take the document out. Return true, or false if the id is not in the index.
//                     A word that no document has any more must disappear from the index (see stats).
//   postings(word)    The ids of the documents that contain the word, sorted from small to big.
//                     The word is made lowercase first. An unknown word gives [].
//   search(query, limit = 10)
//                     Only documents that contain EVERY word of the query (use tokenize on the query,
//                     and ignore repeated words in it). A query with no words gives [].
//                     Score of a document = for each query word, how many times it is in the document, added up.
//                     Return [{ id, score }], the best score first. Equal scores: the smaller id first.
//                     At most `limit` results.
//   stats()           { docs, terms }: how many documents and how many different words are in the index.
function createIndex() {
  // TODO
}

// createSync(index) keeps the index in step with changes that come from the database.
//   A change is { op, id, version, text }. op is "upsert" or "delete". version is a number that grows
//   with every change of the same id in the database. text is only used for "upsert".
//   Changes can arrive twice, or in the wrong order.
//
//   apply(change)     Look at the newest version seen for this id (a deleted id counts too).
//                     - If change.version is not bigger than that: do nothing and return "stale".
//                     - Otherwise: "upsert" calls index.add(id, text), "delete" calls index.remove(id),
//                       remember the version, and return "applied".
//                     - An unknown op throws an Error.
function createSync(index) {
  // TODO
}

module.exports = { tokenize, createIndex, createSync };
