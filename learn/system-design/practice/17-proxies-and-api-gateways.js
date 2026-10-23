// Lesson 17: Proxies and API gateways. Write createGateway below, then run:
//   node --test learn/system-design/practice/17-proxies-and-api-gateways.test.js

// createGateway({ routes, tokens, limit, windowMs, now }) makes a tiny gateway.
//
//   routes    an object: start of a path -> service name. For example { "/orders": "orders-service" }
//   tokens    an object: login token -> user name. For example { "t-sam": "sam" }
//   limit     how many requests one user may send in one window
//   windowMs  how long one window lasts, in milliseconds
//   now       a function that returns the time in milliseconds (the tests move the time by hand)
//
// It returns an object with one method, handle(req).
// req is { path, token, headers }. The headers part is optional. Header names are lowercase.
// handle(req) returns an answer object. It makes four checks, in this order:
//
//   1. The ticket. If req.token is missing, or is not one of the keys of tokens,
//      return { status: 401 }. A request refused here does not count for anybody.
//
//   2. The limit. Every request with a real token counts, even one that ends in 404 later.
//      A window starts at the first request of a user and lasts windowMs.
//      Once the window is over, the next request of that user starts a new window,
//      and the count starts again at 1.
//      If the count of the current window is above limit, return
//      { status: 429, retryAfter: seconds }, where seconds is the time left in that window,
//      in whole seconds, rounded up.
//
//   3. The route. A route matches when req.path is equal to its start, or begins with
//      its start followed by "/". So "/orders" matches "/orders" and "/orders/42",
//      but not "/ordersX". When several routes match, the longest start wins.
//      If no route matches, return { status: 404 }.
//
//   4. The shaping. For a match, return { status: 200, service, headers }.
//      service is the service name of the route.
//      headers is a copy of req.headers (or an empty object when there are none),
//      with "x-user-id" set to the user name of the token.
//      A caller who sends its own "x-user-id" must never get that value through.
function createGateway(options) {
  // TODO
}

module.exports = { createGateway };
