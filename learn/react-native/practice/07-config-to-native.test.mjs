import test from "node:test";
import assert from "node:assert";
import { prebuild, withCameraPermission } from "./07-config-to-native.mjs";

const makeConfig = () => ({
  name: "Shop",
  ios: { bundleIdentifier: "com.example.shop" },
  android: { package: "com.example.shop" },
  permissions: ["android.permission.INTERNET"],
});

function deepFreeze(value) {
  Object.values(value).forEach((v) => typeof v === "object" && v !== null && deepFreeze(v));
  return Object.freeze(value);
}

test("prebuild makes the ios and android settings from the app config", () => {
  assert.deepStrictEqual(prebuild(makeConfig()), {
    ios: { bundleIdentifier: "com.example.shop", infoPlist: { CFBundleDisplayName: "Shop" } },
    android: {
      package: "com.example.shop",
      appName: "Shop",
      permissions: ["android.permission.INTERNET"],
    },
  });
});

test("prebuild with no permissions in the config gives an empty list", () => {
  const config = makeConfig();
  delete config.permissions;
  assert.deepStrictEqual(prebuild(config).android.permissions, []);
});

test("prebuild does not change the app config", () => {
  const config = deepFreeze(makeConfig());
  const result = prebuild(config, [withCameraPermission("Take photos")]);
  assert.ok(result.android.permissions.includes("android.permission.CAMERA"));
});

test("running prebuild twice gives equal results, in new objects", () => {
  const config = makeConfig();
  const a = prebuild(config, [withCameraPermission("Take photos")]);
  const b = prebuild(config, [withCameraPermission("Take photos")]);
  assert.deepStrictEqual(a, b);
  assert.notStrictEqual(a, b);
});

test("changing the app config changes the result", () => {
  const config = makeConfig();
  config.name = "Store";
  const result = prebuild(config);
  assert.strictEqual(result.ios.infoPlist.CFBundleDisplayName, "Store");
  assert.strictEqual(result.android.appName, "Store");
});

test("changing the result does not change the app config", () => {
  const config = makeConfig();
  prebuild(config).android.permissions.push("android.permission.CAMERA");
  assert.deepStrictEqual(config.permissions, ["android.permission.INTERNET"]);
});

test("withCameraPermission adds the iOS text and the Android permission", () => {
  const result = prebuild(makeConfig(), [withCameraPermission("Take photos")]);
  assert.strictEqual(result.ios.infoPlist.NSCameraUsageDescription, "Take photos");
  assert.deepStrictEqual(result.android.permissions, [
    "android.permission.INTERNET",
    "android.permission.CAMERA",
  ]);
});

test("withCameraPermission does not add the permission twice", () => {
  const config = makeConfig();
  config.permissions.push("android.permission.CAMERA");
  const result = prebuild(config, [withCameraPermission("Take photos"), withCameraPermission("Scan codes")]);
  assert.deepStrictEqual(result.android.permissions, ["android.permission.INTERNET", "android.permission.CAMERA"]);
  assert.strictEqual(result.ios.infoPlist.NSCameraUsageDescription, "Scan codes");
});

test("plugins run in order, so the later one wins", () => {
  const first = (config) => ({ ...config, ios: { ...config.ios, infoPlist: { ...config.ios.infoPlist, Key: "first" } } });
  const second = (config) => ({ ...config, ios: { ...config.ios, infoPlist: { ...config.ios.infoPlist, Key: "second" } } });
  assert.strictEqual(prebuild(makeConfig(), [first, second]).ios.infoPlist.Key, "second");
  assert.strictEqual(prebuild(makeConfig(), [second, first]).ios.infoPlist.Key, "first");
});

test("withCameraPermission does not change the config it receives", () => {
  const base = deepFreeze(prebuild(makeConfig()));
  assert.doesNotThrow(() => withCameraPermission("Take photos")(base));
});
