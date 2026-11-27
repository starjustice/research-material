import test from "node:test";
import assert from "node:assert";
import { pickUpdate, runtimeVersionFor, republish } from "./08-pick-update.mjs";

const build = { runtimeVersion: "1.0.0", channel: "production", platform: "ios" };
const u = (id, extra = {}) => ({
  id,
  runtimeVersion: "1.0.0",
  branch: "production",
  platform: "ios",
  createdAt: 100,
  ...extra,
});

test("pickUpdate: the newest update on the linked branch wins", () => {
  const updates = [u("a", { createdAt: 100 }), u("c", { createdAt: 300 }), u("b", { createdAt: 200 })];
  assert.strictEqual(pickUpdate(build, updates, { production: "production" }).id, "c");
});

test("pickUpdate: the platform must match exactly", () => {
  const updates = [u("android-new", { platform: "android", createdAt: 500 }), u("ios-old", { createdAt: 100 })];
  assert.strictEqual(pickUpdate(build, updates, {}).id, "ios-old");
});

test("pickUpdate: the runtime version must match exactly", () => {
  const updates = [u("new-native", { runtimeVersion: "2.0.0", createdAt: 500 }), u("ok", { createdAt: 100 })];
  assert.strictEqual(pickUpdate(build, updates, {}).id, "ok");
  assert.strictEqual(pickUpdate(build, [updates[0]], {}), null, "an update for runtime 2.0.0 is never sent to a 1.0.0 build");
});

test("pickUpdate: a channel can be linked to any branch", () => {
  const updates = [u("p", { branch: "production", createdAt: 100 }), u("v2", { branch: "version-2.0", createdAt: 50 })];
  assert.strictEqual(pickUpdate(build, updates, { production: "version-2.0" }).id, "v2");
});

test("pickUpdate: with no link set, a channel uses the branch with the same name", () => {
  const updates = [u("p", { branch: "production" }), u("s", { branch: "staging", createdAt: 999 })];
  assert.strictEqual(pickUpdate(build, updates, {}).id, "p");
});

test("pickUpdate: nothing fits, so it returns null; and it does not change the list", () => {
  const updates = [u("b", { createdAt: 2 }), u("a", { createdAt: 1 })];
  assert.strictEqual(pickUpdate({ ...build, channel: "staging" }, updates, {}), null);
  pickUpdate(build, updates, {});
  assert.deepStrictEqual(updates.map((x) => x.id), ["b", "a"]);
});

test("runtimeVersionFor: a custom string is used as it is, appVersion uses the version", () => {
  const project = { version: "1.4.0" };
  assert.strictEqual(runtimeVersionFor("2024-fix", project, "ios"), "2024-fix");
  assert.strictEqual(runtimeVersionFor({ policy: "appVersion" }, project, "ios"), "1.4.0");
});

test("runtimeVersionFor: nativeVersion joins the version and the native build number", () => {
  const project = { version: "1.0.0", ios: { buildNumber: "7" }, android: { versionCode: 12 } };
  assert.strictEqual(runtimeVersionFor({ policy: "nativeVersion" }, project, "ios"), "1.0.0(7)");
  assert.strictEqual(runtimeVersionFor({ policy: "nativeVersion" }, project, "android"), "1.0.0(12)");
});

test("runtimeVersionFor: fingerprint stays the same when only JavaScript changes", () => {
  const native = { nativeDependencies: { "expo-camera": "17.0.0", "react-native": "0.88.0" }, permissions: ["CAMERA"] };
  const a = runtimeVersionFor({ policy: "fingerprint" }, { ...native, jsHash: "aaa" }, "ios");
  const b = runtimeVersionFor({ policy: "fingerprint" }, { ...native, jsHash: "bbb" }, "ios");
  const reordered = runtimeVersionFor(
    { policy: "fingerprint" },
    { nativeDependencies: { "react-native": "0.88.0", "expo-camera": "17.0.0" }, permissions: ["CAMERA"], jsHash: "ccc" },
    "ios"
  );
  assert.strictEqual(a, b);
  assert.strictEqual(a, reordered);
  assert.strictEqual(typeof a, "string");
});

test("runtimeVersionFor: fingerprint changes when native code or permissions change", () => {
  const base = { nativeDependencies: { "react-native": "0.88.0" }, permissions: ["CAMERA"] };
  const fp = (p) => runtimeVersionFor({ policy: "fingerprint" }, p, "ios");
  const withLib = { ...base, nativeDependencies: { ...base.nativeDependencies, "expo-camera": "17.0.0" } };
  const withPermission = { ...base, permissions: ["CAMERA", "LOCATION"] };
  assert.notStrictEqual(fp(base), fp(withLib));
  assert.notStrictEqual(fp(base), fp(withPermission));
});

test("republish: puts a copy of an older update on top, like a git revert", () => {
  const good = u("good", { createdAt: 100 });
  const bad = u("bad", { createdAt: 200 });
  const list = [good, bad];
  const after = republish(list, "good", "good-again", 300);
  assert.strictEqual(pickUpdate(build, after, {}).id, "good-again");
  assert.strictEqual(pickUpdate(build, after, {}).runtimeVersion, "1.0.0");
  assert.strictEqual(list.length, 2, "the old list is not changed");
  assert.strictEqual(after.length, 3, "the bad update is still in the history");
  assert.throws(() => republish(list, "missing", "x", 400));
});
