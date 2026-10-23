const test = require("node:test");
const assert = require("node:assert");
const { makeEtag, conditionalGet, createCacheAside, cacheControlFor, answers } = require("./12-caching-in-apis");

// ---- Task 1: makeEtag ----

test("makeEtag: a quoted tag of 16 letters", () => {
  const tag = makeEtag('[{"id":1}]');
  assert.match(tag, /^"[0-9a-f]{16}"$/);
  assert.strictEqual(tag.length, 18);
});

test("makeEtag: same body same tag, different body different tag", () => {
  assert.strictEqual(makeEtag("hello"), makeEtag("hello"));
  assert.notStrictEqual(makeEtag("hello"), makeEtag("hello!"));
});

// ---- Task 2: conditionalGet ----

const body = JSON.stringify([{ id: 1, name: "Cement", price: 65000 }]);
const tag = makeEtag(body);

test("conditionalGet: no If-None-Match gives 200 with the body and the tag", () => {
  assert.deepStrictEqual(conditionalGet({}, body), { status: 200, headers: { ETag: tag }, body });
});

test("conditionalGet: a matching tag gives 304 and no body at all", () => {
  const r = conditionalGet({ "if-none-match": tag }, body);
  assert.strictEqual(r.status, 304);
  assert.deepStrictEqual(r.headers, { ETag: tag });
  assert.ok(!("body" in r), "a 304 has no body key");
});

test("conditionalGet: a different tag gives 200 with the new body", () => {
  const r = conditionalGet({ "if-none-match": '"old-version"' }, body);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body, body);
});

test("conditionalGet: the weak mark W/ is ignored", () => {
  assert.strictEqual(conditionalGet({ "if-none-match": "W/" + tag }, body).status, 304);
});

test("conditionalGet: a list of tags matches when any one matches", () => {
  const header = `"a", W/"b" , ${tag}, "d"`;
  assert.strictEqual(conditionalGet({ "if-none-match": header }, body).status, 304);
  assert.strictEqual(conditionalGet({ "if-none-match": '"a", "b"' }, body).status, 200);
});

test("conditionalGet: * always matches", () => {
  assert.strictEqual(conditionalGet({ "if-none-match": "*" }, body).status, 304);
});

test("conditionalGet: when the data changes, the old tag no longer matches", () => {
  const changed = JSON.stringify([{ id: 1, name: "Cement", price: 70000 }]);
  assert.strictEqual(conditionalGet({ "if-none-match": tag }, changed).status, 200);
});

// ---- Task 3: createCacheAside ----

function counter(value = "v") {
  const c = { calls: 0, loader: async () => { c.calls++; return value + c.calls; } };
  return c;
}

test("cache-aside: the lesson table (miss, hit, hit, expired)", async () => {
  const c = createCacheAside({ ttlMs: 60000 });
  const db = counter("row");
  const from = [];
  for (const t of [0, 1000, 59000, 61000]) from.push((await c.getOrLoad("product:1", db.loader, t)).from);
  assert.deepStrictEqual(from, ["database", "cache", "cache", "database"]);
  assert.strictEqual(db.calls, 2);
});

test("cache-aside: the value comes back, from the copy or from the database", async () => {
  const c = createCacheAside({ ttlMs: 1000 });
  const db = counter("row");
  assert.deepStrictEqual(await c.getOrLoad("k", db.loader, 0), { value: "row1", from: "database" });
  assert.deepStrictEqual(await c.getOrLoad("k", db.loader, 500), { value: "row1", from: "cache" });
});

test("cache-aside: a copy is good until exactly T + ttl, and no longer", async () => {
  const c = createCacheAside({ ttlMs: 10000 });
  const db = counter();
  await c.getOrLoad("k", db.loader, 0);
  assert.strictEqual((await c.getOrLoad("k", db.loader, 9999)).from, "cache");
  assert.strictEqual((await c.getOrLoad("k", db.loader, 10000)).from, "database");
  assert.strictEqual(db.calls, 2);
});

test("cache-aside: different keys do not share copies", async () => {
  const c = createCacheAside({ ttlMs: 1000 });
  const db = counter();
  await c.getOrLoad("a", db.loader, 0);
  assert.strictEqual((await c.getOrLoad("b", db.loader, 0)).from, "database");
});

