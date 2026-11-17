const test = require("node:test");
const assert = require("node:assert");
const { tokenAllows, aclAllows, levelOnTree, canRefund, choices } = require("./19-access-control-models");

const ana = { id: "ana", role: "editor" };
const siti = { id: "siti", role: "admin" };
const vera = { id: "vera", role: "viewer" };

// ---- Task 1: tokenAllows ----

test("tokenAllows: yes only when the role AND the scope say yes", () => {
  assert.strictEqual(tokenAllows(ana, { scopes: ["read", "write"] }, "write"), true);
  assert.strictEqual(tokenAllows(siti, { scopes: ["read", "write", "delete"] }, "delete"), true);
});

test("tokenAllows: a big role with a small token is still no", () => {
  assert.strictEqual(tokenAllows(siti, { scopes: ["read"] }, "read"), true, "first the plain yes");
  assert.strictEqual(tokenAllows(siti, { scopes: ["read"] }, "delete"), false, "admin, but the token only reads");
});

test("tokenAllows: a big token with a small role is still no", () => {
  assert.strictEqual(tokenAllows(vera, { scopes: ["read"] }, "read"), true, "first the plain yes");
  assert.strictEqual(tokenAllows(vera, { scopes: ["read", "write", "delete"] }, "write"), false, "viewer cannot write");
});

test("tokenAllows: deny by default, and never throw", () => {
  assert.strictEqual(tokenAllows(ana, { scopes: ["read"] }, "read"), true, "first the plain yes");
  assert.strictEqual(tokenAllows({ id: "x", role: "hacker" }, { scopes: ["read"] }, "read"), false);
  assert.strictEqual(tokenAllows({ id: "x", role: "toString" }, { scopes: ["read"] }, "read"), false);
  assert.strictEqual(tokenAllows({ id: "x", role: "__proto__" }, { scopes: ["read"] }, "read"), false);
  assert.strictEqual(tokenAllows(ana, undefined, "read"), false);
  assert.strictEqual(tokenAllows(ana, {}, "read"), false);
  assert.strictEqual(tokenAllows(undefined, { scopes: ["read"] }, "read"), false);
  assert.strictEqual(tokenAllows(ana, { scopes: ["read"] }, "launch-rocket"), false);
});

// ---- Task 2: aclAllows ----

const acl = {
  "doc-1": { ana: "owner", budi: "viewer", cika: "editor" },
  "doc-2": { budi: "owner" },
};

test("aclAllows: each level reaches as far as its number", () => {
  assert.strictEqual(aclAllows(acl, "doc-1", "ana", "share"), true);
  assert.strictEqual(aclAllows(acl, "doc-1", "cika", "write"), true);
  assert.strictEqual(aclAllows(acl, "doc-1", "budi", "read"), true);
});

test("aclAllows: a lower level is stopped", () => {
  assert.strictEqual(aclAllows(acl, "doc-1", "budi", "read"), true, "first the plain yes");
  assert.strictEqual(aclAllows(acl, "doc-1", "budi", "write"), false);
  assert.strictEqual(aclAllows(acl, "doc-1", "cika", "share"), false);
});

test("aclAllows: not on the list means no, and it never throws", () => {
  assert.strictEqual(aclAllows(acl, "doc-2", "budi", "share"), true, "first the plain yes");
  assert.strictEqual(aclAllows(acl, "doc-2", "ana", "read"), false, "Ana is not on doc-2");
  assert.strictEqual(aclAllows(acl, "doc-9", "ana", "read"), false, "no such item");
  assert.strictEqual(aclAllows(acl, "doc-1", "ana", "launch-rocket"), false, "no such action");
  assert.strictEqual(aclAllows(acl, "toString", "ana", "read"), false);
  assert.strictEqual(aclAllows(acl, "doc-1", "toString", "read"), false);
  assert.strictEqual(aclAllows({ "doc-1": { ana: "wizard" } }, "doc-1", "ana", "read"), false, "unknown level");
});

// ---- Task 3: levelOnTree ----

