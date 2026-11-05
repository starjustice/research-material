const test = require("node:test");
const assert = require("node:assert");
const { bucket, isOn, canaryVerdict, createBlueGreen, firstUnsafeStep } = require("./27-safe-deploys");

test("bucket gives a whole number from 0 to 99", () => {
  for (let i = 1; i <= 500; i++) {
    const b = bucket("user" + i, "new-checkout");
    assert.ok(Number.isInteger(b) && b >= 0 && b <= 99, "bad bucket " + b);
  }
});

test("bucket is the same every time and matches the lesson numbers", () => {
  assert.strictEqual(bucket("u1", "new-checkout"), 76);
  assert.strictEqual(bucket("u1", "new-checkout"), 76);
  assert.strictEqual(bucket("u6", "new-checkout"), 9);
  assert.strictEqual(bucket("u20", "new-checkout"), 95);
});

test("the same user can land in different buckets for different flags", () => {
  let different = 0;
  for (let i = 1; i <= 200; i++) if (bucket("user" + i, "a") !== bucket("user" + i, "b")) different++;
  assert.ok(different > 150, "the flag name must be part of the hash");
});

test("buckets are spread evenly", () => {
  let below10 = 0;
  for (let i = 1; i <= 10000; i++) if (bucket("user" + i, "new-checkout") < 10) below10++;
  assert.strictEqual(below10, 975);
});

test("percent 0 is nobody and percent 100 is everybody", () => {
  for (let i = 1; i <= 300; i++) {
    assert.strictEqual(isOn({ name: "f", percent: 0 }, "u" + i), false);
    assert.strictEqual(isOn({ name: "f", percent: 100 }, "u" + i), true);
  }
});

test("10 percent turns on 975 of 10,000 users", () => {
  let on = 0;
  for (let i = 1; i <= 10000; i++) if (isOn({ name: "new-checkout", percent: 10 }, "user" + i)) on++;
  assert.strictEqual(on, 975);
});

test("raising the percent never turns anyone off", () => {
  let on10 = 0, on50 = 0;
  for (let i = 1; i <= 2000; i++) {
    const a = isOn({ name: "new-checkout", percent: 10 }, "user" + i);
    const b = isOn({ name: "new-checkout", percent: 50 }, "user" + i);
    if (a) { on10++; assert.strictEqual(b, true, "user" + i + " was on at 10 and off at 50"); }
    if (b) on50++;
  }
  assert.ok(on10 > 0 && on50 > on10);
});

test("the kill switch turns everyone off, even at 100 percent", () => {
  assert.strictEqual(isOn({ name: "f", percent: 100, off: true }, "u1"), false);
  assert.strictEqual(isOn({ name: "f", percent: 100, off: false }, "u1"), true);
});

test("a small canary says wait", () => {
  assert.strictEqual(canaryVerdict({ canary: { requests: 100, errors: 20 }, control: { requests: 5000, errors: 5 } }), "wait");
  assert.strictEqual(canaryVerdict({ canary: { requests: 199, errors: 199 }, control: { requests: 5000, errors: 5 } }), "wait");
});

test("a canary with many more errors than the control rolls back", () => {
  assert.strictEqual(canaryVerdict({ canary: { requests: 200, errors: 40 }, control: { requests: 3800, errors: 4 } }), "rollback");
});

test("a canary that looks like the control is promoted", () => {
  assert.strictEqual(canaryVerdict({ canary: { requests: 200, errors: 0 }, control: { requests: 3800, errors: 4 } }), "promote");
  assert.strictEqual(canaryVerdict({ canary: { requests: 1000, errors: 10 }, control: { requests: 9000, errors: 9 } }), "promote");
});

test("the canary is compared with the control, not with zero", () => {
  // both sides have 5 percent errors (a bad day for everybody), so the new version is not worse
  assert.strictEqual(canaryVerdict({ canary: { requests: 400, errors: 20 }, control: { requests: 4000, errors: 200 } }), "promote");
  // custom limits
  assert.strictEqual(canaryVerdict({ canary: { requests: 50, errors: 5 }, control: { requests: 4000, errors: 4 }, minRequests: 50 }), "rollback");
  assert.strictEqual(canaryVerdict({ canary: { requests: 200, errors: 6 }, control: { requests: 4000, errors: 4 }, maxExtra: 0.05 }), "promote");
});

test("a control with no requests counts as 0 percent errors", () => {
  assert.strictEqual(canaryVerdict({ canary: { requests: 300, errors: 30 }, control: { requests: 0, errors: 0 } }), "rollback");
});

test("blue green starts with v1 live on blue and nothing on green", () => {
  const bg = createBlueGreen();
  assert.strictEqual(bg.live(), "v1");
  assert.strictEqual(bg.liveColor(), "blue");
  assert.strictEqual(bg.idle(), null);
});

test("deploy goes to the idle side and users do not move", () => {
  const bg = createBlueGreen();
  bg.deploy("v2");
  assert.strictEqual(bg.idle(), "v2");
  assert.strictEqual(bg.live(), "v1");
});

test("switch moves all users, and rollback brings the old version back", () => {
  const bg = createBlueGreen();
  bg.deploy("v2");
  assert.strictEqual(bg.switch(), "v2");
  assert.strictEqual(bg.liveColor(), "green");
  assert.strictEqual(bg.idle(), "v1");
  assert.strictEqual(bg.rollback(), "v1");
  assert.strictEqual(bg.liveColor(), "blue");
});

test("switch with nothing on the idle side throws", () => {
  const bg = createBlueGreen();
  assert.throws(() => bg.switch(), /idle/);
});

test("the next release goes to the side that was just left", () => {
  const bg = createBlueGreen();
  bg.deploy("v2"); bg.switch();
  bg.deploy("v3");
  assert.strictEqual(bg.idle(), "v3");
  assert.strictEqual(bg.live(), "v2");
  assert.strictEqual(bg.switch(), "v3");
  assert.strictEqual(bg.liveColor(), "blue");
});

test("the safe order for a column rename has no unsafe step", () => {
  assert.strictEqual(firstUnsafeStep(["add-new-column", "deploy-write-both", "backfill", "deploy-read-new", "stop-writing-old", "drop-old-column"]), null);
});

test("a plan can be shorter than the full list", () => {
  assert.strictEqual(firstUnsafeStep(["add-new-column", "deploy-write-both"]), null);
  assert.strictEqual(firstUnsafeStep([]), null);
});

test("dropping the old column early is caught", () => {
  assert.strictEqual(firstUnsafeStep(["add-new-column", "drop-old-column"]), "drop-old-column");
  assert.strictEqual(firstUnsafeStep(["add-new-column", "deploy-write-both", "backfill", "drop-old-column"]), "drop-old-column");
});

test("reading the new column before the backfill is caught", () => {
  assert.strictEqual(firstUnsafeStep(["add-new-column", "deploy-write-both", "deploy-read-new", "backfill"]), "deploy-read-new");
});

test("backfilling before the app writes both is caught", () => {
  assert.strictEqual(firstUnsafeStep(["add-new-column", "backfill", "deploy-write-both"]), "backfill");
});

test("the first unsafe step is the one returned", () => {
  assert.strictEqual(firstUnsafeStep(["drop-old-column", "backfill"]), "drop-old-column");
});

test("a step with nothing before it, and an unknown step", () => {
  assert.strictEqual(firstUnsafeStep(["deploy-write-both"]), "deploy-write-both");
  assert.strictEqual(firstUnsafeStep(["add-new-column", "rename-column"]), "rename-column");
});
