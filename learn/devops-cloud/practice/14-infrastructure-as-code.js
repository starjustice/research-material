// Lesson 14: Infrastructure as code. Write the six pieces below, then run:
//   node --test learn/devops-cloud/practice/14-infrastructure-as-code.test.js
//
// This is a tiny model of what Terraform does. Three maps hold "things", each one a plain object:
// the key is the name of a thing, and the value is its settings (flat, like { size: "small" }).
//
//   desired  what your code says should exist
//   state    what the tool remembers it made the last time (the state file)
//   real     what really exists in the cloud right now
//
// The tool only manages things that are in desired or in state. A thing that is only in real
// (someone made it by hand, with a name the tool never saw) is not the tool's business: ignore it.
// Settings are equal when they have the same keys and the same values (compare values with ===).
//
//   plan(desired, state, real)
//       Return { drift, actions }. Both lists are sorted by name. Never change the three maps.
//       drift: things that changed outside the tool. For every name in state:
//         { name, kind: "missing" }                 when it is not in real any more
//         { name, kind: "changed", keys }           when real has other settings than state.
//                                                   keys = the setting names that differ, sorted
//                                                   (a key that is only on one side counts as a difference)
//       actions: what apply must do so that real matches desired:
//         { name, action: "create" }   in desired, but not in state, or in state but missing from real
//         { name, action: "update", keys }  in desired and in real, with other settings than desired. keys as above
//         { name, action: "delete" }   in state, not in desired, and still in real
//       A thing that already matches desired has no action. Compare desired with REAL, not with state.
//
//   apply(actions, desired, state, real)
//       Return { state, real }: new maps, the three inputs stay as they were.
//       First the tool looks (refresh): the new state is a copy of real for every name that the old
//       state knew and that still exists in real. Then it does each action:
//         create or update: real and state both get a copy of the desired settings
//         delete: the name is removed from real and from state
//       Things only in real stay in real. After apply, a new plan has nothing to do.
//
//   takeLock(holder, who)
//       holder is the name of the person who holds the state lock, or null when it is free.
//       Return { ok: true, holder: who } when it is free.
//       Return { ok: false, holder } when anyone (even who) already holds it.
//
//   releaseLock(holder, who)
//       Return { ok: true, holder: null } when who is the holder.
//       Return { ok: false, holder } for anybody else, including when nobody holds it.
//
//   maskSensitive(settings, sensitiveKeys)
//       Return a COPY of settings for the screen. Each key listed in sensitiveKeys that is in
//       settings gets the value "(sensitive value)". The original object is not changed.
//
//   webModule(name, size)
//       A module is a function. Return { resources, outputs }.
//         resources: { [name + "-web"]: { size, port: 3000 }, [name + "-db"]: { size: "small" } }
//         outputs:   { url: "https://" + name + ".example.test" }
//       Throw an Error when name is not a non-empty string, or when size is not
//       "small", "medium" or "large". (That is a variable validation.)

function plan(desired, state, real) {
  // TODO
}

function apply(actions, desired, state, real) {
  // TODO
}

function takeLock(holder, who) {
  // TODO
}

function releaseLock(holder, who) {
  // TODO
}

function maskSensitive(settings, sensitiveKeys) {
  // TODO
}

function webModule(name, size) {
  // TODO
}

module.exports = { plan, apply, takeLock, releaseLock, maskSensitive, webModule };
