const test = require("node:test");
const assert = require("node:assert");
const { plan, apply, takeLock, releaseLock, maskSensitive, webModule } = require("./14-infrastructure-as-code");

const same = (value) => JSON.parse(JSON.stringify(value));

// ---------- plan: create, update, delete ----------

test("plan: a new thing in the code is a create", () => {
  const result = plan({ web: { size: "small" } }, {}, {});
  assert.deepStrictEqual(result, { drift: [], actions: [{ name: "web", action: "create" }] });
});

test("plan: everything matches, so there is nothing to do", () => {
  const same1 = { web: { size: "small" }, db: { size: "small" } };
  assert.deepStrictEqual(plan(same(same1), same(same1), same(same1)), { drift: [], actions: [] });
});

test("plan: empty code, empty state and empty cloud give an empty plan", () => {
  assert.deepStrictEqual(plan({}, {}, {}), { drift: [], actions: [] });
});

test("plan: a changed setting in the code is an update that names the key", () => {
  const state = { web: { size: "small" } };
  const result = plan({ web: { size: "large" } }, same(state), same(state));
  assert.deepStrictEqual(result.actions, [{ name: "web", action: "update", keys: ["size"] }]);
  assert.deepStrictEqual(result.drift, []);
});

test("plan: update lists every key that differs, sorted, including added and removed keys", () => {
  const state = { web: { size: "small", port: 80, zone: "a" } };
  const desired = { web: { size: "large", port: 80, tag: "x" } };
  const result = plan(desired, same(state), same(state));
  assert.deepStrictEqual(result.actions, [{ name: "web", action: "update", keys: ["size", "tag", "zone"] }]);
});

test("plan: a thing that left the code is a delete", () => {
  const state = { web: { size: "small" }, old: { size: "small" } };
  const result = plan({ web: { size: "small" } }, same(state), same(state));
  assert.deepStrictEqual(result.actions, [{ name: "old", action: "delete" }]);
});

test("plan: create, update and delete together are sorted by name", () => {
  const desired = { zeta: { size: "small" }, mid: { size: "large" }, alpha: { size: "small" } };
  const state = { mid: { size: "small" }, gone: { size: "small" }, alpha: { size: "small" } };
  const result = plan(desired, same(state), same(state));
  assert.deepStrictEqual(result.actions, [
    { name: "gone", action: "delete" },
    { name: "mid", action: "update", keys: ["size"] },
    { name: "zeta", action: "create" },
  ]);
});

test("plan: settings are compared with ===, so 80 and '80' are different", () => {
  const state = { web: { port: 80 } };
  const result = plan({ web: { port: "80" } }, same(state), same(state));
  assert.deepStrictEqual(result.actions, [{ name: "web", action: "update", keys: ["port"] }]);
});

test("plan: does not change the maps it was given", () => {
  const desired = { web: { size: "large" }, db: { size: "small" } };
  const state = { web: { size: "small" }, old: { size: "small" } };
  const real = { web: { size: "xlarge" }, old: { size: "small" } };
  const before = same({ desired, state, real });
  plan(desired, state, real);
  assert.deepStrictEqual(same({ desired, state, real }), before);
});

// ---------- plan: drift ----------

test("plan: a change made by hand shows as drift and the plan puts it back", () => {
  const desired = { web: { size: "large" } };
  const state = { web: { size: "large" } };
  const real = { web: { size: "xlarge" } };
  const result = plan(desired, state, real);
  assert.deepStrictEqual(result.drift, [{ name: "web", kind: "changed", keys: ["size"] }]);
  assert.deepStrictEqual(result.actions, [{ name: "web", action: "update", keys: ["size"] }]);
});

test("plan: a thing deleted by hand is drift, and the plan builds it again", () => {
  const desired = { web: { size: "small" }, db: { size: "small" } };
  const state = same(desired);
  const real = { web: { size: "small" } };
  const result = plan(desired, state, real);
  assert.deepStrictEqual(result.drift, [{ name: "db", kind: "missing" }]);
  assert.deepStrictEqual(result.actions, [{ name: "db", action: "create" }]);
});

