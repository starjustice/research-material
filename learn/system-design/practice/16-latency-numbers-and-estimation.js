// Lesson 16: Latency numbers and estimation. Write requestTime and estimate below, then run:
//   node --test learn/system-design/practice/16-latency-numbers-and-estimation.test.js

// requestTime(steps) -> total time in milliseconds
//
//   steps is a list of groups. Each group is a list of calls that start at the same moment.
//   Groups run one after the other. A call is { rttMs, workMs }:
//     rttMs   the round trip to the other machine
//     workMs  the time the other machine spends on the work
//   One call takes rttMs + workMs.
//   A group takes as long as its slowest call. The whole request is the sum of all groups.
//   No groups, or an empty group, takes 0.
//   Example: [[{rttMs: 1, workMs: 2}], [{rttMs: 1, workMs: 2}, {rttMs: 5, workMs: 1}]] -> 3 + 6 = 9
//
// estimate(input) -> numbers for a back of the envelope design check
//
//   input: {
//     dailyUsers, writesPerUser, readsPerWrite, bytesPerWrite,
//     peakFactor = 3,         // the busiest time is this many times the average
//     secondsPerDay = 100000, // a day is 86,400 seconds. We round to 100,000 on purpose.
//     serverRps = 1000,       // what one simple server handles in one second
//     bigBytesPerYear = 1e12, // 1 TB a year counts as a lot of storage
//   }
//
//   returns {
//     writesPerDay   dailyUsers * writesPerUser
//     writesPerSec   writesPerDay / secondsPerDay
//     readsPerSec    writesPerSec * readsPerWrite
//     peakWrites     writesPerSec * peakFactor
//     peakReads      readsPerSec * peakFactor
//     bytesPerDay    writesPerDay * bytesPerWrite
//     bytesPerYear   bytesPerDay * 365
//     servers        how many servers the peak needs: (peakWrites + peakReads) / serverRps, rounded UP
//     driver         what is hard here:
//                      "traffic" when peakWrites + peakReads is above serverRps and storage is not big
//                      "storage" when bytesPerYear is above bigBytesPerYear and traffic is not big
//                      "both"    when both are big
//                      "neither" when neither is big
//   }
function requestTime(steps) {
  // TODO
}

function estimate(input) {
  // TODO
}

module.exports = { requestTime, estimate };
