const test = require("node:test");
const assert = require("node:assert");
const { probeAction, probesRunning, parseQuantity, limitEffect, rolloutLimits, rollout } = require("./11-kubernetes-probes-limits-and-rollouts");

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
const state = (old, starting, ready) => ({ old, starting, ready });

// ---------- probeAction ----------

test("probeAction: a liveness probe that fails often enough restarts the container", () => {
  assert.strictEqual(probeAction("liveness", [true, false, false, false], 3), "restart");
});

test("probeAction: a readiness probe that fails often enough stops traffic, and never restarts", () => {
  assert.strictEqual(probeAction("readiness", [false, false, false], 3), "stop traffic");
  assert.strictEqual(probeAction("readiness", [false, false], 2), "stop traffic");
});

test("probeAction: a startup probe that fails often enough restarts the container", () => {
  assert.strictEqual(probeAction("startup", [false, false, false], 3), "restart");
  assert.strictEqual(probeAction("startup", new Array(24).fill(false), 24), "restart");
});

test("probeAction: fewer failures than the threshold do nothing", () => {
  assert.strictEqual(probeAction("liveness", [false, false], 3), "none");
  assert.strictEqual(probeAction("readiness", [false], 2), "none");
  assert.strictEqual(probeAction("startup", [], 3), "none");
});

test("probeAction: only the failures in a row at the end count", () => {
  assert.strictEqual(probeAction("liveness", [false, false, true, false, false], 3), "none");
  assert.strictEqual(probeAction("liveness", [false, false, false, true], 3), "none");
});

test("probeAction: a pass at the end clears a readiness failure", () => {
  assert.strictEqual(probeAction("readiness", [false, false, false, true], 3), "none");
});

test("probeAction: the failure threshold defaults to 3", () => {
  assert.strictEqual(probeAction("liveness", [false, false]), "none");
  assert.strictEqual(probeAction("liveness", [false, false, false]), "restart");
});

test("probeAction: more failures than the threshold still give the same action", () => {
  assert.strictEqual(probeAction("liveness", new Array(9).fill(false), 3), "restart");
  assert.strictEqual(probeAction("readiness", new Array(9).fill(false), 3), "stop traffic");
});

test("probeAction: an unknown probe type is an error", () => {
  assert.throws(() => probeAction("health", [false, false, false], 3));
  assert.throws(() => probeAction("Liveness", [false], 1));
});

// ---------- probesRunning ----------

test("probesRunning: while a startup probe has not passed, only it runs", () => {
  assert.deepStrictEqual(probesRunning(true, false), ["startup"]);
});

test("probesRunning: after the startup probe passed, liveness and readiness run", () => {
  assert.deepStrictEqual(probesRunning(true, true), ["liveness", "readiness"]);
});

test("probesRunning: with no startup probe, liveness and readiness always run", () => {
  assert.deepStrictEqual(probesRunning(false, false), ["liveness", "readiness"]);
  assert.deepStrictEqual(probesRunning(false, true), ["liveness", "readiness"]);
});

// ---------- parseQuantity ----------

test("parseQuantity: a plain number is itself", () => {
  assert.strictEqual(parseQuantity("2"), 2);
  assert.strictEqual(parseQuantity("0"), 0);
  assert.strictEqual(parseQuantity("1.5"), 1.5);
  assert.strictEqual(parseQuantity("0.5"), 0.5);
});

test("parseQuantity: m means one thousandth", () => {
  close(parseQuantity("500m"), 0.5);
  close(parseQuantity("250m"), 0.25);
  close(parseQuantity("100m"), 0.1);
  close(parseQuantity("1500m"), 1.5);
  close(parseQuantity("1000m"), 1);
});

test("parseQuantity: Mi, Gi and Ki are powers of two", () => {
  assert.strictEqual(parseQuantity("128Mi"), 134217728);
  assert.strictEqual(parseQuantity("1Gi"), 1073741824);
  assert.strictEqual(parseQuantity("64Ki"), 65536);
  assert.strictEqual(parseQuantity("1Ti"), 1099511627776);
  assert.strictEqual(parseQuantity("1.5Gi"), 1610612736);
});

