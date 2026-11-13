const test = require("node:test");
const assert = require("node:assert");
const { parseLogLines, filterLogs, errorsPerMinute, findAlert, healthStatus, keptLines } = require("./10-logs-and-monitoring");

const line = (time, level, msg, extra = {}) => JSON.stringify({ time, level, msg, ...extra });
const e = (time, level, requestId) => ({ time, level, msg: "x", requestId });

// ---------- parseLogLines ----------

test("parseLogLines: reads one entry per JSON line, in order", () => {
  const text = [line("2026-11-13T23:09:44.159Z", "info", "request start", { requestId: "r-cy" }), line("2026-11-13T23:09:44.161Z", "error", "request done", { requestId: "r-cy", status: 500 })].join("\n");
  const { entries, skipped } = parseLogLines(text);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].msg, "request start");
  assert.strictEqual(entries[1].status, 500);
  assert.strictEqual(skipped, 0);
});

test("parseLogLines: lines that are not JSON are skipped and counted", () => {
  const text = ["Error: boom", line("2026-11-13T23:09:44.159Z", "info", "ok"), "    at server.js:10:5", "{half a line"].join("\n");
  const { entries, skipped } = parseLogLines(text);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(skipped, 3);
});

test("parseLogLines: blank lines are ignored and not counted", () => {
  const text = "\n" + line("2026-11-13T23:09:44.159Z", "info", "a") + "\n\n   \n" + line("2026-11-13T23:09:45.159Z", "info", "b") + "\n";
  const { entries, skipped } = parseLogLines(text);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(skipped, 0);
});

test("parseLogLines: valid JSON without a string level and a string time is skipped", () => {
  const text = ["42", "null", "[1,2]", '"hello"', '{"level":"info","msg":"no time"}', '{"time":"2026-11-13T23:09:44Z","msg":"no level"}', '{"time":5,"level":"info"}', '{"time":"2026-11-13T23:09:44Z","level":3}'].join("\n");
  const { entries, skipped } = parseLogLines(text);
  assert.deepStrictEqual(entries, []);
  assert.strictEqual(skipped, 8);
});

test("parseLogLines: empty text gives nothing", () => {
  assert.deepStrictEqual(parseLogLines(""), { entries: [], skipped: 0 });
});

// ---------- filterLogs ----------

const sample = [
  e("2026-11-13T23:09:44.100Z", "debug", "r-ana"),
  e("2026-11-13T23:09:44.200Z", "info", "r-bo"),
  e("2026-11-13T23:09:44.300Z", "warn", "r-ana"),
  e("2026-11-13T23:09:44.400Z", "error", "r-cy"),
  e("2026-11-13T23:09:44.500Z", "error", "r-ana"),
];

test("filterLogs: no options keeps everything, in order", () => {
  assert.deepStrictEqual(filterLogs(sample), sample);
  assert.deepStrictEqual(filterLogs(sample, {}), sample);
});

test("filterLogs: minLevel keeps that level and anything more serious", () => {
  assert.deepStrictEqual(filterLogs(sample, { minLevel: "warn" }).map((x) => x.level), ["warn", "error", "error"]);
  assert.deepStrictEqual(filterLogs(sample, { minLevel: "info" }).map((x) => x.level), ["info", "warn", "error", "error"]);
  assert.deepStrictEqual(filterLogs(sample, { minLevel: "debug" }).length, 5);
  assert.deepStrictEqual(filterLogs(sample, { minLevel: "error" }).length, 2);
});

test("filterLogs: requestId keeps only that request", () => {
  assert.deepStrictEqual(filterLogs(sample, { requestId: "r-ana" }).map((x) => x.level), ["debug", "warn", "error"]);
  assert.deepStrictEqual(filterLogs(sample, { requestId: "nobody" }), []);
});

test("filterLogs: requestId must match the whole id, not the start of it", () => {
  const ids = [e("2026-11-13T23:09:44Z", "info", "r-ana"), e("2026-11-13T23:09:45Z", "info", "r-ana2"), e("2026-11-13T23:09:46Z", "info", "r-an")];
  assert.deepStrictEqual(filterLogs(ids, { requestId: "r-an" }).map((x) => x.time), ["2026-11-13T23:09:46Z"]);
  assert.deepStrictEqual(filterLogs(ids, { requestId: "r-ana" }).map((x) => x.time), ["2026-11-13T23:09:44Z"]);
});

test("filterLogs: both options must hold at the same time", () => {
  const out = filterLogs(sample, { minLevel: "warn", requestId: "r-ana" });
  assert.deepStrictEqual(out.map((x) => x.level), ["warn", "error"]);
});

