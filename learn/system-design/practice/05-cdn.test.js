const test = require("node:test");
const assert = require("node:assert");
const { howLong, createEdge } = require("./05-cdn");

test("howLong reads the time from max-age", () => {
  assert.strictEqual(howLong("public, max-age=60"), 60);
  assert.strictEqual(howLong("max-age=31536000, immutable"), 31536000);
  assert.strictEqual(howLong("  PUBLIC ,  Max-Age=5 "), 5);
});

test("howLong: s-maxage is the time for the CDN and wins over max-age", () => {
  assert.strictEqual(howLong("public, max-age=60, s-maxage=300"), 300);
  assert.strictEqual(howLong("public, s-maxage=60"), 60);
});

test("howLong: private, no-store and no-cache are never kept", () => {
  assert.strictEqual(howLong("private"), 0);
  assert.strictEqual(howLong("private, max-age=60"), 0);
  assert.strictEqual(howLong("no-store"), 0);
  assert.strictEqual(howLong("public, max-age=300, no-store"), 0);
  assert.strictEqual(howLong("no-cache"), 0);
});

test("howLong: no time means do not keep, so the edge does not guess", () => {
  assert.strictEqual(howLong(undefined), 0);
  assert.strictEqual(howLong(""), 0);
  assert.strictEqual(howLong("public"), 0);
  assert.strictEqual(howLong("max-age=0"), 0);
  assert.strictEqual(howLong("max-age=abc"), 0);
  assert.strictEqual(howLong("max-age=-5"), 0);
});

// A fake origin that counts how many times it was asked, and a clock the test can move.
function setup(notes) {
  const asked = [];
  let time = 1000;
  const origin = (url) => {
    asked.push(url);
    return { body: "body of " + url + " v" + asked.length, cacheControl: notes[url] };
  };
  const edge = createEdge(origin, () => time);
  return { edge, asked, tick: (s) => { time += s; } };
}

test("the first user misses, the second one hits (the logo of card 1)", () => {
  const { edge, asked } = setup({ "/logo.png": "public, max-age=60" });
  assert.deepStrictEqual(edge.get("/logo.png"), { body: "body of /logo.png v1", hit: false });
  assert.deepStrictEqual(edge.get("/logo.png"), { body: "body of /logo.png v1", hit: true });
  assert.deepStrictEqual(asked, ["/logo.png"]);
});

test("the guess of card 2: 4 requests, 3 reach the origin", () => {
  const { edge, asked } = setup({ "/logo.png": "public, max-age=60", "/account": "private" });
  for (const url of ["/logo.png", "/logo.png", "/account", "/account"]) edge.get(url);
  assert.strictEqual(asked.length, 3);
  assert.deepStrictEqual(edge.stats(), { requests: 4, hits: 1, misses: 3, originCalls: 3, hitRatio: 0.25 });
});

test("a private page is never shown to the next user (card 3)", () => {
  const { edge } = setup({ "/account": "public, max-age=300, private" });
  const first = edge.get("/account");
  const second = edge.get("/account");
  assert.strictEqual(second.hit, false);
  assert.notStrictEqual(second.body, first.body);       // the second user got their own answer from the origin
});

test("a copy is fresh for exactly max-age seconds, then the edge asks the origin again", () => {
  const { edge, asked, tick } = setup({ "/home": "public, max-age=60" });
  edge.get("/home");
  tick(59);
  assert.strictEqual(edge.get("/home").hit, true);
  tick(1);                                              // 60 seconds after the save: no longer fresh
  const after = edge.get("/home");
  assert.strictEqual(after.hit, false);
  assert.strictEqual(after.body, "body of /home v2");
  assert.strictEqual(asked.length, 2);
  tick(10);
  assert.deepStrictEqual(edge.get("/home"), { body: "body of /home v2", hit: true });   // the new copy has a new clock
});

test("two urls are two shelf places", () => {
  const { edge, asked } = setup({ "/a.png": "public, max-age=60", "/b.png": "public, max-age=60" });
  edge.get("/a.png"); edge.get("/b.png"); edge.get("/a.png"); edge.get("/b.png");
  assert.deepStrictEqual(asked, ["/a.png", "/b.png"]);
});

test("a new deploy under the same name: the old file stays until the time is up, then a purge fixes it (card 4)", () => {
  const notes = { "/app.js": "public, max-age=3600" };
  const asked = [];
  let version = 1, time = 0;
  const edge = createEdge((url) => { asked.push(url); return { body: "code v" + version, cacheControl: notes[url] }; }, () => time);
  edge.get("/app.js");
  version = 2;                                          // the team deploys new code, same file name
  time = 100;
  assert.strictEqual(edge.get("/app.js").body, "code v1");      // old file is still on the shelf
  assert.strictEqual(edge.purge("/app.js"), true);
  assert.strictEqual(edge.get("/app.js").body, "code v2");
  assert.strictEqual(edge.purge("/nothing-here"), false);
});

test("a new file name is a new shelf place, so a fingerprint needs no purge", () => {
  const notes = { "/app.3f9a1c.js": "public, max-age=31536000, immutable", "/app.8b2d70.js": "public, max-age=31536000, immutable" };
  const { edge } = setup(notes);
  assert.strictEqual(edge.get("/app.3f9a1c.js").hit, false);
  assert.strictEqual(edge.get("/app.8b2d70.js").hit, false);    // the new deploy asks the origin at once
  assert.strictEqual(edge.get("/app.3f9a1c.js").hit, true);
});

test("s-maxage keeps a page at the edge for the longer time", () => {
  const { edge, tick } = setup({ "/": "public, max-age=10, s-maxage=100" });
  edge.get("/");
  tick(50);
  assert.strictEqual(edge.get("/").hit, true);
  tick(50);
  assert.strictEqual(edge.get("/").hit, false);
});

test("stats start at zero and the hit ratio follows the traffic", () => {
  const { edge } = setup({ "/logo.png": "public, max-age=60" });
  assert.deepStrictEqual(edge.stats(), { requests: 0, hits: 0, misses: 0, originCalls: 0, hitRatio: 0 });
  edge.get("/logo.png");
  for (let i = 0; i < 9; i++) edge.get("/logo.png");
  assert.deepStrictEqual(edge.stats(), { requests: 10, hits: 9, misses: 1, originCalls: 1, hitRatio: 0.9 });
});

test("the default clock is real time", () => {
  let calls = 0;
  const edge = createEdge(() => { calls++; return { body: "x", cacheControl: "public, max-age=60" }; });
  edge.get("/x"); edge.get("/x");
  assert.strictEqual(calls, 1);
});
