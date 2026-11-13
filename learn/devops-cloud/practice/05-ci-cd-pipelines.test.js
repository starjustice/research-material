const test = require("node:test");
const assert = require("node:assert");
const { runPipeline, cacheKey, cacheLookup, afterGreen, rollbackTarget } = require("./05-ci-cd-pipelines");

const stages = [
  { name: "install", needs: [] },
  { name: "lint", needs: ["install"] },
  { name: "test", needs: ["install"] },
  { name: "build", needs: ["lint", "test"] },
  { name: "deploy", needs: ["build"] },
];

// ---------- runPipeline ----------

test("runPipeline: when nothing fails, every stage passes", () => {
  assert.deepStrictEqual(runPipeline(stages), {
    install: "passed", lint: "passed", test: "passed", build: "passed", deploy: "passed",
  });
});

test("runPipeline: results can be left out or empty, and a stage without needs is fine", () => {
  assert.deepStrictEqual(runPipeline([{ name: "a" }, { name: "b", needs: ["a"] }], {}), { a: "passed", b: "passed" });
});

test("runPipeline: a failed stage stops the line, so every later stage is skipped", () => {
  // lint comes before test, test fails: nothing after test runs
  assert.deepStrictEqual(runPipeline(stages, { test: "fail" }), {
    install: "passed", lint: "passed", test: "failed", build: "skipped", deploy: "skipped",
  });
});

test("runPipeline: fail fast skips later stages even when they do not need the failed one", () => {
  // lint fails, test does not need lint, but the line is stopped
  assert.deepStrictEqual(runPipeline(stages, { lint: "fail" }), {
    install: "passed", lint: "failed", test: "skipped", build: "skipped", deploy: "skipped",
  });
});

test("runPipeline: failFast false lets independent stages run, but dependents are skipped", () => {
  assert.deepStrictEqual(runPipeline(stages, { lint: "fail" }, { failFast: false }), {
    install: "passed", lint: "failed", test: "passed", build: "skipped", deploy: "skipped",
  });
});

test("runPipeline: failFast true is the same as the default", () => {
  assert.deepStrictEqual(
    runPipeline(stages, { lint: "fail" }, { failFast: true }),
    runPipeline(stages, { lint: "fail" })
  );
  assert.strictEqual(runPipeline(stages, { lint: "fail" }, { failFast: true }).test, "skipped");
});

test("runPipeline: both lint and test can fail when failFast is false", () => {
  assert.deepStrictEqual(runPipeline(stages, { lint: "fail", test: "fail" }, { failFast: false }), {
    install: "passed", lint: "failed", test: "failed", build: "skipped", deploy: "skipped",
  });
});

test("runPipeline: a skipped stage never counts as failed, even if its result says fail", () => {
  assert.deepStrictEqual(runPipeline(stages, { test: "fail", build: "fail" }), {
    install: "passed", lint: "passed", test: "failed", build: "skipped", deploy: "skipped",
  });
});

test("runPipeline: the first stage can fail and everything is skipped", () => {
  assert.deepStrictEqual(runPipeline(stages, { install: "fail" }), {
    install: "failed", lint: "skipped", test: "skipped", build: "skipped", deploy: "skipped",
  });
});

test("runPipeline: a skip passes down a long chain", () => {
  const chain = [
    { name: "a", needs: [] },
    { name: "b", needs: ["a"] },
    { name: "c", needs: ["b"] },
    { name: "d", needs: ["c"] },
  ];
  assert.deepStrictEqual(runPipeline(chain, { b: "fail" }, { failFast: false }), {
    a: "passed", b: "failed", c: "skipped", d: "skipped",
  });
});

test("runPipeline: a stage that needs a name that is not written earlier throws unknown stage", () => {
  assert.throws(() => runPipeline([{ name: "a", needs: ["ghost"] }]), /unknown stage/);
  assert.throws(() => runPipeline([{ name: "a", needs: ["b"] }, { name: "b", needs: [] }]), /unknown stage/);
  assert.throws(() => runPipeline([{ name: "a", needs: ["a"] }]), /unknown stage/);
});

test("runPipeline: does not change its inputs", () => {
  const results = { test: "fail" };
  const out = runPipeline(stages, results);
  assert.strictEqual(out.test, "failed");
  assert.deepStrictEqual(results, { test: "fail" });
  assert.strictEqual(stages.length, 5);
  assert.deepStrictEqual(stages[3], { name: "build", needs: ["lint", "test"] });
});

// ---------- cacheKey ----------

test("cacheKey: os, the word npm, and the first 16 letters of the sha256 of the lockfile", () => {
  // sha256 of "abc" starts with ba7816bf8f01cfea (checked with: printf abc | shasum -a 256)
  assert.strictEqual(cacheKey("linux", "abc"), "linux-npm-ba7816bf8f01cfea");
});

test("cacheKey: the same lockfile gives the same key", () => {
  const lock = '{"packages":{"node_modules/express":{"version":"5.1.0"}}}';
  assert.match(cacheKey("linux", lock), /^linux-npm-[0-9a-f]{16}$/);
  assert.strictEqual(cacheKey("linux", lock), cacheKey("linux", lock));
});

test("cacheKey: one changed character gives a new key", () => {
  const a = cacheKey("linux", '{"express":"5.1.0"}');
  const b = cacheKey("linux", '{"express":"5.1.1"}');
  assert.notStrictEqual(a, b);
  assert.match(a, /^linux-npm-[0-9a-f]{16}$/);
  assert.match(b, /^linux-npm-[0-9a-f]{16}$/);
});

test("cacheKey: another os gives another key for the same lockfile", () => {
  assert.strictEqual(cacheKey("macos", "abc"), "macos-npm-ba7816bf8f01cfea");
  assert.notStrictEqual(cacheKey("macos", "abc"), cacheKey("linux", "abc"));
});

