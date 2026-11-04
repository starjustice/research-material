const test = require("node:test");
const assert = require("node:assert");
const { planMultipart, createUploads } = require("./18-object-storage-and-presigned-uploads");

const MiB = 2 ** 20, GiB = 2 ** 30;

test("a file up to 100 MiB goes in one request", () => {
  assert.deepStrictEqual(planMultipart(3 * MiB), { mode: "single", parts: 1, partSize: 3 * MiB });
  assert.deepStrictEqual(planMultipart(100 * MiB), { mode: "single", parts: 1, partSize: 100 * MiB });
});

test("one byte above 100 MiB uses parts of 5 MiB", () => {
  assert.deepStrictEqual(planMultipart(100 * MiB + 1), { mode: "multipart", partSize: 5 * MiB, parts: 21 });
});

test("a 5 GB file", () => {
  assert.deepStrictEqual(planMultipart(5 * 10 ** 9), { mode: "multipart", partSize: 5 * MiB, parts: 954 });
});

test("a big file gets bigger parts so that there are at most 10,000", () => {
  assert.deepStrictEqual(planMultipart(100 * GiB), { mode: "multipart", partSize: 11 * MiB, parts: 9310 });
  const exactly = planMultipart(50000 * MiB);
  assert.strictEqual(exactly.partSize, 5 * MiB);
  assert.strictEqual(exactly.parts, 10000);
  const justOver = planMultipart(50000 * MiB + 1);
  assert.strictEqual(justOver.partSize, 6 * MiB);
  assert.ok(justOver.parts <= 10000);
});

test("the biggest allowed file uses 10,000 parts of 5 GiB", () => {
  assert.deepStrictEqual(planMultipart(10000 * 5 * GiB), { mode: "multipart", partSize: 5 * GiB, parts: 10000 });
});

test("a size that is not allowed throws a RangeError", () => {
  assert.throws(() => planMultipart(10000 * 5 * GiB + 1), RangeError);
  for (const bad of [0, -5, 1.5, "5", NaN, undefined]) assert.throws(() => planMultipart(bad), RangeError);
});

function setup(extra = {}) {
  const clock = { t: 1000 };
  let n = 0;
  const uploads = createUploads({ now: () => clock.t, newId: () => "id" + ++n, ...extra });
  return { uploads, clock };
}
const photo = { userId: 42, contentType: "image/jpeg", sizeBytes: 3 * MiB };

test("request picks the key itself and signs the type and the size", () => {
  const { uploads } = setup();
  const r = uploads.request({ ...photo, key: "users/7/passport.jpg" });
  assert.strictEqual(r.key, "uploads/42/id1");
  assert.strictEqual(r.expiresAt, 1000 + 5 * 60 * 1000);
  assert.deepStrictEqual(r.signedHeaders, { "content-type": "image/jpeg", "content-length": 3 * MiB });
  assert.strictEqual(uploads.request(photo).key, "uploads/42/id2");
});

test("request saves a pending row", () => {
  const { uploads } = setup();
  const { key } = uploads.request(photo);
  assert.deepStrictEqual(uploads.get(key), { key, ownerId: 42, contentType: "image/jpeg", sizeBytes: 3 * MiB, status: "pending", createdAt: 1000 });
});

test("a wrong type or a wrong size is refused and saves nothing", () => {
  const { uploads } = setup();
  assert.throws(() => uploads.request({ ...photo, contentType: "text/html" }), Error);
  assert.throws(() => uploads.request({ ...photo, sizeBytes: 5 * MiB + 1 }), Error);
  assert.throws(() => uploads.request({ ...photo, sizeBytes: 0 }), Error);
  assert.throws(() => uploads.request({ ...photo, sizeBytes: 1.5 }), Error);
  assert.strictEqual(uploads.request(photo).key, "uploads/42/id1");
});

test("confirm with the same size and type makes the row ready", () => {
  const { uploads } = setup();
  const { key } = uploads.request(photo);
  assert.strictEqual(uploads.confirm({ key, sizeBytes: 3 * MiB, contentType: "image/jpeg" }), "ready");
  assert.strictEqual(uploads.get(key).status, "ready");
});

test("confirm with another size or type rejects the row", () => {
  const { uploads } = setup();
  const a = uploads.request(photo).key, b = uploads.request(photo).key;
  assert.strictEqual(uploads.confirm({ key: a, sizeBytes: 3 * MiB + 1, contentType: "image/jpeg" }), "rejected");
  assert.strictEqual(uploads.confirm({ key: b, sizeBytes: 3 * MiB, contentType: "text/html" }), "rejected");
  assert.strictEqual(uploads.get(a).status, "rejected");
  assert.strictEqual(uploads.get(b).status, "rejected");
});

test("confirm for an unknown key, or a row that is not pending, changes nothing", () => {
  const { uploads } = setup();
  assert.strictEqual(uploads.confirm({ key: "uploads/1/zzz", sizeBytes: 1, contentType: "image/png" }), "unknown");
  const { key } = uploads.request(photo);
  uploads.confirm({ key, sizeBytes: 3 * MiB, contentType: "image/jpeg" });
  assert.strictEqual(uploads.confirm({ key, sizeBytes: 999, contentType: "text/html" }), "ignored");
  assert.strictEqual(uploads.get(key).status, "ready");
});

test("cleanup expires pending rows that waited more than pendingMaxMs", () => {
  const { uploads, clock } = setup();
  const a = uploads.request(photo).key;
  clock.t += 30 * 60 * 1000;
  const b = uploads.request(photo).key;
  const c = uploads.request(photo).key;
  uploads.confirm({ key: c, sizeBytes: 3 * MiB, contentType: "image/jpeg" });
  clock.t += 30 * 60 * 1000;                       // a is exactly 60 minutes old: not yet
  assert.deepStrictEqual(uploads.cleanup(), []);
  clock.t += 1;
  assert.deepStrictEqual(uploads.cleanup(), [a]);
  assert.strictEqual(uploads.get(a).status, "expired");
  assert.strictEqual(uploads.get(b).status, "pending");
  assert.strictEqual(uploads.get(c).status, "ready");
  assert.deepStrictEqual(uploads.cleanup(), []);
});

test("list shows only the ready rows of that user, and copies", () => {
  const { uploads } = setup();
  const a = uploads.request(photo).key;
  uploads.request(photo);
  const c = uploads.request({ ...photo, userId: 7 }).key;
  uploads.confirm({ key: a, sizeBytes: 3 * MiB, contentType: "image/jpeg" });
  uploads.confirm({ key: c, sizeBytes: 3 * MiB, contentType: "image/jpeg" });
  const mine = uploads.list(42);
  assert.deepStrictEqual(mine.map((r) => r.key), [a]);
  mine[0].status = "hacked";
  assert.strictEqual(uploads.get(a).status, "ready");
  assert.deepStrictEqual(uploads.list(99), []);
});
