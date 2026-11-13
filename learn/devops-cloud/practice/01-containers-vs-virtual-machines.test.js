const test = require("node:test");
const assert = require("node:assert");
const { memoryLimitBytes, runResult, namespacesSeen, whichFeature, compareCosts, chooseIsolation } = require("./01-containers-vs-virtual-machines");

test("64m is the number the kernel shows in memory.max", () => {
  assert.strictEqual(memoryLimitBytes("64m"), 67108864);
});

test("memory units k, m and g are 1024 based, in any case", () => {
  assert.strictEqual(memoryLimitBytes("512k"), 524288);
  assert.strictEqual(memoryLimitBytes("1g"), 1073741824);
  assert.strictEqual(memoryLimitBytes("64M"), 67108864);
  assert.strictEqual(memoryLimitBytes("64mb"), 67108864);
});

test("a plain number is bytes", () => {
  assert.strictEqual(memoryLimitBytes("100"), 100);
  assert.strictEqual(memoryLimitBytes("4096"), 4096);
});

test("text that is not a size throws an Error", () => {
  for (const bad of ["abc", "", "12x", "m64", "6.4m"]) {
    assert.throws(() => memoryLimitBytes(bad), Error, "should throw for " + JSON.stringify(bad));
  }
});

test("a program that uses more than the limit is killed with exit code 137", () => {
  assert.deepStrictEqual(runResult({ limit: "64m", usedMiB: 100 }), { killed: true, exitCode: 137 });
  assert.deepStrictEqual(runResult({ limit: "64m", usedMiB: 65 }), { killed: true, exitCode: 137 });
});

test("a program that stays under the limit ends with exit code 0", () => {
  assert.deepStrictEqual(runResult({ limit: "64m", usedMiB: 10 }), { killed: false, exitCode: 0 });
  assert.deepStrictEqual(runResult({ limit: "1g", usedMiB: 512 }), { killed: false, exitCode: 0 });
});

test("using exactly the limit is not more than the limit", () => {
  assert.deepStrictEqual(runResult({ limit: "64m", usedMiB: 64 }), { killed: false, exitCode: 0 });
});

test("the limit is read in its own unit", () => {
  assert.strictEqual(runResult({ limit: "1g", usedMiB: 2000 }).killed, true);
  assert.strictEqual(runResult({ limit: "512k", usedMiB: 1 }).killed, true);
  assert.strictEqual(runResult({ limit: "512k", usedMiB: 0.25 }).killed, false);
});

test("a normal container gets its own copy of everything it sees", () => {
  assert.deepStrictEqual(namespacesSeen([]), { mnt: "own", pid: "own", net: "own", uts: "own", ipc: "own" });
  assert.deepStrictEqual(namespacesSeen(["--memory=64m", "--rm"]), { mnt: "own", pid: "own", net: "own", uts: "own", ipc: "own" });
});

test("--pid=host shares the host process list and nothing else", () => {
  assert.deepStrictEqual(namespacesSeen(["--pid=host"]), { mnt: "own", pid: "host", net: "own", uts: "own", ipc: "own" });
});

test("--network=host and --net=host share the host network", () => {
  assert.strictEqual(namespacesSeen(["--network=host"]).net, "host");
  assert.strictEqual(namespacesSeen(["--net=host"]).net, "host");
  assert.strictEqual(namespacesSeen(["--network=host"]).pid, "own");
});

test("several flags can be mixed, and unknown flags change nothing", () => {
  assert.deepStrictEqual(
    namespacesSeen(["--uts=host", "--memory=64m", "--ipc=host", "--mnt=host"]),
    { mnt: "own", pid: "own", net: "own", uts: "host", ipc: "host" }
  );
});

test("whichFeature names the namespace for what a container sees", () => {
  assert.deepStrictEqual(whichFeature("own process numbers"), { kind: "namespace", name: "pid" });
  assert.deepStrictEqual(whichFeature("own hostname"), { kind: "namespace", name: "uts" });
  assert.deepStrictEqual(whichFeature("own network ports"), { kind: "namespace", name: "net" });
  assert.deepStrictEqual(whichFeature("own filesystem view"), { kind: "namespace", name: "mnt" });
});

test("whichFeature names the cgroup for what a container may use", () => {
  assert.deepStrictEqual(whichFeature("memory limit"), { kind: "cgroup", name: "memory" });
  assert.deepStrictEqual(whichFeature("cpu limit"), { kind: "cgroup", name: "cpu" });
  assert.deepStrictEqual(whichFeature("process count limit"), { kind: "cgroup", name: "pids" });
});

test("whichFeature throws for something it does not know", () => {
  assert.throws(() => whichFeature("own kernel"), Error);
  assert.throws(() => whichFeature(""), Error);
});

test("compareCosts adds up the time and the memory of count of them", () => {
  const r = compareCosts({ startMs: 230, memoryMiB: 0.5 }, { startMs: 30000, memoryMiB: 1024 }, 10);
  assert.deepStrictEqual(r.totalStartMs, { container: 2300, vm: 300000 });
  assert.deepStrictEqual(r.totalMemoryMiB, { container: 5, vm: 10240 });
});

test("compareCosts gives the ratios vm over container, rounded to 1 decimal", () => {
  const r = compareCosts({ startMs: 230, memoryMiB: 0.5 }, { startMs: 30000, memoryMiB: 1024 }, 1);
  assert.strictEqual(r.startRatio, 130.4);
  assert.strictEqual(r.memoryRatio, 2048);
});

test("compareCosts works with a count of 1 and with small ratios", () => {
  const r = compareCosts({ startMs: 200, memoryMiB: 2 }, { startMs: 250, memoryMiB: 3 }, 1);
  assert.deepStrictEqual(r.totalStartMs, { container: 200, vm: 250 });
  assert.strictEqual(r.startRatio, 1.3);
  assert.strictEqual(r.memoryRatio, 1.5);
});

test("an app that needs another kernel needs a vm", () => {
  assert.strictEqual(chooseIsolation({ needsOtherKernel: true, runsUntrustedCode: false, startsOften: false }), "vm");
  assert.strictEqual(chooseIsolation({ needsOtherKernel: true, runsUntrustedCode: true, startsOften: true }), "vm");
});

test("untrusted code that starts often gets a microvm, and long lived untrusted code gets a vm", () => {
  assert.strictEqual(chooseIsolation({ needsOtherKernel: false, runsUntrustedCode: true, startsOften: true }), "microvm");
  assert.strictEqual(chooseIsolation({ needsOtherKernel: false, runsUntrustedCode: true, startsOften: false }), "vm");
});

test("your own trusted app on Linux is fine in a container", () => {
  assert.strictEqual(chooseIsolation({ needsOtherKernel: false, runsUntrustedCode: false, startsOften: false }), "container");
  assert.strictEqual(chooseIsolation({ needsOtherKernel: false, runsUntrustedCode: false, startsOften: true }), "container");
});
