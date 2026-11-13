// Lesson 05: CI/CD pipelines. Write the five pieces below, then run:
//   node --test learn/devops-cloud/practice/05-ci-cd-pipelines.test.js
//
// A stage in this exercise is a plain object: { name: "test", needs: ["install"] }.
// "needs" lists stages that must pass first. A stage may only need stages written EARLIER in the list.
//
//   runPipeline(stages, results, options)
//       stages is a list of stages in the order they are written.
//       results says which stages fail when they run, for example { test: "fail" }.
//       A stage that is not in results passes. results may be left out.
//       options is { failFast: true } by default. It may be left out.
//       Return an object that gives every stage name one of three words:
//         "passed"  the stage ran and passed
//         "failed"  the stage ran and results says "fail"
//         "skipped" the stage never started
//       Go through the stages in order. A stage is "skipped" when
//         - one of its needs did not end as "passed", or
//         - failFast is true and any earlier stage ended as "failed" (the line is stopped).
//       A skipped stage never counts as failed, whatever results says.
//       Throw an Error containing "unknown stage" when a need is not a stage written earlier in the list.
//       Do not change stages or results.
//
//   cacheKey(os, lockfileText)
//       Return the text  <os>-npm-<16 letters>  where the 16 letters are the first 16 characters of the
//       sha256 hash of lockfileText, written in hex. Example: cacheKey("linux", "abc") is
//       "linux-npm-ba7816bf8f01cfea". Same lockfile, same key. Any change in the lockfile, a new key.
//       Hint: require("node:crypto").createHash("sha256").update(text).digest("hex")
//
//   cacheLookup(saved, key, restoreKeys)
//       saved is the list of keys already stored, OLDEST first, so the newest key is the last one.
//       restoreKeys is a list of key starts, tried in order. It may be left out.
//       Return one of:
//         { result: "hit", key }          when saved contains key exactly (this is checked first)
//         { result: "partial", key: k }   when no exact match, and the first restoreKey that starts at least
//                                         one saved key gives k = the NEWEST saved key that starts with it
//         { result: "miss", key: null }   otherwise
//       Do not change saved.
//
//   afterGreen(mode, approved)
//       The build and the tests passed. What happens next? mode is one of:
//         "integration"  return "done"                (CI stops here)
//         "delivery"     return "deploy" when approved is true, otherwise "wait for approval"
//         "deployment"   return "deploy"              (no person in the way)
//       Any other mode: throw an Error containing "unknown mode".
//
//   rollbackTarget(releases)
//       releases is a list of { tag, good } with the OLDEST first. The LAST one is running now, and it is bad.
//       Return the tag of the newest release before the last one that has good set to true.
//       Return null when there is none. Do not change the list.

function runPipeline(stages, results, options) {
  // TODO
}

function cacheKey(os, lockfileText) {
  // TODO
}

function cacheLookup(saved, key, restoreKeys) {
  // TODO
}

function afterGreen(mode, approved) {
  // TODO
}

function rollbackTarget(releases) {
  // TODO
}

module.exports = { runPipeline, cacheKey, cacheLookup, afterGreen, rollbackTarget };