test("cache-aside: del forces a fresh load (the price changed)", async () => {
  const c = createCacheAside({ ttlMs: 60000 });
  let price = 65000;
  const loader = async () => price;
  assert.strictEqual((await c.getOrLoad("p", loader, 0)).value, 65000);
  price = 70000;
  assert.strictEqual((await c.getOrLoad("p", loader, 1000)).value, 65000, "the old copy is still served");
  c.del("p");
  assert.strictEqual((await c.getOrLoad("p", loader, 1001)).value, 70000, "after del, the new price");
});

test("cache-aside: single flight. Three callers at the same moment, the loader runs once", async () => {
  const c = createCacheAside({ ttlMs: 60000 });
  let calls = 0;
  const slow = () => new Promise((resolve) => { calls++; setTimeout(() => resolve("row"), 20); });
  const results = await Promise.all([c.getOrLoad("k", slow, 0), c.getOrLoad("k", slow, 0), c.getOrLoad("k", slow, 0)]);
  assert.strictEqual(calls, 1, "the loader must run only once");
  assert.deepStrictEqual(results.map((r) => r.value), ["row", "row", "row"]);
});

test("cache-aside: a loader error is not saved, and the next call tries again", async () => {
  const c = createCacheAside({ ttlMs: 60000 });
  let n = 0;
  await assert.rejects(c.getOrLoad("k", async () => { n++; throw new Error("db down"); }, 0), /db down/);
  const r = await c.getOrLoad("k", async () => { n++; return "ok"; }, 1);
  assert.deepStrictEqual(r, { value: "ok", from: "database" });
  assert.strictEqual(n, 2);
});

test("cache-aside: callers that waited on a failed load all get the error", async () => {
  const c = createCacheAside({ ttlMs: 60000 });
  const bad = () => new Promise((_, reject) => setTimeout(() => reject(new Error("db down")), 10));
  const outcomes = await Promise.allSettled([c.getOrLoad("k", bad, 0), c.getOrLoad("k", bad, 0)]);
  assert.deepStrictEqual(outcomes.map((o) => o.status), ["rejected", "rejected"]);
});

// ---- Task 4: cacheControlFor ----

const parts = (v) => String(v).split(",").map((s) => s.trim().toLowerCase());
const maxAge = (v) => {
  const m = parts(v).find((p) => p.startsWith("max-age="));
  return m ? Number(m.slice(8)) : null;
};

test("cacheControlFor: a fingerprinted file is cached for a year and never checked", () => {
  const v = cacheControlFor("fingerprinted-file");
  assert.ok(parts(v).includes("public"));
  assert.ok(parts(v).includes("immutable"));
  assert.ok(maxAge(v) >= 31536000);
});

test("cacheControlFor: a public list is cached for a short time", () => {
  const v = cacheControlFor("public-list");
  assert.ok(parts(v).includes("public"));
  assert.ok(maxAge(v) > 0 && maxAge(v) <= 600, "a short max-age, 1 to 600 seconds");
  assert.ok(!parts(v).includes("immutable"));
  assert.ok(!parts(v).includes("no-store"));
});

test("cacheControlFor: my profile is private and always checked", () => {
  const v = cacheControlFor("my-profile");
  assert.ok(parts(v).includes("private"));
  assert.ok(parts(v).includes("no-cache"));
  assert.ok(!parts(v).includes("public"));
  assert.ok(!parts(v).includes("immutable"));
});

test("cacheControlFor: a bank statement is never saved, and so is an unknown kind", () => {
  assert.ok(parts(cacheControlFor("bank-statement")).includes("no-store"));
  assert.ok(parts(cacheControlFor("something-new")).includes("no-store"));
  assert.ok(parts(cacheControlFor(undefined)).includes("no-store"));
});

// ---- Task 5: answers ----

test("answers: the five short answers", () => {
  assert.deepStrictEqual(answers, {
    noCacheMeans: "save it but check with the server before each use",
    noStoreMeans: "never save it",
    statusWhenTagMatches: 304,
    headerThatCarriesTheSavedTag: "If-None-Match",
    afterAWriteDoThis: "delete the cache key",
  });
});
