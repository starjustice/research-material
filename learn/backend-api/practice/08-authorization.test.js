const test = require("node:test");
const assert = require("node:assert");
const { can, statusFor, getNote, listNotesFor, codes } = require("./08-authorization");

const ana = { id: 7, role: "user" };
const budi = { id: 8, role: "user" };
const siti = { id: 1, role: "admin" };
const vera = { id: 3, role: "viewer" };

const note5 = { id: 5, ownerId: 7, isPublic: false };      // Ana, private
const note6 = { id: 6, ownerId: 8, isPublic: false };      // Budi, private
const note9 = { id: 9, ownerId: 8, isPublic: true };       // Budi, public
const db = { notes: [note5, note6, note9] };

// ---- Task 1: can ----

test("can: a role may do what its list says", () => {
  assert.strictEqual(can("user", "delete"), true);
  assert.strictEqual(can("viewer", "read"), true);
  assert.strictEqual(can("admin", "update"), true);
});

test("can: a viewer may only read", () => {
  assert.strictEqual(can("viewer", "delete"), false);
  assert.strictEqual(can("viewer", "update"), false);
  assert.strictEqual(can("viewer", "create"), false);
});

test("can: deny by default (unknown role, unknown action, bad input)", () => {
  assert.strictEqual(can("hacker", "read"), false);
  assert.strictEqual(can("user", "launch-rocket"), false);
  assert.strictEqual(can(undefined, "read"), false);
  assert.strictEqual(can("user", undefined), false);
  assert.strictEqual(can("toString", "read"), false, "toString is not a role");
  assert.strictEqual(can("__proto__", "read"), false);
});

// ---- Task 2: statusFor ----

test("statusFor: no user is 401", () => {
  assert.strictEqual(statusFor(null, "read", note5), 401);
  assert.strictEqual(statusFor(undefined, "create"), 401);
});

test("statusFor: the owner may do everything the role allows", () => {
  assert.strictEqual(statusFor(ana, "read", note5), 200);
  assert.strictEqual(statusFor(ana, "update", note5), 200);
  assert.strictEqual(statusFor(ana, "delete", note5), 200);
});

test("statusFor: another user's private note is 403", () => {
  assert.strictEqual(statusFor(ana, "read", note6), 403);
  assert.strictEqual(statusFor(ana, "delete", note6), 403);
});

test("statusFor: a public note can be read by anyone logged in, but not changed", () => {
  assert.strictEqual(statusFor(ana, "read", note9), 200);
  assert.strictEqual(statusFor(ana, "update", note9), 403);
  assert.strictEqual(statusFor(ana, "delete", note9), 403);
});

test("statusFor: an admin may touch every note", () => {
  assert.strictEqual(statusFor(siti, "read", note6), 200);
  assert.strictEqual(statusFor(siti, "delete", note6), 200);
});

test("statusFor: the role check comes first (a viewer cannot delete even their own note)", () => {
  const vera5 = { id: 100, ownerId: 3, isPublic: false };
  assert.strictEqual(statusFor(vera, "delete", vera5), 403);
  assert.strictEqual(statusFor(vera, "read", vera5), 200);
});

test("statusFor: create needs no note", () => {
  assert.strictEqual(statusFor(ana, "create"), 200);
  assert.strictEqual(statusFor(vera, "create"), 403);
});

test("statusFor: an unknown role or action is denied", () => {
  assert.strictEqual(statusFor({ id: 7, role: "hacker" }, "read", note5), 403);
  assert.strictEqual(statusFor(ana, "launch-rocket", note5), 403);
});

// ---- Task 3: getNote (the IDOR fix) ----

test("getNote: no user is 401", () => {
  assert.deepStrictEqual(getNote(null, 5, db), { status: 401 });
});

test("getNote: you get your own note", () => {
  assert.deepStrictEqual(getNote(ana, 5, db), { status: 200, note: note5 });
});

test("getNote: IDOR. Ana asks for Budi's private note and gets 404, not the note", () => {
  const result = getNote(ana, 6, db);
  assert.deepStrictEqual(result, { status: 404 }, "do not return another user's private note");
});

test("getNote: a public note of someone else can be read", () => {
  assert.strictEqual(getNote(ana, 9, db).status, 200);
});

test("getNote: an admin can read any note", () => {
  assert.strictEqual(getNote(siti, 6, db).status, 200);
});

test("getNote: a missing note and a hidden note look the same", () => {
  assert.deepStrictEqual(getNote(ana, 6, db), getNote(ana, 999, db));
});

// ---- Task 4: listNotesFor ----

const all = [note5, note6, note9, { id: 10, ownerId: 7, isPublic: true }];

test("listNotesFor: a user sees their own notes and the public ones", () => {
  assert.deepStrictEqual(listNotesFor(ana, all).map((n) => n.id).sort((a, b) => a - b), [5, 9, 10]);
});

test("listNotesFor: another user sees a different list", () => {
  assert.deepStrictEqual(listNotesFor(budi, all).map((n) => n.id).sort((a, b) => a - b), [6, 9, 10]);
});

test("listNotesFor: an admin sees every note", () => {
  assert.strictEqual(listNotesFor(siti, all).length, 4);
});

test("listNotesFor: no user gives an empty list", () => {
  assert.deepStrictEqual(listNotesFor(null, all), []);
});

test("listNotesFor: an unknown role gives an empty list", () => {
  assert.deepStrictEqual(listNotesFor({ id: 7, role: "hacker" }, all), []);
});

test("listNotesFor: it does not change the input array", () => {
  const copy = [...all];
  const result = listNotesFor(siti, all);
  assert.ok(Array.isArray(result), "return an array");
  assert.deepStrictEqual(all, copy);
  assert.notStrictEqual(result, all, "return a new array");
});

// ---- Task 5: codes ----

test("codes: the right status for each case", () => {
  assert.deepStrictEqual(codes, {
    noToken: 401,
    viewerTriesToDelete: 403,
    privateNoteOfSomeoneElseHidden: 404,
    noteDoesNotExist: 404,
  });
});
