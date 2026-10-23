const test = require("node:test");
const assert = require("node:assert");
const { parseRequest, pickStatus, family } = require("./01-http-basics");

// ---- Part 1: read the text of a request ----

const getText =
  "GET /products/41 HTTP/1.1\r\n" +
  "Host: shop.example.com\r\n" +
  "Accept: application/json\r\n" +
  "Authorization: Bearer tok_ana\r\n" +
  "\r\n";

test("reads the method and the path from the request line", () => {
  const r = parseRequest(getText);
  assert.strictEqual(r.method, "GET");
  assert.strictEqual(r.path, "/products/41");
});

test("header names become lowercase keys, values are trimmed", () => {
  const r = parseRequest(getText);
  assert.deepStrictEqual(r.headers, {
    host: "shop.example.com",
    accept: "application/json",
    authorization: "Bearer tok_ana",
  });
});

test("a GET with nothing after the empty line has body null and query {}", () => {
  const r = parseRequest(getText);
  assert.strictEqual(r.body, null);
  assert.deepStrictEqual(r.query, {});
});

test("the part after ? becomes the query object, and the path stops at ?", () => {
  const r = parseRequest("GET /products?shop=7&page=2 HTTP/1.1\r\nHost: shop.example.com\r\n\r\n");
  assert.strictEqual(r.path, "/products");
  assert.deepStrictEqual(r.query, { shop: "7", page: "2" });
});

test("a header is split at the first colon only", () => {
  const r = parseRequest("GET / HTTP/1.1\r\nHost: localhost:3000\r\n\r\n");
  assert.strictEqual(r.headers.host, "localhost:3000");
});

test("a JSON body is parsed when content-type is application/json", () => {
  const r = parseRequest(
    "POST /products HTTP/1.1\r\n" +
    "Host: shop.example.com\r\n" +
    "Content-Type: application/json; charset=utf-8\r\n" +
    "\r\n" +
    '{"name":"Rice 5 kg","price":65000}'
  );
  assert.strictEqual(r.method, "POST");
  assert.deepStrictEqual(r.body, { name: "Rice 5 kg", price: 65000 });
});

test("without application/json the body stays plain text", () => {
  const r = parseRequest(
    "POST /products HTTP/1.1\r\nHost: shop.example.com\r\nContent-Type: text/plain;charset=UTF-8\r\n\r\n" +
    '{"name":"Rice 5 kg"}'
  );
  assert.strictEqual(r.body, '{"name":"Rice 5 kg"}');
});

test("plain \\n line ends work too", () => {
  const r = parseRequest('PATCH /products/41 HTTP/1.1\nContent-Type: application/json\n\n{"price":60000}');
  assert.strictEqual(r.method, "PATCH");
  assert.strictEqual(r.path, "/products/41");
  assert.deepStrictEqual(r.body, { price: 60000 });
});

test("no empty line means no body", () => {
  const r = parseRequest("DELETE /products/41 HTTP/1.1\r\nHost: shop.example.com");
  assert.strictEqual(r.method, "DELETE");
  assert.deepStrictEqual(r.headers, { host: "shop.example.com" });
  assert.strictEqual(r.body, null);
});

// ---- Part 2: pick the status code ----

test("nothing special is 200", () => {
  assert.strictEqual(pickStatus({}), 200);
  assert.strictEqual(pickStatus(), 200);
});

test("created is 201 and empty is 204", () => {
  assert.strictEqual(pickStatus({ created: true }), 201);
  assert.strictEqual(pickStatus({ empty: true }), 204);
});

test("no token is 401, a known user without the right is 403", () => {
  assert.strictEqual(pickStatus({ loggedIn: false }), 401);
  assert.strictEqual(pickStatus({ allowed: false }), 403);
});

test("401 comes before 403: if I do not know you, I cannot check your rights", () => {
  assert.strictEqual(pickStatus({ loggedIn: false, allowed: false }), 401);
});

test("404, 400, 422 and 409 for the request's own problems", () => {
  assert.strictEqual(pickStatus({ found: false }), 404);
  assert.strictEqual(pickStatus({ readable: false }), 400);
  assert.strictEqual(pickStatus({ valid: false }), 422);
  assert.strictEqual(pickStatus({ conflict: true }), 409);
});

test("unreadable is 400 before it is 422", () => {
  assert.strictEqual(pickStatus({ readable: false, valid: false }), 400);
});

test("a crash is 500 whatever else is true, and too many is 429 before auth", () => {
  assert.strictEqual(pickStatus({ crashed: true, loggedIn: false, created: true }), 500);
  assert.strictEqual(pickStatus({ tooMany: true, loggedIn: false }), 429);
});

test("a problem wins over created", () => {
  assert.strictEqual(pickStatus({ conflict: true, created: true }), 409);
  assert.strictEqual(pickStatus({ allowed: false, created: true }), 403);
});

// ---- Part 3: the five families ----

test("each family gets its name", () => {
  assert.strictEqual(family(101), "info");
  assert.strictEqual(family(200), "worked");
  assert.strictEqual(family(204), "worked");
  assert.strictEqual(family(304), "look elsewhere");
  assert.strictEqual(family(401), "your request is wrong");
  assert.strictEqual(family(429), "your request is wrong");
  assert.strictEqual(family(503), "server broke");
});

test("the edges of each family", () => {
  assert.strictEqual(family(100), "info");
  assert.strictEqual(family(299), "worked");
  assert.strictEqual(family(300), "look elsewhere");
  assert.strictEqual(family(499), "your request is wrong");
  assert.strictEqual(family(599), "server broke");
});

test("anything that is not a whole number from 100 to 599 is unknown", () => {
  for (const code of [99, 600, 404.5, "404", undefined]) {
    assert.strictEqual(family(code), "unknown", "code " + code);
  }
});
