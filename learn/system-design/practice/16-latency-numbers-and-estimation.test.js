const test = require("node:test");
const assert = require("node:assert");
const { requestTime, estimate } = require("./16-latency-numbers-and-estimation");

const call = (rttMs, workMs) => ({ rttMs, workMs });

test("one call takes the round trip plus the work", () => {
  assert.strictEqual(requestTime([[call(0.5, 1)]]), 1.5);
});

test("groups run one after the other and add up", () => {
  const five = Array.from({ length: 5 }, () => [call(150, 1)]);
  assert.strictEqual(requestTime(five), 755);
});

test("calls in one group start together, so the slowest one decides", () => {
  assert.strictEqual(requestTime([[call(150, 1), call(150, 1), call(150, 1), call(150, 1), call(150, 1)]]), 151);
  assert.strictEqual(requestTime([[call(1, 2)], [call(1, 2), call(5, 1)]]), 9);
});

test("no groups, or an empty group, take no time", () => {
  assert.strictEqual(requestTime([]), 0);
  assert.strictEqual(requestTime([[], [call(2, 3)]]), 5);
});

const paste = { dailyUsers: 1e6, writesPerUser: 1, readsPerWrite: 10, bytesPerWrite: 10000 };
const big = { dailyUsers: 50e6, writesPerUser: 1, readsPerWrite: 10, bytesPerWrite: 50 };

test("a million users writing once a day is 10 writes a second", () => {
  const e = estimate(paste);
  assert.strictEqual(e.writesPerDay, 1e6);
  assert.strictEqual(e.writesPerSec, 10);
  assert.strictEqual(e.readsPerSec, 100);
});

test("the peak is three times the average by default", () => {
  const e = estimate(paste);
  assert.strictEqual(e.peakWrites, 30);
  assert.strictEqual(e.peakReads, 300);
  assert.strictEqual(estimate({ ...paste, peakFactor: 5 }).peakReads, 500);
});

test("storage per day and per year", () => {
  const e = estimate(paste);
  assert.strictEqual(e.bytesPerDay, 1e10);
  assert.strictEqual(e.bytesPerYear, 3.65e12);
});

test("servers are rounded up", () => {
  assert.strictEqual(estimate(paste).servers, 1);
  assert.strictEqual(estimate(big).servers, 17);
  assert.strictEqual(estimate({ ...paste, serverRps: 100 }).servers, 4);
});

test("the driver is storage when traffic is small and storage is big", () => {
  assert.strictEqual(estimate(paste).driver, "storage");
});

test("the driver is traffic when traffic is big and storage is small", () => {
  const e = estimate(big);
  assert.strictEqual(e.peakReads, 15000);
  assert.strictEqual(e.bytesPerYear, 9.125e11);
  assert.strictEqual(e.driver, "traffic");
});

test("the driver can be both or neither", () => {
  assert.strictEqual(estimate({ ...big, bytesPerWrite: 2000 }).driver, "both");
  assert.strictEqual(estimate({ dailyUsers: 1000, writesPerUser: 1, readsPerWrite: 10, bytesPerWrite: 100 }).driver, "neither");
});

test("the seconds in a day can be changed", () => {
  assert.strictEqual(estimate({ ...paste, secondsPerDay: 86400 }).writesPerSec, 1e6 / 86400);
});