test("parseQuantity: M, G and k are powers of ten", () => {
  assert.strictEqual(parseQuantity("128M"), 128000000);
  assert.strictEqual(parseQuantity("1G"), 1000000000);
  assert.strictEqual(parseQuantity("2k"), 2000);
  assert.strictEqual(parseQuantity("1T"), 1000000000000);
});

test("parseQuantity: 128Mi and 128M are not the same", () => {
  assert.ok(parseQuantity("128Mi") > parseQuantity("128M"));
});

test("parseQuantity: a small m on memory is thousandths of a byte, not megabytes", () => {
  close(parseQuantity("128m"), 0.128);
  assert.ok(parseQuantity("128m") < 1);
});

test("parseQuantity: text that is not a quantity is an error", () => {
  for (const bad of ["", "abc", "Mi", "12Xi", "1.5.2", "-1", "12 Mi", "m"]) {
    assert.throws(() => parseQuantity(bad), undefined, `should reject "${bad}"`);
  }
});

// ---------- limitEffect ----------

test("limitEffect: memory over the limit means killed with exit code 137", () => {
  const out = limitEffect({ memory: "256Mi" }, { memory: "300Mi", cpu: "100m" });
  assert.strictEqual(out.killed, true);
  assert.strictEqual(out.exitCode, 137);
});

test("limitEffect: memory under or equal to the limit is fine", () => {
  assert.deepStrictEqual(limitEffect({ memory: "256Mi" }, { memory: "200Mi", cpu: "100m" }), { killed: false, exitCode: null, speed: 1 });
  assert.strictEqual(limitEffect({ memory: "256Mi" }, { memory: "256Mi", cpu: "100m" }).killed, false);
});

test("limitEffect: the units are compared as bytes, so Mi against M matters", () => {
  assert.strictEqual(limitEffect({ memory: "128M" }, { memory: "125Mi", cpu: "0" }).killed, true);
  assert.strictEqual(limitEffect({ memory: "128Mi" }, { memory: "128M", cpu: "0" }).killed, false);
});

test("limitEffect: no memory limit means never killed", () => {
  assert.strictEqual(limitEffect({}, { memory: "64Gi", cpu: "1" }).killed, false);
  assert.strictEqual(limitEffect({ cpu: "500m" }, { memory: "64Gi", cpu: "100m" }).exitCode, null);
});

test("limitEffect: cpu over the limit means slower, not killed", () => {
  const out = limitEffect({ cpu: "500m" }, { memory: "10Mi", cpu: "1" });
  assert.strictEqual(out.killed, false);
  close(out.speed, 0.5);
});

test("limitEffect: a quarter of a core for work that wants one core runs at a quarter speed", () => {
  close(limitEffect({ cpu: "250m" }, { memory: "10Mi", cpu: "1" }).speed, 0.25);
  close(limitEffect({ cpu: "500m" }, { memory: "10Mi", cpu: "750m" }).speed, 2 / 3);
});

test("limitEffect: cpu at or under the limit runs at full speed", () => {
  assert.strictEqual(limitEffect({ cpu: "500m" }, { memory: "10Mi", cpu: "500m" }).speed, 1);
  assert.strictEqual(limitEffect({ cpu: "1" }, { memory: "10Mi", cpu: "300m" }).speed, 1);
  assert.strictEqual(limitEffect({}, { memory: "10Mi", cpu: "4" }).speed, 1);
});

test("limitEffect: a pod can be killed and slow at the same time", () => {
  const out = limitEffect({ memory: "64Mi", cpu: "100m" }, { memory: "100Mi", cpu: "1" });
  assert.strictEqual(out.killed, true);
  close(out.speed, 0.1);
});

// ---------- rolloutLimits ----------