test("cacheKey: a lockfile of the same length but other content gives another key", () => {
  assert.notStrictEqual(cacheKey("linux", "aaaa"), cacheKey("linux", "bbbb"));
  assert.strictEqual(cacheKey("linux", ""), "linux-npm-e3b0c44298fc1c14");   // sha256 of the empty text
});

// ---------- cacheLookup ----------

const saved = ["linux-npm-aaaa", "linux-npm-bbbb", "macos-npm-cccc"];   // oldest first, newest last

test("cacheLookup: an exact key is a hit", () => {
  assert.deepStrictEqual(cacheLookup(saved, "linux-npm-aaaa"), { result: "hit", key: "linux-npm-aaaa" });
  assert.deepStrictEqual(cacheLookup(saved, "linux-npm-aaaa", ["linux-npm-"]), { result: "hit", key: "linux-npm-aaaa" });
});

test("cacheLookup: no match and no restore keys is a miss", () => {
  assert.deepStrictEqual(cacheLookup(saved, "linux-npm-zzzz"), { result: "miss", key: null });
  assert.deepStrictEqual(cacheLookup([], "linux-npm-zzzz", ["linux-npm-"]), { result: "miss", key: null });
});

test("cacheLookup: a restore key that starts a saved key is a partial hit, newest first", () => {
  assert.deepStrictEqual(cacheLookup(saved, "linux-npm-zzzz", ["linux-npm-"]), { result: "partial", key: "linux-npm-bbbb" });
});

test("cacheLookup: restore keys are tried in order", () => {
  assert.deepStrictEqual(cacheLookup(saved, "x", ["macos-npm-", "linux-npm-"]), { result: "partial", key: "macos-npm-cccc" });
  assert.deepStrictEqual(cacheLookup(saved, "x", ["windows-npm-", "linux-npm-"]), { result: "partial", key: "linux-npm-bbbb" });
});

test("cacheLookup: a restore key that matches nothing is a miss", () => {
  assert.deepStrictEqual(cacheLookup(saved, "x", ["windows-npm-"]), { result: "miss", key: null });
});

test("cacheLookup: an exact hit wins over a restore key, and the saved list is not changed", () => {
  const list = ["a-1", "a-2", "b-1"];
  assert.deepStrictEqual(cacheLookup(list, "a-1", ["a-"]), { result: "hit", key: "a-1" });
  assert.deepStrictEqual(cacheLookup(list, "q", ["a-"]), { result: "partial", key: "a-2" });
  assert.deepStrictEqual(list, ["a-1", "a-2", "b-1"]);
});

test("cacheLookup: newest means last in the list, not the biggest name, and the list stays as it was", () => {
  const list = ["b-2", "b-1"];
  assert.deepStrictEqual(cacheLookup(list, "q", ["b-"]), { result: "partial", key: "b-1" });
  assert.deepStrictEqual(list, ["b-2", "b-1"]);
});

test("cacheLookup: a restore key must be the START of a saved key, not just a piece of it", () => {
  assert.deepStrictEqual(cacheLookup(["old-linux-npm-1"], "q", ["linux-npm-"]), { result: "miss", key: null });
});

// ---------- afterGreen ----------

test("afterGreen: continuous integration stops after the build and the tests", () => {
  assert.strictEqual(afterGreen("integration", false), "done");
  assert.strictEqual(afterGreen("integration", true), "done");
});

test("afterGreen: continuous delivery waits for a person, then deploys", () => {
  assert.strictEqual(afterGreen("delivery", false), "wait for approval");
  assert.strictEqual(afterGreen("delivery", true), "deploy");
});

test("afterGreen: continuous deployment deploys without asking", () => {
  assert.strictEqual(afterGreen("deployment", false), "deploy");
  assert.strictEqual(afterGreen("deployment", true), "deploy");
});

test("afterGreen: any other mode throws unknown mode", () => {
  assert.throws(() => afterGreen("magic", true), /unknown mode/);
  assert.throws(() => afterGreen(undefined, true), /unknown mode/);
});

// ---------- rollbackTarget ----------

test("rollbackTarget: goes back to the release just before the current one", () => {
  const releases = [{ tag: "1.3.0", good: true }, { tag: "1.4.0", good: true }, { tag: "1.5.0", good: false }];
  assert.strictEqual(rollbackTarget(releases), "1.4.0");
});

test("rollbackTarget: skips releases that were already bad", () => {
  const releases = [
    { tag: "1.3.0", good: true },
    { tag: "1.4.0", good: false },
    { tag: "1.5.0", good: false },
  ];
  assert.strictEqual(rollbackTarget(releases), "1.3.0");
});

test("rollbackTarget: the current release is never the target, even when it is marked good", () => {
  const releases = [{ tag: "1.3.0", good: false }, { tag: "1.4.0", good: true }];
  assert.strictEqual(rollbackTarget(releases), null);
});

test("rollbackTarget: null when there is nothing to go back to", () => {
  assert.strictEqual(rollbackTarget([]), null);
  assert.strictEqual(rollbackTarget([{ tag: "1.0.0", good: true }]), null);
  assert.strictEqual(rollbackTarget([{ tag: "1.0.0", good: false }, { tag: "1.1.0", good: false }]), null);
});

test("rollbackTarget: does not change the list", () => {
  const releases = [{ tag: "1.3.0", good: true }, { tag: "1.4.0", good: true }];
  assert.strictEqual(rollbackTarget(releases), "1.3.0");
  assert.strictEqual(releases.length, 2);
  assert.strictEqual(releases[1].tag, "1.4.0");
});
