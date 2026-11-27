// Lesson 09: save data on the phone safely, and keep it working after an app update.
// The storage you get is like AsyncStorage: async, and it keeps strings only.
//   storage.get(key)        -> text, or null when the key is missing
//   storage.set(key, text)  -> saves the text
//   storage.remove(key)     -> deletes the key

// Task 1: a store that keeps JSON with a version number.
// - set(key, value) saves the text JSON.stringify({ v: version, data: value })
// - get(key, fallback) gives the data back. It gives the fallback when:
//     the key is missing, the text is not valid JSON, the text has no { v, data } wrapper,
//     the data is from a NEWER version than the code knows,
//     or a migration step for an older version is missing.
// - When the saved version is OLDER, run migrations[oldVersion](data), then migrations[oldVersion + 1](data),
//   and so on, one step at a time, until you reach the current version.
//   Then save the result back and return it.
// - remove(key) deletes the key.
export function createJsonStore(storage, { version, migrations = {} }) {
  // your code here
}

// Task 2: an outbox for things the user did while offline.
// - add(item) puts the item at the end of a queue that is saved in storage under `key` (a JSON array)
// - flush() sends the items in order with `await send(item)`.
//   An item is removed from the saved queue only AFTER send worked.
//   On the first error, stop and keep that item and the rest.
//   Return { sent, left }: how many were sent, how many are still waiting.
export function createOutbox(storage, key, send) {
  // your code here
}
