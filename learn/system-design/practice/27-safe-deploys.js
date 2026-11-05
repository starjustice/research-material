// Lesson 27: Safe deploys. Write the five pieces below, then run:
//   node --test learn/system-design/practice/27-safe-deploys.test.js

//   bucket(userId, flagName)
//       A number from 0 to 99 that is always the same for the same user and flag.
//       Use this hash (FNV-1a): start with h = 2166136261. For each character of
//       flagName + ":" + userId do  h ^= ch.charCodeAt(0);  h = Math.imul(h, 16777619) >>> 0;
//       At the end return h % 100.
//
//   isOn(flag, userId)
//       flag looks like { name: "new-checkout", percent: 10, off: false }.
//       Return true when the user's bucket is below percent. If flag.off is true, always return false
//       (the kill switch beats everything).
//
//   canaryVerdict({ canary, control, minRequests = 200, maxExtra = 0.01 })
//       canary and control look like { requests: 200, errors: 40 }.
//       Return "wait" when the canary has fewer than minRequests requests (too few to say anything).
//       Return "rollback" when the canary error rate is higher than the control error rate plus maxExtra.
//       Otherwise return "promote". If control has 0 requests, treat its error rate as 0.
//
//   createBlueGreen()
//       Two sides, "blue" and "green". Blue starts live with version "v1". Green is empty (null).
//       It returns an object with:
//         live()       the version users get now          liveColor()   "blue" or "green"
//         idle()       the version on the side with no users (null when empty)
//         deploy(v)    put version v on the idle side
//         switch()     move all users to the idle side and return the new live version.
//                      Throw an Error when the idle side is empty.
//         rollback()   go back to the other side (the same move as switch)
//
//   firstUnsafeStep(plan)
//       plan is a list of step names for renaming a column. Each step needs an earlier step first:
//         add-new-column      needs nothing
//         deploy-write-both   needs add-new-column
//         backfill            needs deploy-write-both
//         deploy-read-new     needs backfill
//         stop-writing-old    needs deploy-read-new
//         drop-old-column     needs stop-writing-old
//       Return the first step in the plan whose needed step has not happened before it.
//       Return that step name for a name you do not know too. Return null when the plan is safe.

function bucket(userId, flagName) {
  // TODO
}

function isOn(flag, userId) {
  // TODO
}

function canaryVerdict(options) {
  // TODO
}

function createBlueGreen() {
  // TODO
}

function firstUnsafeStep(plan) {
  // TODO
}

module.exports = { bucket, isOn, canaryVerdict, createBlueGreen, firstUnsafeStep };