test("plan: a hand change that already matches the code is drift but needs no action", () => {
  const desired = { web: { size: "xlarge" } };
  const state = { web: { size: "large" } };
  const real = { web: { size: "xlarge" } };
  const result = plan(desired, state, real);
  assert.deepStrictEqual(result.drift, [{ name: "web", kind: "changed", keys: ["size"] }]);
  assert.deepStrictEqual(result.actions, []);
});

test("plan: the update is decided from real, not from state", () => {
  // The state is old (small). The code and the cloud both say large. Nothing to update.
  const result = plan({ web: { size: "large" } }, { web: { size: "small" } }, { web: { size: "large" } });
  assert.deepStrictEqual(result.actions, []);
  assert.deepStrictEqual(result.drift, [{ name: "web", kind: "changed", keys: ["size"] }]);
});

test("plan: drift on a thing that left the code is still reported, and the thing is deleted", () => {
  const state = { old: { size: "small" } };
  const real = { old: { size: "large" } };
  const result = plan({}, state, real);
  assert.deepStrictEqual(result.drift, [{ name: "old", kind: "changed", keys: ["size"] }]);
  assert.deepStrictEqual(result.actions, [{ name: "old", action: "delete" }]);
});

test("plan: a thing that left the code and is already gone from the cloud is drift, with no delete", () => {
  const result = plan({}, { old: { size: "small" } }, {});
  assert.deepStrictEqual(result.drift, [{ name: "old", kind: "missing" }]);
  assert.deepStrictEqual(result.actions, []);
});

test("plan: a name in the code that the state never saw is a create, even if the cloud has that name", () => {
  const result = plan({ web: { size: "small" } }, {}, { web: { size: "small" } });
  assert.deepStrictEqual(result.actions, [{ name: "web", action: "create" }]);
  assert.deepStrictEqual(result.drift, []);
});

test("plan: things that exist only in the cloud are not the tool's business", () => {
  const result = plan({ web: { size: "small" } }, { web: { size: "small" } }, { web: { size: "small" }, manual: { size: "large" } });
  assert.deepStrictEqual(result, { drift: [], actions: [] });
});

test("plan: drift list is sorted by name and has the right kind for each", () => {
  const state = { c: { v: 1 }, a: { v: 1 }, b: { v: 1 } };
  const real = { c: { v: 2 }, b: { v: 1 } };
  const result = plan(same(state), state, real);
  assert.deepStrictEqual(result.drift, [
    { name: "a", kind: "missing" },
    { name: "c", kind: "changed", keys: ["v"] },
  ]);
});

// ---------- apply ----------

test("apply: create puts the thing in the cloud and in the state", () => {
  const desired = { web: { size: "small" } };
  const p = plan(desired, {}, {});
  const result = apply(p.actions, desired, {}, {});
  assert.deepStrictEqual(result.real, { web: { size: "small" } });
  assert.deepStrictEqual(result.state, { web: { size: "small" } });
});

test("apply: update changes the cloud and the state to the desired settings", () => {
  const desired = { web: { size: "large" } };
  const state = { web: { size: "small" } };
  const real = { web: { size: "small" } };
  const p = plan(desired, state, real);
  const result = apply(p.actions, desired, state, real);
  assert.deepStrictEqual(result.real, { web: { size: "large" } });
  assert.deepStrictEqual(result.state, { web: { size: "large" } });
});

test("apply: delete removes the thing from the cloud and from the state", () => {
  const state = { old: { size: "small" }, web: { size: "small" } };
  const real = same(state);
  const p = plan({ web: { size: "small" } }, state, real);
  const result = apply(p.actions, { web: { size: "small" } }, state, real);
  assert.deepStrictEqual(result.real, { web: { size: "small" } });
  assert.deepStrictEqual(result.state, { web: { size: "small" } });
});

test("apply: the three maps that went in are not changed", () => {
  const desired = { web: { size: "large" }, db: { size: "small" } };
  const state = { web: { size: "small" }, old: { size: "small" } };
  const real = { web: { size: "small" }, old: { size: "small" } };
  const before = same({ desired, state, real });
  apply(plan(desired, state, real).actions, desired, state, real);
  assert.deepStrictEqual(same({ desired, state, real }), before);
});

