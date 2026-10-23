// Lesson 08: Authorization. Do the five tasks below, then run:
//   node --test learn/backend-api/practice/08-authorization.test.js
//
// A user is null (not logged in) or { id, role }. A note is { id, ownerId, isPublic }.
// Actions are "read", "create", "update" and "delete".

// Given to you: what each role may do at all (the role check).
const PERMISSIONS = {
  admin: ["read", "create", "update", "delete"],
  user: ["read", "create", "update", "delete"],
  viewer: ["read"],
};

// 1. WRITE IT: can(role, action)
//    true only if the role is in PERMISSIONS and its list has the action.
//    Deny by default: an unknown role, an unknown action, or undefined gives false.
//    It must never throw. (Careful: PERMISSIONS["toString"] is not a role.)
function can(role, action) {
  // TODO
}

// 2. WRITE IT: statusFor(user, action, note)  returns 200, 401 or 403. Check in this order:
//      a) no user                                  -> 401
//      b) the role may not do the action           -> 403   (use can)
//      c) action is "create" (there is no note yet) -> 200
//      d) role is "admin"                           -> 200
//      e) action is "read" and note.isPublic        -> 200
//      f) note.ownerId equals user.id               -> 200
//      g) anything else                             -> 403   (deny by default)
function statusFor(user, action, note) {
  // TODO
}

// 3. FIX THE BUG: getNote has the IDOR bug from the lesson.
//    Any logged-in user can read any note. Use statusFor to fix it.
//    Wanted result: no user -> { status: 401 }. No such note -> { status: 404 }.
//    A note the user may not read -> { status: 404 } too (hide that it exists).
//    Otherwise { status: 200, note }.
function getNote(user, id, db) {
  if (!user) return { status: 401 };
  const note = db.notes.find((n) => n.id === id);
  if (!note) return { status: 404 };
  return { status: 200, note };
}

// 4. WRITE IT: listNotesFor(user, notes)  the row filter for a list
//    no user, or a role that may not read -> []
//    admin                                -> every note
//    anyone else                          -> only their own notes and the public notes
//    Return a new array. Do not change the input.
function listNotesFor(user, notes) {
  // TODO
}

// 5. THINK: write the status code for each case (a number: 401, 403 or 404).
const codes = {
  noToken: 0,                           // the request has no token at all
  viewerTriesToDelete: 0,               // a good token, role viewer, action delete
  privateNoteOfSomeoneElseHidden: 0,    // getNote on a private note of another user
  noteDoesNotExist: 0,                  // getNote with an id that is not in the database
};

module.exports = { PERMISSIONS, can, statusFor, getNote, listNotesFor, codes };
