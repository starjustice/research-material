// Lesson 06: compile at build time, load at start.
// Hermes does this with its own bytecode. Here we use Node's V8 "code cache" as a stand-in.
// It is a model, not Hermes. The idea is the same: save the compiled code, load it next time.
import vm from "node:vm";

// Task 1: compile the source with a vm.Script and return { cachedData }.
// cachedData is the compiled code as a Buffer. Use script.createCachedData().
export function compileToCache(source) {
  // your code here
}

// Task 2: run the source the slow way (no cache).
// Return { result, rejected: false }. Run the script with runInNewContext({}).
export function runFromSource(source) {
  // your code here
}

// Task 3: run the source with a cache. Pass { cachedData } as the second
// argument of new vm.Script. Return { result, rejected }.
// rejected is true when the engine did not accept the cache: script.cachedDataRejected.
export function runFromCache(source, cachedData) {
  // your code here
}
