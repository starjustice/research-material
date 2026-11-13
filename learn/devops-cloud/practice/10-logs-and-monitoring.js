// Lesson 10: Logs and monitoring. Write the six pieces below, then run:
//   node --test learn/devops-cloud/practice/10-logs-and-monitoring.test.js
//
// A log line in this exercise is one line of JSON text, like the lines your app prints to stdout:
//   {"time":"2026-11-13T23:09:44.159Z","level":"error","msg":"payment provider timed out","requestId":"r-cy"}
// An "entry" is that line after JSON.parse. The four levels, from quiet to serious: debug, info, warn, error.
//
//   parseLogLines(text)
//       text holds many lines, separated by "\n". Return { entries, skipped }.
//         entries: the parsed objects, in the same order.
//         skipped: how many lines could not be used.
//       Blank lines (empty or only spaces) are ignored and are NOT counted as skipped.
//       A line is skipped (and counted) when it is not valid JSON, for example a stack trace line,
//       or when it is valid JSON but not a log entry. A log entry is an object (not an array,
//       not null, not a number) that has a text "level" and a text "time".
//
//   filterLogs(entries, options)
//       options may have minLevel ("debug", "info", "warn" or "error") and requestId (text).
//       Return a NEW list with the entries that pass every option that is given, in the same order.
//         minLevel: keep entries whose level is this level or more serious.
//                   An entry with a level that is not one of the four is dropped when minLevel is given.
//         requestId: keep entries whose requestId is equal to it.
//       With no options (or {}), keep everything. Do not change the list you were given.
//
//   errorsPerMinute(entries)
//       Count the entries whose level is "error", for each minute. The minute is the first 16
//       characters of the time ("2026-11-13T23:09"). Return a plain object such as
//       { "2026-11-13T23:09": 2, "2026-11-13T23:10": 1 }. A minute with no errors is not in it.
//
//   findAlert(perMinute, threshold, inARow)
//       perMinute is the object from errorsPerMinute. A minute is "bad" when its count is
//       threshold or more. Return the minute (the key) that completes a run of inARow bad minutes
//       that touch each other on the clock: 23:09 and 23:10 touch, 23:09 and 23:11 do not.
//       A minute that is missing from the object had no errors, so it is not bad.
//       Return null when no run is long enough. Minutes may come in any key order, and the
//       run may cross an hour or a day ("23:59" then "00:00" of the next day).
//
//   healthStatus(results, retries)
//       results is a list of true (the check passed) or false (it failed), oldest first.
//       This is how Docker's HEALTHCHECK works. Return { status, failingStreak }.
//         It starts as "starting" with a failingStreak of 0.
//         A pass makes the status "healthy" and sets failingStreak back to 0.
//         A failure adds 1 to failingStreak. When failingStreak reaches retries (default 3),
//         the status becomes "unhealthy". Fewer failures than that leave the status as it was.
//         The failingStreak keeps counting while the container stays unhealthy.
//
//   keptLines(lines, maxSize, maxFile)
//       A small model of Docker's json-file log rotation. lines is a list of text lines.
//       A line takes line.length + 1 bytes (one more for the newline).
//       Lines go into the current file. When the next line would make the current file bigger
//       than maxSize, and the current file already has a line in it, start a new file.
//       (So a line that is bigger than maxSize still gets written, alone in a file.)
//       Only the newest maxFile files are kept: the older files are deleted.
//       Return the lines that are still on disk, oldest first, as one flat list.
//       maxSize can be Infinity, which means the file never rotates.

function parseLogLines(text) {
  // TODO
}

function filterLogs(entries, options) {
  // TODO
}

function errorsPerMinute(entries) {
  // TODO
}

function findAlert(perMinute, threshold, inARow) {
  // TODO
}

function healthStatus(results, retries) {
  // TODO
}

function keptLines(lines, maxSize, maxFile) {
  // TODO
}

module.exports = { parseLogLines, filterLogs, errorsPerMinute, findAlert, healthStatus, keptLines };
