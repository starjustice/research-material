const test = require("node:test");
const assert = require("node:assert");
const { whichJob, sizeIt, missingParts } = require("./01-the-interview-framework");

test("whichJob follows the clock, job by job", () => {
  const expected = [
    [0, "Requirements"], [4.9, "Requirements"], [5, "Estimate"], [8, "Estimate"],
    [9, "API"], [12, "API"], [13, "Data"], [16, "Data"],
    [17, "High level design"], [24, "High level design"], [25, "Deep dive"], [39, "Deep dive"],
    [40, "What breaks"], [44, "What breaks"],
  ];
  for (const [minute, job] of expected) assert.strictEqual(whichJob(minute), job, "minute " + minute);
});

test("whichJob says time is over from minute 45", () => {
  assert.strictEqual(whichJob(45), "Time is over");
  assert.strictEqual(whichJob(90), "Time is over");
});

test("whichJob refuses a minute that makes no sense", () => {
  assert.throws(() => whichJob(-1));
  assert.throws(() => whichJob(NaN));
  assert.throws(() => whichJob("5"));
  assert.throws(() => whichJob());
});

test("the deep dive and what breaks are the longest part of the clock", () => {
  let deep = 0;
  for (let m = 0; m < 45; m += 0.5) if (["Deep dive", "What breaks"].includes(whichJob(m))) deep += 0.5;
  assert.strictEqual(deep, 20);
});

test("sizeIt: the paste bin of the lesson has storage as its driver", () => {
  assert.deepStrictEqual(sizeIt({ perDay: 1e6, readsPerWrite: 10, kbPerWrite: 10 }),
    { writesPerSec: 10, peakReadsPerSec: 300, gbPerDay: 10, driver: "storage" });
});

test("sizeIt: a much bigger paste bin has traffic as its driver", () => {
  assert.deepStrictEqual(sizeIt({ perDay: 5e7, readsPerWrite: 10, kbPerWrite: 2 }),
    { writesPerSec: 500, peakReadsPerSec: 15000, gbPerDay: 100, driver: "traffic" });
});

test("sizeIt: the driver changes at 1000 reads a second at the busiest time", () => {
  assert.strictEqual(sizeIt({ perDay: 3e6, readsPerWrite: 10, kbPerWrite: 1 }).peakReadsPerSec, 900);
  assert.strictEqual(sizeIt({ perDay: 3e6, readsPerWrite: 10, kbPerWrite: 1 }).driver, "storage");
  assert.strictEqual(sizeIt({ perDay: 5e6, readsPerWrite: 10, kbPerWrite: 1 }).peakReadsPerSec, 1500);
  assert.strictEqual(sizeIt({ perDay: 5e6, readsPerWrite: 10, kbPerWrite: 1 }).driver, "traffic");
});

const full = {
  options: ["keep the text in the database", "keep the text in file storage"],
  cost: "file storage is one more part to run",
  choice: { name: "file storage", reason: "the driver is storage and the database would grow 10 GB a day" },
  changeMind: "if pastes lived only 7 days I would keep them in the database",
};

test("missingParts: a full answer misses nothing", () => {
  assert.deepStrictEqual(missingParts(full), []);
});

test("missingParts: 'I would use S3' is missing all four parts", () => {
  assert.deepStrictEqual(missingParts({ choice: { name: "S3" } }), ["options", "cost", "choice", "changeMind"]);
});

test("missingParts: it names exactly the parts that are missing, in order", () => {
  assert.deepStrictEqual(missingParts({ ...full, changeMind: "" }), ["changeMind"]);
  assert.deepStrictEqual(missingParts({ ...full, options: ["only one way"] }), ["options"]);
  assert.deepStrictEqual(missingParts({ ...full, cost: undefined, changeMind: undefined }), ["cost", "changeMind"]);
  assert.deepStrictEqual(missingParts({ ...full, choice: { name: "file storage", reason: "" } }), ["choice"]);
});

test("missingParts: spaces alone do not count, and an empty call misses everything", () => {
  assert.deepStrictEqual(missingParts({ ...full, cost: "   " }), ["cost"]);
  assert.deepStrictEqual(missingParts({ ...full, options: ["a way", "  "] }), ["options"]);
  assert.deepStrictEqual(missingParts(), ["options", "cost", "choice", "changeMind"]);
  assert.deepStrictEqual(missingParts({}), ["options", "cost", "choice", "changeMind"]);
});