test("apply: the new maps do not share objects with the old ones", () => {
  const desired = { web: { size: "small" } };
  const result = apply([{ name: "web", action: "create" }], desired, {}, {});
  result.real.web.size = "changed";
  result.state.web.size = "changed";
  assert.strictEqual(desired.web.size, "small");
});

test("apply: the new cloud map does not share objects with the old one", () => {
  const real = { manual: { size: "large" } };
  const result = apply([], {}, {}, real);
  result.real.manual.size = "changed";
  assert.strictEqual(real.manual.size, "large");
});

test("apply: state is refreshed from the cloud for things the old state knew", () => {
  // The cloud already has the size the code wants. No action, but the state must catch up.
  const desired = { web: { size: "xlarge" } };
  const state = { web: { size: "large" } };
  const real = { web: { size: "xlarge" } };
  const result = apply(plan(desired, state, real).actions, desired, state, real);
  assert.deepStrictEqual(result.state, { web: { size: "xlarge" } });
});

test("apply: a thing that was deleted by hand and left the code is dropped from the state", () => {
  const result = apply([], {}, { old: { size: "small" } }, {});
  assert.deepStrictEqual(result.state, {});
  assert.deepStrictEqual(result.real, {});
});

test("apply: things that exist only in the cloud stay there and stay out of the state", () => {
  const desired = { web: { size: "small" } };
  const real = { manual: { size: "large" } };
  const result = apply(plan(desired, {}, real).actions, desired, {}, real);
  assert.deepStrictEqual(result.real, { manual: { size: "large" }, web: { size: "small" } });
  assert.deepStrictEqual(result.state, { web: { size: "small" } });
});

test("apply: after apply, a new plan has nothing to do (running it again changes nothing)", () => {
  const desired = { web: { size: "large" }, db: { size: "small" }, cache: { size: "small" } };
  const state = { web: { size: "small" }, old: { size: "small" } };
  const real = { web: { size: "xlarge" }, old: { size: "small" }, manual: { size: "large" } };
  const p = plan(desired, state, real);
  const after = apply(p.actions, desired, state, real);
  assert.deepStrictEqual(plan(desired, after.state, after.real), { drift: [], actions: [] });
});

test("apply: a thing deleted by hand is built again", () => {
  const desired = { web: { size: "small" }, db: { size: "small" } };
  const state = same(desired);
  const real = { web: { size: "small" } };
  const after = apply(plan(desired, state, real).actions, desired, state, real);
  assert.deepStrictEqual(after.real, desired);
  assert.deepStrictEqual(after.state, desired);
});

// ---------- locks ----------

test("takeLock: a free lock is given to the person who asks", () => {
  assert.deepStrictEqual(takeLock(null, "ana"), { ok: true, holder: "ana" });
});

test("takeLock: a held lock stays with its holder", () => {
  assert.deepStrictEqual(takeLock("ana", "ben"), { ok: false, holder: "ana" });
});

test("takeLock: even the holder cannot take it twice", () => {
  assert.deepStrictEqual(takeLock("ana", "ana"), { ok: false, holder: "ana" });
});

test("releaseLock: the holder frees it", () => {
  assert.deepStrictEqual(releaseLock("ana", "ana"), { ok: true, holder: null });
});

test("releaseLock: somebody else cannot free it", () => {
  assert.deepStrictEqual(releaseLock("ana", "ben"), { ok: false, holder: "ana" });
});

test("releaseLock: a lock that nobody holds cannot be released", () => {
  assert.deepStrictEqual(releaseLock(null, "ben"), { ok: false, holder: null });
});

test("releaseLock: nobody cannot release a free lock", () => {
  assert.deepStrictEqual(releaseLock(null, null), { ok: false, holder: null });
});

test("locks: Ben waits for Ana, then gets his turn", () => {
  let holder = null;
  let r = takeLock(holder, "ana");
  holder = r.holder;
  assert.strictEqual(takeLock(holder, "ben").ok, false);
  holder = releaseLock(holder, "ana").holder;
  r = takeLock(holder, "ben");
  assert.deepStrictEqual(r, { ok: true, holder: "ben" });
});

