// Lesson 07: Continuous Native Generation (CNG), as a small model.
// In a real Expo project, "npx expo prebuild" makes the ios and android folders from your
// app config plus config plugins. Here, prebuild makes a plain object instead of folders.
// This is a model to learn the idea. It is not the real Expo code.
//
// appConfig looks like:
//   { name: "Shop", ios: { bundleIdentifier }, android: { package }, permissions: [..] }
// A plugin is a function: (config) => a NEW config. It never changes the config it receives.

// Task 1: build the starting config from appConfig, then run each plugin in order.
// Starting config:
//   {
//     ios: { bundleIdentifier, infoPlist: { CFBundleDisplayName: appConfig.name } },
//     android: { package, appName: appConfig.name, permissions: [...appConfig.permissions] }
//   }
// permissions may be missing in appConfig: use an empty list. Do not change appConfig,
// and do not share the permissions array with it. Return a new object every time.
export function prebuild(appConfig, plugins = []) {
  // your code here
}

// Task 2: a plugin that asks for the camera.
//   ios.infoPlist.NSCameraUsageDescription = text
//   android.permissions gets "android.permission.CAMERA", but only once
// Return a new config. Do not change the one you receive.
export function withCameraPermission(text) {
  // your code here
}