const parents = { "file-9": "folder-B", "folder-B": "folder-A", "folder-A": null, "file-3": null };
const grants = {
  "folder-A": { ana: "editor" },
  "folder-B": { budi: "viewer" },
  "file-3": { budi: "owner" },
};

test("levelOnTree: a grant on a parent reaches the file inside", () => {
  assert.strictEqual(levelOnTree(parents, grants, "file-9", "ana"), 2, "editor on folder-A, two steps up");
  assert.strictEqual(levelOnTree(parents, grants, "file-9", "budi"), 1, "viewer on folder-B, one step up");
});

test("levelOnTree: a grant on the item itself counts", () => {
  assert.strictEqual(levelOnTree(parents, grants, "file-3", "budi"), 3);
});

test("levelOnTree: the highest level on the way wins", () => {
  const g = { "folder-A": { ana: "viewer" }, "folder-B": { ana: "owner" } };
  assert.strictEqual(levelOnTree(parents, g, "file-9", "ana"), 3);
  const h = { "folder-A": { ana: "owner" }, "file-9": { ana: "viewer" } };
  assert.strictEqual(levelOnTree(parents, h, "file-9", "ana"), 3, "a lower level on the file does not take it away");
});

test("levelOnTree: no grant means 0, and a loop does not run forever", () => {
  assert.strictEqual(levelOnTree(parents, grants, "file-9", "ana"), 2, "first the plain case");
  assert.strictEqual(levelOnTree(parents, grants, "file-3", "ana"), 0, "Ana has nothing on file-3");
  assert.strictEqual(levelOnTree(parents, grants, "file-9", "zed"), 0);
  assert.strictEqual(levelOnTree(parents, grants, "nope", "ana"), 0, "a node that is not in the tree");
  const loop = { x: "y", y: "x" };
  assert.strictEqual(levelOnTree(loop, { y: { ana: "viewer" } }, "x", "ana"), 1);
  assert.strictEqual(levelOnTree(loop, {}, "x", "ana"), 0);
});

// ---- Task 4: canRefund ----

const staff = { id: "s1", role: "staff", storeId: 1, isManager: false };
const manager = { id: "s2", role: "staff", storeId: 1, isManager: true };
const order = { id: 10, storeId: 1, status: "paid", total: 80 };

test("canRefund: staff of the same store, paid order, small total", () => {
  assert.strictEqual(canRefund(staff, order), true);
});

test("canRefund: another store is no", () => {
  assert.strictEqual(canRefund(staff, order), true, "first the plain yes");
  assert.strictEqual(canRefund({ ...staff, storeId: 2 }, order), false);
});

test("canRefund: only paid orders", () => {
  assert.strictEqual(canRefund(staff, order), true, "first the plain yes");
  assert.strictEqual(canRefund(staff, { ...order, status: "refunded" }), false);
  assert.strictEqual(canRefund(staff, { ...order, status: "open" }), false);
});

test("canRefund: over 100 needs a manager, and exactly 100 is fine", () => {
  assert.strictEqual(canRefund(staff, { ...order, total: 100 }), true);
  assert.strictEqual(canRefund(staff, { ...order, total: 100.01 }), false);
  assert.strictEqual(canRefund(manager, { ...order, total: 500 }), true);
});

test("canRefund: a manager is still stopped by the other rules, and only staff may refund", () => {
  assert.strictEqual(canRefund(manager, { ...order, total: 500 }), true, "first the plain yes");
  assert.strictEqual(canRefund({ ...manager, storeId: 2 }, { ...order, total: 500 }), false);
  assert.strictEqual(canRefund({ ...manager, role: "customer" }, order), false);
  assert.strictEqual(canRefund(undefined, order), false);
  assert.strictEqual(canRefund(staff, undefined), false);
});

// ---- Task 5: choices ----

test("choices: pick the right model for each situation", () => {
  assert.deepStrictEqual(choices, {
    onlyStaffSeeTheAdminPage: "role",
    shareOneDocWithOneFriend: "acl",
    refundOnlyUnder100InYourOwnStore: "rule",
    sharingAFolderReachesItsFiles: "inheritance",
  });
});
