// Lesson 02: REST API design. Write the three functions below, then run:
//   node --test learn/backend-api/practice/02-rest-api-design.test.js
//
// Part 1 is what the server does for GET /orders?after=26&limit=5.
// Part 2 turns an action into the method, path and success status from the lesson's table.
// Part 3 is the versioning rule: may this change ship without a new version?
//
// ---- Part 1: cursorPage(items, { after, limit = 20, maxLimit = 100 } = {}) ----
//
//   items is an array of objects with a number id, already sorted NEWEST FIRST,
//   for example [{ id: 30 }, { id: 29 }, ..., { id: 1 }].
//   It returns { data, next_cursor, has_more }.
//
//   1. after is the id of the last item the app has seen. Return only items with id < after.
//      If after is undefined or null, start from the top of the list.
//      The item with id === after may be gone (deleted). That is fine: still return id < after.
//   2. Return at most limit items, in the same order.
//   3. If limit is above maxLimit, use maxLimit instead. Never send more than maxLimit.
//      If limit is below 1, throw a RangeError. (A real server would answer 400.)
//   4. has_more is true when there are more items after the last one in data.
//   5. next_cursor is the id of the last item in data when has_more is true. Otherwise null.
//   6. Do not change the items array.
//
// ---- Part 2: routeFor({ action, resource, id, parent })  ->  { method, path, status } ----
//
//   resource is a plural noun like "orders". parent is optional, like { resource: "stores", id: 7 }.
//
//     action      method   path                     status
//     "list"      GET      /orders                  200
//     "create"    POST     /orders                  201
//     "read"      GET      /orders/41               200
//     "replace"   PUT      /orders/41               200
//     "update"    PATCH    /orders/41               200
//     "delete"    DELETE   /orders/41               204
//     any other   POST     /orders/41/<action>      200   (for example "cancel" or "pay")
//
//   1. With a parent, "list" and "create" are nested one level: GET /stores/7/orders, POST /stores/7/orders.
//      Every other action ignores the parent: one order has its own short path, /orders/41.
//   2. Throw an Error if resource does not end in "s" (use plural nouns, "order" is wrong).
//   3. Throw an Error if an action other than "list" and "create" has no id (undefined or null).
//
// ---- Part 3: isBreakingChange(oldFields, newFields)  ->  true or false ----
//
//   Each argument is an array of field names in a response, like ["id", "status", "total"].
//   1. Adding a field is safe: old apps ignore fields they do not know.
//   2. Removing or renaming a field breaks old apps. Renaming is a remove plus an add.
//   So it is breaking when any old field is missing from the new fields. Order does not matter.

function cursorPage(items, { after, limit = 20, maxLimit = 100 } = {}) {
  // TODO
}

function routeFor({ action, resource, id, parent }) {
  // TODO
}

function isBreakingChange(oldFields, newFields) {
  // TODO
}

module.exports = { cursorPage, routeFor, isBreakingChange };
