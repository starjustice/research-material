const test = require("node:test");
const assert = require("node:assert");
const { hashString, createTenantStore, tenantOf, createRouter, createTenantLimiter } = require("./25-multi-tenancy");

// ---------- createTenantStore ----------

function seeded() {
  const store = createTenantStore();
  store.add("acme", { item: "pen", status: "paid" });        // id 1
  store.add("acme", { item: "ink", status: "new" });         // id 2
  store.add("globex", { item: "book", status: "paid" });     // id 3
  return store;
}

test("store: add gives ids over all tenants and sets the tenantId", () => {
  const store = createTenantStore();
  assert.deepStrictEqual(store.add("acme", { item: "pen" }), { item: "pen", id: 1, tenantId: "acme" });
  assert.deepStrictEqual(store.add("globex", { item: "book" }), { item: "book", id: 2, tenantId: "globex" });
});

test("store: add ignores a tenantId inside the row (the caller does not choose the tenant)", () => {
  const store = createTenantStore();
  const saved = store.add("acme", { item: "pen", tenantId: "globex" });
  assert.strictEqual(saved.tenantId, "acme");
  assert.deepStrictEqual(store.list("globex"), []);
  assert.strictEqual(store.list("acme").length, 1);
});

test("store: every method needs a tenant", () => {
  const store = seeded();
  for (const bad of [undefined, null, ""]) {
    assert.throws(() => store.add(bad, { item: "x" }), /tenant required/);
    assert.throws(() => store.get(bad, 1), /tenant required/);
    assert.throws(() => store.list(bad), /tenant required/);
    assert.throws(() => store.update(bad, 1, {}), /tenant required/);
    assert.throws(() => store.remove(bad, 1), /tenant required/);
    assert.throws(() => store.count(bad), /tenant required/);
  }
});

test("store: get returns the row for its own tenant", () => {
  const store = seeded();
  assert.deepStrictEqual(store.get("acme", 1), { item: "pen", status: "paid", id: 1, tenantId: "acme" });
});

test("store: get of another tenant's row is undefined, the same as a missing row", () => {
  const store = seeded();
  assert.strictEqual(store.get("globex", 1), undefined);
  assert.strictEqual(store.get("acme", 3), undefined);
  assert.strictEqual(store.get("acme", 99), undefined);
});

test("store: list shows only the tenant's rows, in id order", () => {
  const store = seeded();
  assert.deepStrictEqual(store.list("acme").map((r) => r.id), [1, 2]);
  assert.deepStrictEqual(store.list("globex").map((r) => r.id), [3]);
  assert.deepStrictEqual(store.list("nobody"), []);
});

test("store: list filters by fields, and a tenantId inside the filter changes nothing", () => {
  const store = seeded();
  assert.deepStrictEqual(store.list("acme", { status: "paid" }).map((r) => r.id), [1]);
  assert.deepStrictEqual(store.list("acme", { status: "paid", item: "ink" }), []);
  assert.deepStrictEqual(store.list("acme", { tenantId: "globex" }).map((r) => r.id), [1, 2]);
});

test("store: update merges changes, and cannot change id or tenantId", () => {
  const store = seeded();
  const updated = store.update("acme", 2, { status: "paid", id: 50, tenantId: "globex" });
  assert.deepStrictEqual(updated, { item: "ink", status: "paid", id: 2, tenantId: "acme" });
  assert.deepStrictEqual(store.get("acme", 2), updated);
  assert.strictEqual(store.get("globex", 2), undefined);
});

test("store: update of another tenant's row does nothing and returns null", () => {
  const store = seeded();
  assert.strictEqual(store.update("globex", 1, { status: "stolen" }), null);
  assert.strictEqual(store.get("acme", 1).status, "paid");
  assert.strictEqual(store.update("acme", 99, {}), null);
});

test("store: remove works for the owner and not for another tenant", () => {
  const store = seeded();
  assert.strictEqual(store.remove("globex", 1), false);
  assert.strictEqual(store.count("acme"), 2);
  assert.strictEqual(store.remove("acme", 1), true);
  assert.strictEqual(store.remove("acme", 1), false);
  assert.strictEqual(store.count("acme"), 1);
  assert.strictEqual(store.count("globex"), 1);
});

test("store: returned rows are copies", () => {
  const store = seeded();
  const row = store.get("acme", 1);
  row.item = "changed";
  store.list("acme")[0].item = "changed too";
  assert.strictEqual(store.get("acme", 1).item, "pen");
});

// ---------- tenantOf ----------

test("tenantOf: reads the tenant from the checked token", () => {
  assert.strictEqual(tenantOf({ auth: { userId: "u1", tenantId: "acme" } }), "acme");
});

test("tenantOf: ignores a tenantId in the body or the query", () => {
  const request = { auth: { userId: "u1", tenantId: "acme" }, body: { tenantId: "globex" }, query: { tenantId: "globex" } };
  assert.strictEqual(tenantOf(request), "acme");
});

test("tenantOf: without a checked tenant it throws UNAUTHENTICATED, even if the body names one", () => {
  for (const request of [{ body: { tenantId: "globex" } }, { auth: { userId: "u1" }, query: { tenantId: "globex" } }, { auth: null }, {}]) {
    assert.throws(() => tenantOf(request), (err) => err.code === "UNAUTHENTICATED");
  }
});

