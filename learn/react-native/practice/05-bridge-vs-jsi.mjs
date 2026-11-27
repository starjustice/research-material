// Lesson 05: the old bridge against JSI. This is a MODEL to feel the difference.
// The real bridge and the real JSI are native code, not this. The ideas are the same.
//
// nativeModules looks like: { Storage: { save(data) { ... } } }

// Task 1: the old bridge.
// call(module, method, ...args)
//   - turn the call into text with JSON.stringify NOW (so a later change to the object does not count)
//   - put it in a queue and count it in stats
//   - return a Promise. Nothing runs yet.
// flush()
//   - deliver the queue in order: read the text back, call the native method, send the result back as JSON text
//   - the Promise gets the JSON-read copy of the result. A native error rejects the Promise.
// stats() returns { messages, bytes }: how many calls were queued and how many characters the call texts have.
export function createBridge(nativeModules) {
  // your code here
}

// Task 2: JSI. JavaScript holds the native object and calls it directly.
// call(module, method, ...args) runs at once and returns what the method returns (the same object, no copy).
// stats() always returns { messages: 0, bytes: 0 }, because no message is ever made.
export function createJsi(hostObjects) {
  // your code here
}
