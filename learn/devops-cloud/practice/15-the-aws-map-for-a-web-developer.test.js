const test = require("node:test");
const assert = require("node:assert");
const { cdnGet, checkPresigned, dbConnections, pickCompute, reviewSetup, where } = require("./15-the-aws-map-for-a-web-developer");

const same = (value) => JSON.parse(JSON.stringify(value));

// ---------- cdnGet ----------

test("cdnGet: the first request for a path goes to the origin and is stored", () => {
  const r = cdnGet({}, "/logo.png", 100, 60);
  assert.deepStrictEqual(r, { from: "origin", cache: { "/logo.png": { storedAt: 100 } } });
});

test("cdnGet: a fresh copy is served from the edge, and its time does not change", () => {
  const r = cdnGet({ "/logo.png": { storedAt: 100 } }, "/logo.png", 130, 60);
  assert.deepStrictEqual(r, { from: "edge", cache: { "/logo.png": { storedAt: 100 } } });
});

test("cdnGet: a copy exactly as old as the ttl is too old", () => {
  const r = cdnGet({ "/a": { storedAt: 100 } }, "/a", 160, 60);
  assert.strictEqual(r.from, "origin");
  assert.deepStrictEqual(r.cache, { "/a": { storedAt: 160 } });
});

test("cdnGet: a copy one second younger than the ttl is still fresh", () => {
  const r = cdnGet({ "/a": { storedAt: 100 } }, "/a", 159, 60);
  assert.strictEqual(r.from, "edge");
});

test("cdnGet: an old copy is replaced by a fresh one", () => {
  const r = cdnGet({ "/a": { storedAt: 0 } }, "/a", 500, 60);
  assert.deepStrictEqual(r, { from: "origin", cache: { "/a": { storedAt: 500 } } });
});

test("cdnGet: other paths stay in the cache", () => {
  const r = cdnGet({ "/a": { storedAt: 10 }, "/b": { storedAt: 20 } }, "/c", 30, 60);
  assert.strictEqual(r.from, "origin");
  assert.deepStrictEqual(r.cache, { "/a": { storedAt: 10 }, "/b": { storedAt: 20 }, "/c": { storedAt: 30 } });
});

test("cdnGet: each path has its own copy", () => {
  const first = cdnGet({}, "/a", 0, 60);
  const second = cdnGet(first.cache, "/b", 10, 60);
  assert.strictEqual(second.from, "origin");
  assert.strictEqual(cdnGet(second.cache, "/a", 20, 60).from, "edge");
});

test("cdnGet: a ttl of 0 never serves from the edge", () => {
  const r = cdnGet({ "/a": { storedAt: 5 } }, "/a", 5, 0);
  assert.strictEqual(r.from, "origin");
});

test("cdnGet: three requests in a row, miss then hit then miss", () => {
  const t0 = cdnGet({}, "/page", 0, 60);
  const t1 = cdnGet(t0.cache, "/page", 30, 60);
  const t2 = cdnGet(t1.cache, "/page", 70, 60);
  assert.deepStrictEqual([t0.from, t1.from, t2.from], ["origin", "edge", "origin"]);
});

test("cdnGet: does not change the cache it was given, and returns a new object", () => {
  const cache = { "/a": { storedAt: 100 } };
  const before = same(cache);
  const hit = cdnGet(cache, "/a", 110, 60);
  const miss = cdnGet(cache, "/b", 110, 60);
  assert.deepStrictEqual(cache, before);
  assert.notStrictEqual(hit.cache, cache);
  assert.notStrictEqual(miss.cache, cache);
  hit.cache["/a"].storedAt = 999;
  assert.deepStrictEqual(cache, before);
});

// ---------- checkPresigned ----------

const link = { key: "photos/cat.jpg", method: "PUT", expiresAt: 300 };

test("checkPresigned: the right key and method before the end time is allowed", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "photos/cat.jpg", method: "PUT", now: 100 }), { ok: true });
});

test("checkPresigned: exactly at the end time is still allowed", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "photos/cat.jpg", method: "PUT", now: 300 }), { ok: true });
});

test("checkPresigned: one second after the end time is expired", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "photos/cat.jpg", method: "PUT", now: 301 }), { ok: false, reason: "expired" });
});

test("checkPresigned: another key is refused", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "photos/dog.jpg", method: "PUT", now: 100 }), { ok: false, reason: "wrong key" });
});

test("checkPresigned: another method is refused", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "photos/cat.jpg", method: "GET", now: 100 }), { ok: false, reason: "wrong method" });
});

test("checkPresigned: a link for GET does not allow PUT", () => {
  const get = { key: "photos/cat.jpg", method: "GET", expiresAt: 300 };
  assert.deepStrictEqual(checkPresigned(get, { key: "photos/cat.jpg", method: "PUT", now: 1 }), { ok: false, reason: "wrong method" });
  assert.deepStrictEqual(checkPresigned(get, { key: "photos/cat.jpg", method: "GET", now: 1 }), { ok: true });
});

test("checkPresigned: expired is reported before a wrong key or a wrong method", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "other", method: "GET", now: 999 }), { ok: false, reason: "expired" });
});

test("checkPresigned: a wrong key is reported before a wrong method", () => {
  assert.deepStrictEqual(checkPresigned(link, { key: "other", method: "GET", now: 5 }), { ok: false, reason: "wrong key" });
});

