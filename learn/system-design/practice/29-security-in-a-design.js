// Lesson 29: Security in a design. Write the two functions below, then run:
//   node --test learn/system-design/practice/29-security-in-a-design.test.js
//
// There are two checks, and they are different:
//   requireLogin  = authentication: who are you?
//   createGetOrder = authorization: what may you do with THIS order?
//
// The handlers are Express style: (req, res) or (req, res, next).
//   res.status(code) returns res, and res.json(body) sends the body, so you write
//   res.status(404).json({ error: "not found" }).
//
// requireLogin(verifyToken) returns a middleware (req, res, next).
//   - It reads the header req.headers.authorization. A good header looks like "Bearer abc123".
//   - It calls verifyToken("abc123"). That returns the user, for example { id: "ann", role: "customer" },
//     or it throws when the token is bad.
//   - A good token: set req.user to the user and call next().
//   - No header, a header without "Bearer ", an empty token, or a bad token:
//     answer res.status(401).json({ error: "login required" }) and do NOT call next().
//
// createGetOrder(orders) returns a handler (req, res).
//   orders is an object like { 42: { id: 42, ownerId: "ann", total: 30 } }.
//   The id to look up is req.params.id (a string). The caller is req.user.
//   - No req.user: 401 with { error: "login required" }.
//   - The order does not exist: 404 with { error: "not found" }.
//   - The caller owns the order (order.ownerId equals req.user.id): 200 with the order.
//   - The caller has the role "support": 200 with the order, even if it is not theirs.
//   - Anyone else: 404 with { error: "not found" }, the SAME answer as a missing order,
//     so a stranger cannot learn which ids exist.
//   - Never use req.body or req.query to decide who the caller is. Only req.user counts.
function requireLogin(verifyToken) {
  // TODO
}

function createGetOrder(orders) {
  // TODO
}

module.exports = { requireLogin, createGetOrder };