// ---------- maskSensitive ----------

test("maskSensitive: a listed key shows (sensitive value)", () => {
  const out = maskSensitive({ user: "app", password: "not-a-real-secret" }, ["password"]);
  assert.deepStrictEqual(out, { user: "app", password: "(sensitive value)" });
});

test("maskSensitive: the original still holds the real value (the state keeps it)", () => {
  const original = { user: "app", password: "not-a-real-secret" };
  maskSensitive(original, ["password"]);
  assert.strictEqual(original.password, "not-a-real-secret");
});

test("maskSensitive: a listed key that is not in the settings is not added", () => {
  const out = maskSensitive({ user: "app" }, ["password"]);
  assert.deepStrictEqual(out, { user: "app" });
  assert.ok(!("password" in out));
});

test("maskSensitive: nothing listed means nothing hidden, and the result is a copy", () => {
  const original = { user: "app" };
  const out = maskSensitive(original, []);
  assert.deepStrictEqual(out, original);
  assert.notStrictEqual(out, original);
});

test("maskSensitive: more than one key can be hidden", () => {
  const out = maskSensitive({ a: 1, b: 2, c: 3 }, ["a", "c"]);
  assert.deepStrictEqual(out, { a: "(sensitive value)", b: 2, c: "(sensitive value)" });
});

// ---------- webModule ----------

test("webModule: returns the resources and an output", () => {
  assert.deepStrictEqual(webModule("staging", "small"), {
    resources: { "staging-web": { size: "small", port: 3000 }, "staging-db": { size: "small" } },
    outputs: { url: "https://staging.example.test" },
  });
});

test("webModule: the size input goes to the web thing only, the database stays small", () => {
  const m = webModule("prod", "large");
  assert.strictEqual(m.resources["prod-web"].size, "large");
  assert.strictEqual(m.resources["prod-db"].size, "small");
  assert.strictEqual(m.outputs.url, "https://prod.example.test");
});

test("webModule: two calls with different names do not clash", () => {
  const a = webModule("staging", "small");
  const b = webModule("prod", "large");
  const all = { ...a.resources, ...b.resources };
  assert.strictEqual(Object.keys(all).length, 4);
});

test("webModule: every call gives new objects", () => {
  const a = webModule("x", "small");
  const b = webModule("x", "small");
  a.resources["x-web"].size = "changed";
  assert.strictEqual(b.resources["x-web"].size, "small");
});

test("webModule: a bad size is refused with a clear message", () => {
  assert.throws(() => webModule("prod", "huge"), /size must be small, medium or large/);
  assert.throws(() => webModule("prod"), /size must be small, medium or large/);
});

test("webModule: all three sizes work", () => {
  for (const size of ["small", "medium", "large"]) {
    assert.strictEqual(webModule("x", size).resources["x-web"].size, size);
  }
});

test("webModule: a missing or empty name is refused", () => {
  assert.throws(() => webModule("", "small"), /name is required/);
  assert.throws(() => webModule(undefined, "small"), /name is required/);
  assert.throws(() => webModule(42, "small"), /name is required/);
});

// ---------- the pieces together ----------

test("together: code, plan, apply, a hand change, then plan shows the drift", () => {
  const stack = webModule("prod", "large");
  const desired = stack.resources;
  let state = {};
  let real = {};
  // first run: everything is new
  let p = plan(desired, state, real);
  assert.deepStrictEqual(p.actions.map((a) => a.action), ["create", "create"]);
  ({ state, real } = apply(p.actions, desired, state, real));
  assert.deepStrictEqual(plan(desired, state, real), { drift: [], actions: [] });
  // someone clicks in the console
  real = { ...real, "prod-web": { size: "large", port: 8080 } };
  p = plan(desired, state, real);
  assert.deepStrictEqual(p.drift, [{ name: "prod-web", kind: "changed", keys: ["port"] }]);
  assert.deepStrictEqual(p.actions, [{ name: "prod-web", action: "update", keys: ["port"] }]);
});