test("filterLogs: an unknown level is dropped when minLevel is set, kept when it is not", () => {
  const odd = [{ time: "2026-11-13T23:09:44Z", level: "verbose", msg: "x" }, e("2026-11-13T23:09:45Z", "error", "r")];
  assert.strictEqual(filterLogs(odd, { minLevel: "debug" }).length, 1);
  assert.strictEqual(filterLogs(odd).length, 2);
});

test("filterLogs: does not change the list it was given", () => {
  const copy = sample.slice();
  const out = filterLogs(sample, { minLevel: "error" });
  assert.strictEqual(out.length, 2);
  assert.deepStrictEqual(sample, copy);
  assert.notStrictEqual(out, sample);
  assert.notStrictEqual(filterLogs(sample), sample);
});

// ---------- errorsPerMinute ----------

test("errorsPerMinute: counts only error lines, grouped by minute", () => {
  const entries = [
    e("2026-11-13T23:09:05.000Z", "error"),
    e("2026-11-13T23:09:59.999Z", "error"),
    e("2026-11-13T23:09:30.000Z", "warn"),
    e("2026-11-13T23:10:00.000Z", "error"),
    e("2026-11-13T23:10:10.000Z", "info"),
  ];
  assert.deepStrictEqual(errorsPerMinute(entries), { "2026-11-13T23:09": 2, "2026-11-13T23:10": 1 });
});

test("errorsPerMinute: minutes without errors are not in the result", () => {
  assert.deepStrictEqual(errorsPerMinute([e("2026-11-13T23:09:05.000Z", "info")]), {});
  assert.deepStrictEqual(errorsPerMinute([]), {});
});

test("errorsPerMinute: the same minute on another hour or day is a different minute", () => {
  const entries = [e("2026-11-13T23:09:05Z", "error"), e("2026-11-13T22:09:05Z", "error"), e("2026-11-14T23:09:05Z", "error")];
  assert.deepStrictEqual(Object.keys(errorsPerMinute(entries)).sort(), ["2026-11-13T22:09", "2026-11-13T23:09", "2026-11-14T23:09"]);
});

// ---------- findAlert ----------

test("findAlert: one bad minute is enough when inARow is 1", () => {
  assert.strictEqual(findAlert({ "2026-11-13T23:09": 2, "2026-11-13T23:10": 5 }, 5, 1), "2026-11-13T23:10");
});

test("findAlert: fires on the minute that completes the run", () => {
  const m = { "2026-11-13T23:09": 6, "2026-11-13T23:10": 7, "2026-11-13T23:11": 9 };
  assert.strictEqual(findAlert(m, 5, 2), "2026-11-13T23:10");
  assert.strictEqual(findAlert(m, 5, 3), "2026-11-13T23:11");
});

test("findAlert: a count equal to the threshold counts as bad", () => {
  assert.strictEqual(findAlert({ "2026-11-13T23:09": 5 }, 5, 1), "2026-11-13T23:09");
  assert.strictEqual(findAlert({ "2026-11-13T23:09": 4 }, 5, 1), null);
});

test("findAlert: a quiet minute in the middle starts the count again", () => {
  const m = { "2026-11-13T23:09": 8, "2026-11-13T23:10": 1, "2026-11-13T23:11": 8 };
  assert.strictEqual(findAlert(m, 5, 2), null);
});

test("findAlert: a minute with no entry at all is a quiet minute", () => {
  const m = { "2026-11-13T23:09": 8, "2026-11-13T23:11": 8 };
  assert.strictEqual(findAlert(m, 5, 2), null);
  const next = { "2026-11-13T23:09": 8, "2026-11-13T23:11": 8, "2026-11-13T23:12": 8 };
  assert.strictEqual(findAlert(next, 5, 2), "2026-11-13T23:12");
});

test("findAlert: minutes across an hour and a day still count as next to each other", () => {
  assert.strictEqual(findAlert({ "2026-11-13T23:59": 9, "2026-11-14T00:00": 9 }, 5, 2), "2026-11-14T00:00");
  assert.strictEqual(findAlert({ "2026-11-13T22:59": 9, "2026-11-13T23:00": 9 }, 5, 2), "2026-11-13T23:00");
});

test("findAlert: does not depend on the order of the keys in the object", () => {
  const m = { "2026-11-13T23:11": 9, "2026-11-13T23:09": 9, "2026-11-13T23:10": 9 };
  assert.strictEqual(findAlert(m, 5, 2), "2026-11-13T23:10");
  const shuffled = { "2026-11-13T23:10": 9, "2026-11-13T23:09": 9, "2026-11-13T23:11": 9 };
  assert.strictEqual(findAlert(shuffled, 5, 3), "2026-11-13T23:11");
});