test("rolloutLimits: whole numbers are used as they are", () => {
  assert.deepStrictEqual(rolloutLimits(3, 1, 0), { maxPods: 4, minReady: 3 });
  assert.deepStrictEqual(rolloutLimits(5, 2, 1), { maxPods: 7, minReady: 4 });
});

test("rolloutLimits: the defaults are 25 percent and 25 percent", () => {
  assert.deepStrictEqual(rolloutLimits(3), { maxPods: 4, minReady: 3 });
  assert.deepStrictEqual(rolloutLimits(4), { maxPods: 5, minReady: 3 });
  assert.deepStrictEqual(rolloutLimits(10), { maxPods: 13, minReady: 8 });
});

test("rolloutLimits: maxSurge rounds up", () => {
  assert.strictEqual(rolloutLimits(3, "10%", 1).maxPods, 4);
  assert.strictEqual(rolloutLimits(1, "25%", 0).maxPods, 2);
  assert.strictEqual(rolloutLimits(10, "25%", 0).maxPods, 13);
});

test("rolloutLimits: maxUnavailable rounds down", () => {
  assert.strictEqual(rolloutLimits(3, 1, "25%").minReady, 3);
  assert.strictEqual(rolloutLimits(10, 1, "25%").minReady, 8);
  assert.strictEqual(rolloutLimits(10, 1, "29%").minReady, 8);
});

test("rolloutLimits: both 0 written by hand is an error", () => {
  assert.throws(() => rolloutLimits(3, 0, 0));
  assert.throws(() => rolloutLimits(3, "0%", "0%"));
  assert.throws(() => rolloutLimits(3, 0, "0%"));
});

test("rolloutLimits: both 0 only by rounding gives one pod of room", () => {
  assert.deepStrictEqual(rolloutLimits(3, 0, "10%"), { maxPods: 3, minReady: 2 });
  assert.deepStrictEqual(rolloutLimits(2, "0%", "1%"), { maxPods: 2, minReady: 1 });
});

test("rolloutLimits: surge 0 with unavailable 1 never goes above the wanted count", () => {
  assert.deepStrictEqual(rolloutLimits(3, 0, 1), { maxPods: 3, minReady: 2 });
});

// ---------- rollout ----------

test("rollout: 3 pods, surge 1, unavailable 0, new pods pass readiness (the lesson's story)", () => {
  const out = rollout(3, { maxSurge: 1, maxUnavailable: 0 }, true);
  assert.deepStrictEqual(out.steps, [state(3, 0, 0), state(3, 1, 0), state(2, 1, 1), state(1, 1, 2), state(0, 0, 3)]);
  assert.strictEqual(out.status, "done");
  assert.strictEqual(out.maxPods, 4);
  assert.strictEqual(out.minReady, 3);
});

test("rollout: new pods never pass readiness, so the rollout stalls and the old pods stay", () => {
  const out = rollout(3, { maxSurge: 1, maxUnavailable: 0 }, false);
  assert.deepStrictEqual(out.steps, [state(3, 0, 0), state(3, 1, 0)]);
  assert.strictEqual(out.status, "stalled");
  assert.strictEqual(out.minReady, 3);
  assert.strictEqual(out.maxPods, 4);
});

test("rollout: surge 0 and unavailable 1 uses no extra pod, but capacity dips by one", () => {
  const out = rollout(3, { maxSurge: 0, maxUnavailable: 1 }, true);
  assert.deepStrictEqual(out.steps, [state(3, 0, 0), state(2, 1, 0), state(1, 1, 1), state(0, 1, 2), state(0, 0, 3)]);
  assert.strictEqual(out.status, "done");
  assert.strictEqual(out.maxPods, 3);
  assert.strictEqual(out.minReady, 2);
});

test("rollout: a bad release with unavailable 1 stalls too, but it already cost one pod of capacity", () => {
  const out = rollout(3, { maxSurge: 0, maxUnavailable: 1 }, false);
  assert.deepStrictEqual(out.steps, [state(3, 0, 0), state(2, 1, 0)]);
  assert.strictEqual(out.status, "stalled");
  assert.strictEqual(out.minReady, 2);
});

