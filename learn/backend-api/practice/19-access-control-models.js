// Lesson 19: Access control models. Do the five tasks below, then run:
//   node --test learn/backend-api/practice/19-access-control-models.test.js
//
// A user is { id, role, storeId, isManager }. A token is { scopes: [...] }.
// Actions are "read", "write", "delete" and "share".

// Given to you: what each role may do at all.
const ROLES = {
  viewer: ["read"],
  editor: ["read", "write"],
  admin: ["read", "write", "delete"],
};

// Given to you: the levels on a shared item, and the lowest level each action needs.
const RANK = { viewer: 1, editor: 2, owner: 3 };
const NEED = { read: 1, write: 2, share: 3 };

// 1. WRITE IT: tokenAllows(user, token, action)
//    Both must say yes: the user's role (ROLES) AND the token's scopes.
//    Deny by default: an unknown role, a missing token, or an unknown action gives false.
//    It must never throw. (Careful: ROLES["toString"] is not a role.)
function tokenAllows(user, token, action) {
  // TODO
}

// 2. WRITE IT: aclAllows(acl, itemId, userId, action)
//    acl looks like { "doc-1": { ana: "owner", budi: "viewer" } }.
//    true only if that user has a level on that item and RANK[level] >= NEED[action].
//    An unknown item, user, level or action gives false. It must never throw.
function aclAllows(acl, itemId, userId, action) {
  // TODO
}

// 3. WRITE IT: levelOnTree(parents, grants, nodeId, userId)
//    parents looks like { "file-9": "folder-B", "folder-B": "folder-A", "folder-A": null }
//    grants  looks like { "folder-A": { ana: "editor" }, "folder-B": { budi: "viewer" } }
//    Walk from nodeId up to the top. Return the highest RANK number found on any node
//    on the way (the node itself and every parent). Return 0 if there is none.
//    If the parents contain a loop, stop when you meet a node a second time. Never run forever.
function levelOnTree(parents, grants, nodeId, userId) {
  // TODO
}

// 4. WRITE IT: canRefund(user, order)   a rule on facts (ABAC)
//    All of these must be true:
//      the user's role is "staff"
//      the user's storeId equals the order's storeId
//      the order's status is "paid"
//      the order's total is 100 or less, unless the user isManager
//    Anything else is false.
function canRefund(user, order) {
  // TODO
}

// 5. THINK: for each situation write one word: "role", "acl", "rule" or "inheritance".
const choices = {
  onlyStaffSeeTheAdminPage: "",            // the same answer for a whole kind of user
  shareOneDocWithOneFriend: "",            // a list on that one item
  refundOnlyUnder100InYourOwnStore: "",    // a decision from facts about the user and the order
  sharingAFolderReachesItsFiles: "",       // a grant flows from a parent to what is inside
};

module.exports = { ROLES, RANK, NEED, tokenAllows, aclAllows, levelOnTree, canRefund, choices };