// ---------- createRouter ----------

const tenants = Array.from({ length: 300 }, (_, i) => "tenant-" + (i + 1));

test("router: a tenant always goes to the same shard, picked from the hash", () => {
  const router = createRouter({ shards: ["db1", "db2", "db3"] });
  assert.strictEqual(router.route("acme"), ["db1", "db2", "db3"][hashString("acme") % 3]);
  assert.strictEqual(router.route("acme"), router.route("acme"));
  assert.ok(["db1", "db2", "db3"].includes(router.route("globex")));
});

test("router: 300 tenants are spread over the shards", () => {
  const router = createRouter({ shards: ["db1", "db2", "db3"] });
  const counts = { db1: 0, db2: 0, db3: 0 };
  for (const t of tenants) counts[router.route(t)]++;
  for (const db of Object.keys(counts)) assert.ok(counts[db] > 80 && counts[db] < 120, db + " has " + counts[db]);
});

test("router: a dedicated database wins over the hash", () => {
  const router = createRouter({ shards: ["db1", "db2", "db3"], dedicated: { bigcorp: "db-bigcorp" } });
  assert.strictEqual(router.route("bigcorp"), "db-bigcorp");
});

test("router: move sends one tenant to its own database and leaves the others alone", () => {
  const router = createRouter({ shards: ["db1", "db2", "db3"] });
  const before = tenants.map((t) => router.route(t));
  router.move("tenant-7", "db-big");
  assert.strictEqual(router.route("tenant-7"), "db-big");
  const after = tenants.map((t) => router.route(t));
  const changed = tenants.filter((t, i) => before[i] !== after[i]);
  assert.deepStrictEqual(changed, ["tenant-7"]);
});

test("router: tenantsOn lists the tenants of a database, in order", () => {
  const router = createRouter({ shards: ["db1", "db2"] });
  const ids = ["a", "b", "c", "d", "e", "f"];
  const onDb1 = router.tenantsOn("db1", ids);
  const onDb2 = router.tenantsOn("db2", ids);
  assert.strictEqual(onDb1.length + onDb2.length, ids.length);
  assert.deepStrictEqual([...onDb1, ...onDb2].sort(), ids);
  for (const t of onDb1) assert.strictEqual(router.route(t), "db1");
  assert.deepStrictEqual(onDb1, ids.filter((t) => onDb1.includes(t)));
  router.move(ids[0], "db-own");
  assert.ok(!router.tenantsOn("db1", ids).includes(ids[0]) && !router.tenantsOn("db2", ids).includes(ids[0]));
  assert.deepStrictEqual(router.tenantsOn("db-own", ids), [ids[0]]);
});

test("router: a missing tenant is an error", () => {
  const router = createRouter({ shards: ["db1"] });
  for (const bad of [undefined, null, ""]) assert.throws(() => router.route(bad), /tenant required/);
});

// ---------- createTenantLimiter ----------

function limiter(options = {}) {
  const clock = { t: 0 };
  return { clock, limiter: createTenantLimiter({ limit: 3, windowMs: 1000, now: () => clock.t, ...options }) };
}

test("limiter: a tenant gets its limit and then no more in the window", () => {
  const { limiter: l } = limiter();
  assert.deepStrictEqual([1, 2, 3, 4, 5].map(() => l.allow("acme")), [true, true, true, false, false]);
  assert.strictEqual(l.usage("acme"), 3);
});

test("limiter: a noisy tenant does not use up another tenant's calls", () => {
  const { limiter: l } = limiter();
  for (let i = 0; i < 50; i++) l.allow("noisy");
  assert.strictEqual(l.allow("quiet"), true);
  assert.strictEqual(l.usage("quiet"), 1);
  assert.strictEqual(l.usage("noisy"), 3);
});

test("limiter: a new window starts after windowMs", () => {
  const { clock, limiter: l } = limiter();
  for (let i = 0; i < 3; i++) l.allow("acme");
  clock.t = 999;
  assert.strictEqual(l.allow("acme"), false);
  clock.t = 1000;
  assert.strictEqual(l.usage("acme"), 0);
  assert.strictEqual(l.allow("acme"), true);
  assert.strictEqual(l.usage("acme"), 1);
});

test("limiter: a tenant can have its own limit", () => {
  const { limiter: l } = limiter({ limits: { bigcorp: 5, tiny: 1 } });
  assert.strictEqual([1, 2, 3, 4, 5, 6].filter(() => l.allow("bigcorp")).length, 5);
  assert.strictEqual([1, 2, 3].filter(() => l.allow("tiny")).length, 1);
  assert.strictEqual([1, 2, 3, 4].filter(() => l.allow("other")).length, 3);
});

test("limiter: the defaults are 100 calls per 1000 ms", () => {
  const clock = { t: 0 };
  const l = createTenantLimiter({ now: () => clock.t });
  assert.strictEqual(Array.from({ length: 150 }).filter(() => l.allow("acme")).length, 100);
  clock.t = 1000;
  assert.strictEqual(l.allow("acme"), true);
});

test("limiter: a missing tenant is an error", () => {
  const { limiter: l } = limiter();
  for (const bad of [undefined, null, ""]) assert.throws(() => l.allow(bad), /tenant required/);
});
