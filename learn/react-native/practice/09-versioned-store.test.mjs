import test from "node:test";
import assert from "node:assert";
import { createJsonStore, createOutbox } from "./09-versioned-store.mjs";

// A fake storage like AsyncStorage: async, strings only. get gives null when the key is missing.
function makeStorage(start = {}) {
  const raw = new Map(Object.entries(start));
  return {
    raw,
    async get(key) {
      return raw.has(key) ? raw.get(key) : null;
    },
    async set(key, text) {
      assert.strictEqual(typeof text, "string", "storage keeps strings only");
      raw.set(key, text);
    },
    async remove(key) {
      raw.delete(key);
    },
  };
}

test("store: set then get gives the same value, saved as { v, data } text", async () => {
  const storage = makeStorage();
  const store = createJsonStore(storage, { version: 2 });
  await store.set("settings", { theme: "dark", size: 3 });
  assert.deepStrictEqual(await store.get("settings", null), { theme: "dark", size: 3 });
  assert.deepStrictEqual(JSON.parse(storage.raw.get("settings")), { v: 2, data: { theme: "dark", size: 3 } });
});

test("store: a missing key gives the fallback", async () => {
  const store = createJsonStore(makeStorage(), { version: 1 });
  assert.deepStrictEqual(await store.get("nothing", { empty: true }), { empty: true });
});

test("store: broken text or text without the wrapper gives the fallback", async () => {
  const storage = makeStorage({ a: "{oops", b: '"just a string"', c: JSON.stringify({ hello: 1 }) });
  const store = createJsonStore(storage, { version: 1 });
  assert.strictEqual(await store.get("a", "fallback"), "fallback");
  assert.strictEqual(await store.get("b", "fallback"), "fallback");
  assert.strictEqual(await store.get("c", "fallback"), "fallback");
});

test("store: data from a NEWER version gives the fallback", async () => {
  const storage = makeStorage({ k: JSON.stringify({ v: 5, data: { from: "the future" } }) });
  const store = createJsonStore(storage, { version: 3 });
  assert.strictEqual(await store.get("k", "fallback"), "fallback");
});

test("store: data from an OLDER version is migrated one step at a time and saved back", async () => {
  const storage = makeStorage({ user: JSON.stringify({ v: 1, data: { n: "Ana" } }) });
  const calls = [];
  const store = createJsonStore(storage, {
    version: 3,
    migrations: {
      1: (d) => (calls.push(1), { name: d.n }),
      2: (d) => (calls.push(2), { ...d, theme: "light" }),
    },
  });
  assert.deepStrictEqual(await store.get("user", null), { name: "Ana", theme: "light" });
  assert.deepStrictEqual(calls, [1, 2]);
  assert.deepStrictEqual(JSON.parse(storage.raw.get("user")), { v: 3, data: { name: "Ana", theme: "light" } });
});

test("store: data from the same version does not run any migration", async () => {
  const storage = makeStorage({ k: JSON.stringify({ v: 2, data: [1, 2] }) });
  const store = createJsonStore(storage, {
    version: 2,
    migrations: {
      1: () => assert.fail("must not run"),
      2: () => assert.fail("must not run"),
    },
  });
  assert.deepStrictEqual(await store.get("k", null), [1, 2]);
});

test("store: a missing migration step gives the fallback", async () => {
  const storage = makeStorage({ k: JSON.stringify({ v: 1, data: "old" }) });
  const store = createJsonStore(storage, { version: 3, migrations: { 2: (d) => d } });
  assert.strictEqual(await store.get("k", "fallback"), "fallback");
});

test("store: remove deletes the key", async () => {
  const storage = makeStorage();
  const store = createJsonStore(storage, { version: 1 });
  await store.set("k", 1);
  await store.remove("k");
  assert.strictEqual(storage.raw.has("k"), false);
  assert.strictEqual(await store.get("k", "gone"), "gone");
});

test("outbox: add keeps the order, flush sends all and empties the queue", async () => {
  const storage = makeStorage();
  const sentItems = [];
  const outbox = createOutbox(storage, "queue", async (item) => void sentItems.push(item));
  assert.deepStrictEqual(await outbox.flush(), { sent: 0, left: 0 });
  await outbox.add({ id: 1 });
  await outbox.add({ id: 2 });
  await outbox.add({ id: 3 });
  assert.deepStrictEqual(JSON.parse(storage.raw.get("queue")), [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.deepStrictEqual(await outbox.flush(), { sent: 3, left: 0 });
  assert.deepStrictEqual(sentItems, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.deepStrictEqual(JSON.parse(storage.raw.get("queue")), []);
});

test("outbox: flush stops at the first failure and keeps the rest", async () => {
  const storage = makeStorage();
  const sentItems = [];
  const outbox = createOutbox(storage, "queue", async (item) => {
    if (item.id === 2) throw new Error("offline");
    sentItems.push(item);
  });
  for (const id of [1, 2, 3]) await outbox.add({ id });
  assert.deepStrictEqual(await outbox.flush(), { sent: 1, left: 2 });
  assert.deepStrictEqual(sentItems, [{ id: 1 }]);
  assert.deepStrictEqual(JSON.parse(storage.raw.get("queue")), [{ id: 2 }, { id: 3 }]);
});

test("outbox: after a failure, the failed item is tried first on the next flush", async () => {
  const storage = makeStorage();
  const sentItems = [];
  let online = false;
  const outbox = createOutbox(storage, "queue", async (item) => {
    if (!online) throw new Error("offline");
    sentItems.push(item.id);
  });
  await outbox.add({ id: 1 });
  assert.deepStrictEqual(await outbox.flush(), { sent: 0, left: 1 });
  await outbox.add({ id: 2 });
  online = true;
  assert.deepStrictEqual(await outbox.flush(), { sent: 2, left: 0 });
  assert.deepStrictEqual(sentItems, [1, 2]);
});

test("outbox: the queue lives in storage, so a new outbox after a restart still sees it", async () => {
  const storage = makeStorage();
  const first = createOutbox(storage, "queue", async () => {
    throw new Error("offline");
  });
  await first.add({ id: 7 });
  const sentItems = [];
  const afterRestart = createOutbox(storage, "queue", async (item) => void sentItems.push(item));
  assert.deepStrictEqual(await afterRestart.flush(), { sent: 1, left: 0 });
  assert.deepStrictEqual(sentItems, [{ id: 7 }]);
});
