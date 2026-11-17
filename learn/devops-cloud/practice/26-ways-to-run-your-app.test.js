const test = require("node:test");
const assert = require("node:assert");
const { lambdaFits, reconcile, choices } = require("./26-ways-to-run-your-app");

// ---- Task 1: lambdaFits ----

test("lambdaFits: a small quick job fits", () => {
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 2, memoryMb: 512, responseMb: 1 }), []);
});

test("lambdaFits: each limit gives its own problem", () => {
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 2, memoryMb: 512, responseMb: 1 }), [], "first the plain yes");
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 1200, memoryMb: 512, responseMb: 1 }), ["too long"]);
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 2, memoryMb: 16000, responseMb: 1 }), ["too much memory"]);
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 2, memoryMb: 512, responseMb: 20 }), ["response too big"]);
});

test("lambdaFits: exactly the limit is fine, one more is not", () => {
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 900, memoryMb: 10240, responseMb: 6 }), []);
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 901, memoryMb: 10240, responseMb: 6 }), ["too long"]);
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 900, memoryMb: 10241, responseMb: 6 }), ["too much memory"]);
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 900, memoryMb: 10240, responseMb: 6.5 }), ["response too big"]);
});

test("lambdaFits: several problems keep the order", () => {
  assert.deepStrictEqual(lambdaFits({ durationSeconds: 2, memoryMb: 512, responseMb: 1 }), [], "first the plain yes");
  assert.deepStrictEqual(
    lambdaFits({ durationSeconds: 5000, memoryMb: 20000, responseMb: 50 }),
    ["too long", "too much memory", "response too big"]
  );
});

// ---- Task 2: reconcile ----

test("reconcile: too few copies means start some", () => {
  assert.deepStrictEqual(reconcile(3, 1), { start: 2, stop: 0 });
  assert.deepStrictEqual(reconcile(3, 0), { start: 3, stop: 0 });
});

test("reconcile: too many copies means stop some", () => {
  assert.deepStrictEqual(reconcile(3, 1), { start: 2, stop: 0 }, "first the plain case");
  assert.deepStrictEqual(reconcile(3, 5), { start: 0, stop: 2 });
});

test("reconcile: the right number means do nothing, and a bad count is never negative", () => {
  assert.deepStrictEqual(reconcile(3, 3), { start: 0, stop: 0 });
  assert.deepStrictEqual(reconcile(3, 1), { start: 2, stop: 0 }, "first the plain case");
  assert.deepStrictEqual(reconcile(-2, 4), { start: 0, stop: 4 }, "a desired count below 0 counts as 0");
  assert.deepStrictEqual(reconcile(0, 0), { start: 0, stop: 0 });
});

// ---- Task 3: choices ----

test("choices: pick the right way to run each app", () => {
  assert.deepStrictEqual(choices, {
    twoServicesOnOneSmallServerNeverScales: "compose",
    fiveServicesOnMyOwnServerWantADashboardAndHttps: "caprover",
    awsOnlyTeamWantsContainersAndNoServersToPatch: "fargate",
    manyTeamsManyServicesNeedOneStandardTool: "kubernetes",
    resizeAnImageWhenAFileIsUploadedAFewTimesADay: "lambda",
  });
});