// ---------- dbConnections ----------

test("dbConnections: with no proxy every call opens its own connection", () => {
  assert.strictEqual(dbConnections(3, null), 3);
  assert.strictEqual(dbConnections(500, null), 500);
});

test("dbConnections: with a proxy the calls share the pool", () => {
  assert.strictEqual(dbConnections(500, 20), 20);
});

test("dbConnections: a proxy never gives more connections than there are calls", () => {
  assert.strictEqual(dbConnections(5, 20), 5);
  assert.strictEqual(dbConnections(20, 20), 20);
});

test("dbConnections: no calls means no connections", () => {
  assert.strictEqual(dbConnections(0, null), 0);
  assert.strictEqual(dbConnections(0, 20), 0);
  assert.strictEqual(dbConnections(-4, null), 0);
  assert.strictEqual(dbConnections(-4, 20), 0);
});

// ---------- pickCompute ----------

test("pickCompute: a short job with rare traffic fits Lambda", () => {
  assert.strictEqual(pickCompute({ needsFullControl: false, maxMinutes: 1, traffic: "rare" }), "lambda");
});

test("pickCompute: a short job with spiky traffic fits Lambda", () => {
  assert.strictEqual(pickCompute({ needsFullControl: false, maxMinutes: 2, traffic: "spiky" }), "lambda");
});

test("pickCompute: steady traffic goes to Fargate, even for short runs", () => {
  assert.strictEqual(pickCompute({ needsFullControl: false, maxMinutes: 1, traffic: "steady" }), "fargate");
});

test("pickCompute: a run longer than 15 minutes goes to Fargate", () => {
  assert.strictEqual(pickCompute({ needsFullControl: false, maxMinutes: 16, traffic: "rare" }), "fargate");
  assert.strictEqual(pickCompute({ needsFullControl: false, maxMinutes: 60, traffic: "spiky" }), "fargate");
});

test("pickCompute: exactly 15 minutes still fits Lambda", () => {
  assert.strictEqual(pickCompute({ needsFullControl: false, maxMinutes: 15, traffic: "spiky" }), "lambda");
});

test("pickCompute: needing full control means EC2, whatever the other answers are", () => {
  assert.strictEqual(pickCompute({ needsFullControl: true, maxMinutes: 1, traffic: "rare" }), "ec2");
  assert.strictEqual(pickCompute({ needsFullControl: true, maxMinutes: 90, traffic: "steady" }), "ec2");
});

// ---------- reviewSetup ----------

const good = { compute: "fargate", databasePublic: false, uploadsOn: "s3", dbProxy: false, secretsInCode: false };

test("reviewSetup: a good setup has no problems", () => {
  assert.deepStrictEqual(reviewSetup(good), []);
});

test("reviewSetup: a public database is a problem", () => {
  assert.deepStrictEqual(reviewSetup({ ...good, databasePublic: true }), ["database is open to the internet"]);
});

test("reviewSetup: uploads on the server disk are a problem", () => {
  assert.deepStrictEqual(reviewSetup({ ...good, uploadsOn: "server-disk" }), ["uploads are on the server disk"]);
});

test("reviewSetup: Lambda without a proxy is a problem, Lambda with a proxy is not", () => {
  assert.deepStrictEqual(reviewSetup({ ...good, compute: "lambda", dbProxy: false }), ["lambda without a proxy may use up database connections"]);
  assert.deepStrictEqual(reviewSetup({ ...good, compute: "lambda", dbProxy: true }), []);
});

test("reviewSetup: a proxy flag does not matter when the app is not on Lambda", () => {
  assert.deepStrictEqual(reviewSetup({ ...good, compute: "ec2", dbProxy: false }), []);
  assert.deepStrictEqual(reviewSetup({ ...good, compute: "fargate", dbProxy: false }), []);
});

test("reviewSetup: secrets in the code are a problem", () => {
  assert.deepStrictEqual(reviewSetup({ ...good, secretsInCode: true }), ["secrets are in the code"]);
});

test("reviewSetup: all four problems come back in the written order", () => {
  const bad = { compute: "lambda", databasePublic: true, uploadsOn: "server-disk", dbProxy: false, secretsInCode: true };
  assert.deepStrictEqual(reviewSetup(bad), [
    "database is open to the internet",
    "uploads are on the server disk",
    "lambda without a proxy may use up database connections",
    "secrets are in the code",
  ]);
});

test("reviewSetup: does not change the setup it was given", () => {
  const bad = { compute: "lambda", databasePublic: true, uploadsOn: "server-disk", dbProxy: false, secretsInCode: true };
  const before = same(bad);
  reviewSetup(bad);
  assert.deepStrictEqual(bad, before);
});

// ---------- where ----------

test("where: pick the right AWS piece for each job", () => {
  assert.deepStrictEqual(where, {
    theNameShopExampleComMustFindYourSite: "route53",
    copiesOfImagesKeptCloseToTheUsers: "cloudfront",
    profilePhotosThatUsersUpload: "s3",
    theOrdersTablesInPostgres: "rds",
    theExpressApiInAContainerWithNoServersToPatch: "fargate",
    aThirtySecondJobThatRunsOnceAnHour: "lambda",
    sharingRequestsBetweenSeveralCopiesOfTheApi: "load-balancer",
  });
});
