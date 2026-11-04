// Lesson 25: Multi-tenancy. Write the four things below, then run:
//   node --test learn/system-design/practice/25-multi-tenancy.test.js
//
// A "tenant" is one customer company that shares your system with other companies. The rule of this
// lesson: the tenant id is never optional, and it never comes from the request body.

// hashString(text) turns a tenant id into a number. It is given, you do not change it.
function hashString(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// createTenantStore() is a tiny "shared table": rows of every tenant live in one place, each row has a
// tenantId, and EVERY method needs a tenantId as its first argument.
//
//   If tenantId is undefined, null or "" every method throws an Error whose message is "tenant required".
//
//   add(tenantId, row)        saves a copy of row with a new id (1, 2, 3 ... counting over ALL tenants) and
//                             tenantId set to the argument. It ignores any tenantId inside row, because the
//                             caller must not choose the tenant. Returns a copy of the saved row.
//   get(tenantId, id)         the row with that id, but only if it belongs to this tenant. For a row of
//                             another tenant, or an id that does not exist, return undefined (the same answer,
//                             so a caller cannot tell the two cases apart). Returns a copy.
//   list(tenantId, filter)    the rows of this tenant, in id order. filter is an object such as { status: "paid" }:
//                             a row is kept when every field of filter is equal. A "tenantId" field inside
//                             filter is ignored. filter is optional.
//   update(tenantId, id, changes)   merges changes into the row and returns a copy of it, or null if the row
//                             is not found for this tenant. changes can never change id or tenantId.
//   remove(tenantId, id)      true if a row of this tenant was removed, false otherwise.
//   count(tenantId)           how many rows this tenant has.
//
// Rows that come back are copies: changing them must not change what is stored.
function createTenantStore() {
  // TODO
}

// tenantOf(request) says which tenant a request is for. request looks like:
//   { auth: { userId: "u1", tenantId: "acme" },   <- from the checked token (a JWT that was verified)
//     body: { tenantId: "globex", ... },           <- sent by the caller: NOT to be trusted
//     query: { tenantId: "globex" } }
// Return request.auth.tenantId. If there is no request.auth, or no tenantId in it, throw an Error with
// code "UNAUTHENTICATED", even when body or query has a tenantId.
function tenantOf(request) {
  // TODO
}

// createRouter({ shards, dedicated }) says which database a tenant lives in.
//   shards     a list of database names, for example ["db1", "db2", "db3"]
//   dedicated  optional object { tenantId: databaseName } for big tenants that have their own database
//
//   route(tenantId)     the dedicated database if the tenant has one. Otherwise
//                       shards[hashString(tenantId) % shards.length].
//                       Throws an Error "tenant required" for undefined, null or "".
//   move(tenantId, db)  from now on route(tenantId) gives db. Other tenants are not affected.
//   tenantsOn(db, ids)  the ids from the list ids whose route is db, in the same order.
function createRouter({ shards, dedicated = {} }) {
  // TODO
}

// createTenantLimiter(options) stops one tenant from using everything (the noisy neighbour).
// Every tenant has its own fixed window. options (all optional):
//   limit     how many calls one tenant may make in a window. Default 100.
//   windowMs  the length of a window. Default 1000.
//   limits    optional object { tenantId: number } with a different limit for some tenants.
//   now       a function that returns the time in ms. Default Date.now. Tests pass a fake clock.
//
//   allow(tenantId)   true and count the call, if this tenant has used fewer than its limit in the current
//                     window. Otherwise false (and do not count it). A window starts at the first call and
//                     lasts windowMs: when now() - start >= windowMs, a new window starts with count 0.
//                     Throws an Error "tenant required" for undefined, null or "".
//   usage(tenantId)   the calls counted in the current window (0 if the window is over or there were none).
function createTenantLimiter(options) {
  // TODO
}

module.exports = { hashString, createTenantStore, tenantOf, createRouter, createTenantLimiter };
