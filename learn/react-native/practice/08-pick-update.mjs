// Lesson 08: which update does a build get? (A model of Expo Update's rules, not the real server.)
//
// A BUILD:  { runtimeVersion, channel, platform }
// An UPDATE: { id, runtimeVersion, branch, platform, createdAt }

// Task 1: pickUpdate(build, updates, channelToBranch)
// Return the newest update that the build can run, or null.
// - platform must be the same
// - runtimeVersion must be the same
// - the update's branch must be the branch the build's channel is linked to.
//   channelToBranch is like { production: "version-2.0" }.
//   A channel with no link uses the branch with the same name.
// - newest means the biggest createdAt. Do not change the updates array.
export function pickUpdate(build, updates, channelToBranch) {
  // your code here
}

// Task 2: runtimeVersionFor(setting, project, platform)
// setting is what you write in app config:
// - a string like "2024-fix" is a custom runtime version: return it as it is
// - { policy: "appVersion" }    -> project.version
// - { policy: "nativeVersion" } -> `${version}(${native number})`, for example "1.0.0(7)".
//      the native number is project.ios.buildNumber on "ios" and project.android.versionCode on "android"
// - { policy: "fingerprint" }   -> a string made from the NATIVE parts only:
//      project.nativeDependencies (an object name -> version) and project.permissions (an array).
//      Same native parts must give the same string, in any order. project.jsHash must NOT change it.
//      A real fingerprint hashes more than this. Here, build a short string such as "fp-1a2b3c4d".
export function runtimeVersionFor(setting, project, platform) {
  // your code here
}

// Task 3: republish(updates, id, newId, createdAt)
// Return a NEW array: the old updates plus a copy of the update with the given id,
// with id newId and the new createdAt. It becomes the newest, so builds get it.
// Throw an Error if no update has that id. Do not change the old array.
export function republish(updates, id, newId, createdAt) {
  // your code here
}
