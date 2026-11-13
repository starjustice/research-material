// Lesson 01: The interview framework. Write whichJob, sizeIt and missingParts below, then run:
//   node --test learn/system-design/practice/01-the-interview-framework.test.js

// whichJob(minute) -> the name of the job you should be doing at this minute of a 45 minute round
//
//   The clock from card 3 of the lesson:
//     0 up to 5      "Requirements"
//     5 up to 9      "Estimate"
//     9 up to 13     "API"
//     13 up to 17    "Data"
//     17 up to 25    "High level design"
//     25 up to 40    "Deep dive"
//     40 up to 45    "What breaks"
//     45 or more     "Time is over"
//   A job ends the moment the next one starts, so minute 5 is "Estimate". Minute 4.9 is still "Requirements".
//   A minute that is below 0, is not a number, or is NaN throws an Error.
//
// sizeIt({ perDay, readsPerWrite, kbPerWrite }) -> the maths of step 2 (card 2 of the lesson)
//
//   A day is 100,000 seconds. We round it on purpose.
//   returns {
//     writesPerSec      perDay / 100000
//     peakReadsPerSec   writesPerSec * readsPerWrite * 3   (the busiest time is 3 times the average)
//     gbPerDay          perDay * kbPerWrite / 1000000
//     driver            "storage" when peakReadsPerSec is below 1000, otherwise "traffic"
//                       (one simple server answers about 1,000 requests a second)
//   }
//
// missingParts({ options, cost, choice, changeMind }) -> which parts of a deep dive answer are missing (card 4)
//
//   Return a list of the missing names, always in this order: "options", "cost", "choice", "changeMind".
//     options     counts when it is a list with at least 2 non-empty strings
//     cost        counts when it is a string that is not empty after trimming spaces
//     choice      is { name, reason }. It counts only when BOTH are non-empty strings.
//                 ("I would use S3" has a name but no reason, so the choice is missing.)
//     changeMind  counts when it is a string that is not empty after trimming spaces: what would change the choice
//   Nothing missing returns an empty list. Called with no argument at all, all four are missing.
function whichJob(minute) {
  // TODO
}

function sizeIt(input) {
  // TODO
}

function missingParts(answer) {
  // TODO
}

module.exports = { whichJob, sizeIt, missingParts };