test("rollout: with no limits given, the 25 percent defaults are used", () => {
  const out = rollout(4, {}, true);
  assert.deepStrictEqual(out.steps, [state(4, 0, 0), state(3, 2, 0), state(1, 2, 2), state(0, 0, 4)]);
  assert.strictEqual(out.status, "done");
  assert.strictEqual(out.maxPods, 5);
  assert.strictEqual(out.minReady, 3);
});

test("rollout: percentages work in the limits", () => {
  const out = rollout(10, { maxSurge: "30%", maxUnavailable: "0%" }, true);
  assert.strictEqual(out.status, "done");
  assert.strictEqual(out.maxPods, 13);
  assert.strictEqual(out.minReady, 10);
  assert.deepStrictEqual(out.steps[out.steps.length - 1], state(0, 0, 10));
});

test("rollout: one pod, default limits", () => {
  const out = rollout(1, {}, true);
  assert.deepStrictEqual(out.steps, [state(1, 0, 0), state(1, 1, 0), state(0, 0, 1)]);
  assert.strictEqual(out.maxPods, 2);
  assert.strictEqual(out.minReady, 1);
});

test("rollout: a bigger surge finishes in fewer rounds", () => {
  const slow = rollout(6, { maxSurge: 1, maxUnavailable: 0 }, true);
  const fast = rollout(6, { maxSurge: 3, maxUnavailable: 0 }, true);
  assert.ok(fast.steps.length < slow.steps.length);
  assert.strictEqual(fast.minReady, 6);
  assert.strictEqual(fast.maxPods, 9);
  assert.strictEqual(slow.maxPods, 7);
});

test("rollout: the pod count never goes above maxPods and ready pods never go below minReady", () => {
  for (const replicas of [1, 2, 3, 5, 8]) {
    for (const [s, u] of [[1, 0], [0, 1], [2, 1], ["25%", "25%"], ["50%", 0]]) {
      const { maxPods, minReady } = rolloutLimits(replicas, s, u);
      const out = rollout(replicas, { maxSurge: s, maxUnavailable: u }, true);
      assert.strictEqual(out.status, "done", `replicas ${replicas}, ${s}, ${u}`);
      for (const step of out.steps) {
        assert.ok(step.old + step.starting + step.ready <= maxPods, `too many pods: replicas ${replicas}, ${s}, ${u}`);
        assert.ok(step.old + step.ready >= minReady, `too few ready: replicas ${replicas}, ${s}, ${u}`);
        assert.ok(step.starting + step.ready <= replicas, `too many new pods: replicas ${replicas}, ${s}, ${u}`);
      }
    }
  }
});

test("rollout: a build that never passes readiness stalls for every setting", () => {
  for (const replicas of [1, 3, 6]) {
    for (const [s, u] of [[1, 0], [0, 1], [2, 1], ["25%", "25%"]]) {
      const out = rollout(replicas, { maxSurge: s, maxUnavailable: u }, false);
      assert.strictEqual(out.status, "stalled", `replicas ${replicas}, ${s}, ${u}`);
      const last = out.steps[out.steps.length - 1];
      assert.strictEqual(last.ready, 0);
      if (rolloutLimits(replicas, s, u).minReady > 0) assert.ok(last.old > 0);   // old pods stay while some must keep serving
    }
  }
});

test("rollout: both limits 0 is an error", () => {
  assert.throws(() => rollout(3, { maxSurge: 0, maxUnavailable: 0 }, true));
});

test("rollout: each step is its own object", () => {
  const out = rollout(3, { maxSurge: 1, maxUnavailable: 0 }, true);
  assert.notStrictEqual(out.steps[0], out.steps[1]);
  out.steps[0].old = 99;
  assert.strictEqual(out.steps[1].old, 3);
});