test("findAlert: quiet data and empty data give null", () => {
  assert.strictEqual(findAlert({}, 5, 2), null);
  assert.strictEqual(findAlert({ "2026-11-13T23:09": 1, "2026-11-13T23:10": 2 }, 5, 2), null);
});

// ---------- healthStatus ----------

test("healthStatus: no checks yet means starting", () => {
  assert.deepStrictEqual(healthStatus([]), { status: "starting", failingStreak: 0 });
});

test("healthStatus: the first pass makes it healthy", () => {
  assert.deepStrictEqual(healthStatus([true]), { status: "healthy", failingStreak: 0 });
});

test("healthStatus: fewer failures than retries do not change the status", () => {
  assert.deepStrictEqual(healthStatus([true, false, false]), { status: "healthy", failingStreak: 2 });
  assert.deepStrictEqual(healthStatus([false, false]), { status: "starting", failingStreak: 2 });
});

test("healthStatus: the failure that reaches retries makes it unhealthy", () => {
  assert.deepStrictEqual(healthStatus([true, false, false, false]), { status: "unhealthy", failingStreak: 3 });
  assert.deepStrictEqual(healthStatus([false, false, false]), { status: "unhealthy", failingStreak: 3 });
});

test("healthStatus: retries can be changed", () => {
  assert.strictEqual(healthStatus([true, false], 1).status, "unhealthy");
  assert.strictEqual(healthStatus([true, false, false, false], 5).status, "healthy");
  assert.strictEqual(healthStatus([true, false, false, false, false, false], 5).status, "unhealthy");
});

test("healthStatus: one pass makes an unhealthy container healthy again and resets the streak", () => {
  assert.deepStrictEqual(healthStatus([true, false, false, false, false, true]), { status: "healthy", failingStreak: 0 });
});

test("healthStatus: a pass in the middle resets the streak", () => {
  assert.deepStrictEqual(healthStatus([true, false, false, true, false, false]), { status: "healthy", failingStreak: 2 });
});

test("healthStatus: the streak keeps counting while it stays unhealthy", () => {
  assert.deepStrictEqual(healthStatus([true, false, false, false, false, false, false, false]), { status: "unhealthy", failingStreak: 7 });
});

// ---------- keptLines ----------

test("keptLines: keeps every line while they fit in one file", () => {
  assert.deepStrictEqual(keptLines(["aaaa", "bbbb"], 100, 3), ["aaaa", "bbbb"]);
});

test("keptLines: with no size limit nothing is ever dropped", () => {
  const lines = Array.from({ length: 50 }, (_, i) => "line " + i);
  assert.deepStrictEqual(keptLines(lines, Infinity, 1), lines);
});

test("keptLines: each line counts its length plus one for the newline", () => {
  // two lines of 4 letters cost 5 + 5 = 10 bytes, so they fit exactly in a file of 10
  assert.deepStrictEqual(keptLines(["aaaa", "bbbb", "cccc"], 10, 1), ["cccc"]);
  assert.deepStrictEqual(keptLines(["aaaa", "bbbb"], 10, 1), ["aaaa", "bbbb"]);
  // one more byte of room per file is not enough for a third line
  assert.deepStrictEqual(keptLines(["aaaa", "bbbb", "cccc"], 14, 1), ["cccc"]);
});

test("keptLines: only the newest max-file files are kept", () => {
  const lines = ["a1", "a2", "b1", "b2", "c1", "c2", "d1", "d2"];   // 3 + 3 = 6 per file of size 6
  assert.deepStrictEqual(keptLines(lines, 6, 2), ["c1", "c2", "d1", "d2"]);
  assert.deepStrictEqual(keptLines(lines, 6, 3), ["b1", "b2", "c1", "c2", "d1", "d2"]);
  assert.deepStrictEqual(keptLines(lines, 6, 4), lines);
});

test("keptLines: the newest line is always kept, even when it is bigger than a file", () => {
  assert.deepStrictEqual(keptLines(["short", "a very long line indeed"], 8, 1), ["a very long line indeed"]);
});

test("keptLines: a line that is bigger than a file gets its own file and is rotated out later", () => {
  assert.deepStrictEqual(keptLines(["a very long line indeed", "x", "y", "z"], 8, 2), ["a very long line indeed", "x", "y", "z"]);
  assert.deepStrictEqual(keptLines(["a very long line indeed", "x", "y", "z"], 8, 1), ["x", "y", "z"]);
});

test("keptLines: does not change the list it was given", () => {
  const lines = ["a1", "a2", "b1"];
  assert.deepStrictEqual(keptLines(lines, 6, 1), ["b1"]);
  assert.deepStrictEqual(lines, ["a1", "a2", "b1"]);
});

test("keptLines: nothing in, nothing out", () => {
  assert.deepStrictEqual(keptLines([], 10, 2), []);
});
