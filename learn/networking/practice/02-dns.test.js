const test = require("node:test");
const assert = require("node:assert");
const {
  lookupRecord, followCname, wildcardLookup, validateZone, createResolver, earliestSafeMove, pickWeighted, recordTypeFor,
} = require("./02-dns");

const copy = (value) => JSON.parse(JSON.stringify(value));
const rec = (name, type, ttl, value) => ({ name, type, ttl, value });

// One small zone for example.com.
const zone = [
  rec("example.com", "A", 300, "93.184.216.34"),
  rec("example.com", "A", 300, "93.184.216.35"),
  rec("example.com", "MX", 3600, "10 mail.example.com"),
  rec("www.example.com", "CNAME", 3600, "example.com"),
  rec("blog.example.com", "CNAME", 600, "shops.otherhost.net"),
  rec("api.example.com", "AAAA", 60, "2606:4700::1"),
];

// ---------- lookupRecord ----------

test("lookupRecord: returns the records with this name and type, in zone order", () => {
  assert.deepStrictEqual(lookupRecord(zone, "example.com", "A"), [
    rec("example.com", "A", 300, "93.184.216.34"),
    rec("example.com", "A", 300, "93.184.216.35"),
  ]);
});

test("lookupRecord: the type must match too", () => {
  assert.deepStrictEqual(lookupRecord(zone, "example.com", "MX"), [rec("example.com", "MX", 3600, "10 mail.example.com")]);
  assert.deepStrictEqual(lookupRecord(zone, "api.example.com", "A"), []);
});

test("lookupRecord: no match gives an empty list", () => {
  assert.deepStrictEqual(lookupRecord(zone, "nope.example.com", "A"), []);
  assert.deepStrictEqual(lookupRecord([], "example.com", "A"), []);
});

test("lookupRecord: letter case and one trailing dot do not matter", () => {
  assert.strictEqual(lookupRecord(zone, "EXAMPLE.com.", "A").length, 2);
  assert.strictEqual(lookupRecord(zone, "Www.Example.COM", "CNAME")[0].value, "example.com");
  const upper = [rec("Shop.Example.com.", "A", 60, "1.2.3.4")];
  assert.deepStrictEqual(lookupRecord(upper, "shop.example.com", "A"), [rec("shop.example.com", "A", 60, "1.2.3.4")]);
});

test("lookupRecord: a CNAME is not a stand-in for an A record", () => {
  assert.deepStrictEqual(lookupRecord(zone, "www.example.com", "A"), []);
});

test("lookupRecord: does not change the zone, and returns copies", () => {
  const before = copy(zone);
  const out = lookupRecord(zone, "example.com", "A");
  out[0].ttl = 1;
  out.push("x");
  assert.deepStrictEqual(zone, before);
});

// ---------- followCname ----------

test("followCname: a direct record is returned as it is", () => {
  assert.deepStrictEqual(followCname(zone, "example.com", "A"), {
    ok: true,
    answers: [rec("example.com", "A", 300, "93.184.216.34"), rec("example.com", "A", 300, "93.184.216.35")],
  });
});

test("followCname: follows a CNAME to the record it points to", () => {
  const r = followCname(zone, "www.example.com", "A");
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.answers.map((a) => a.type + " " + a.name), ["CNAME www.example.com", "A example.com", "A example.com"]);
  assert.strictEqual(r.next, undefined);
});

test("followCname: a chain of several CNAMEs, in order", () => {
  const z = [rec("a.x.com", "CNAME", 10, "b.x.com"), rec("b.x.com", "CNAME", 20, "c.x.com"), rec("c.x.com", "A", 30, "9.9.9.9")];
  const r = followCname(z, "A.x.com.", "A");
  assert.deepStrictEqual(r.answers.map((a) => a.value), ["b.x.com", "c.x.com", "9.9.9.9"]);
  assert.strictEqual(r.ok, true);
});

test("followCname: a CNAME that leaves the zone gives next", () => {
  assert.deepStrictEqual(followCname(zone, "blog.example.com", "A"), {
    ok: true,
    answers: [rec("blog.example.com", "CNAME", 600, "shops.otherhost.net")],
    next: "shops.otherhost.net",
  });
});

test("followCname: next is the clean name (lower case, no dot)", () => {
  const z = [rec("a.x.com", "CNAME", 10, "Elsewhere.NET.")];
  assert.strictEqual(followCname(z, "a.x.com", "A").next, "elsewhere.net");
});

test("followCname: a chain that ends at an empty name inside the zone gives next too", () => {
  const z = [rec("a.x.com", "CNAME", 10, "ghost.x.com")];
  assert.deepStrictEqual(followCname(z, "a.x.com", "A"), { ok: true, answers: [rec("a.x.com", "CNAME", 10, "ghost.x.com")], next: "ghost.x.com" });
});

test("followCname: no record and no CNAME means no record", () => {
  assert.deepStrictEqual(followCname(zone, "nope.example.com", "A"), { ok: false, reason: "no record" });
});

test("followCname: a name that has other types but not this one, and no CNAME, is no record", () => {
  assert.deepStrictEqual(followCname(zone, "api.example.com", "A"), { ok: false, reason: "no record" });
});

test("followCname: a loop is found", () => {
  const z = [rec("a.x.com", "CNAME", 10, "b.x.com"), rec("b.x.com", "CNAME", 10, "a.x.com")];
  assert.deepStrictEqual(followCname(z, "a.x.com", "A"), { ok: false, reason: "loop" });
});

test("followCname: a CNAME that points at itself is a loop", () => {
  assert.deepStrictEqual(followCname([rec("a.x.com", "CNAME", 10, "a.x.com")], "a.x.com", "A"), { ok: false, reason: "loop" });
});

test("followCname: 8 CNAMEs are fine, 9 are too many", () => {
  const chain = (n) => {
    const z = [];
    for (let i = 1; i <= n; i++) z.push(rec("h" + i + ".x.com", "CNAME", 10, "h" + (i + 1) + ".x.com"));
    z.push(rec("h" + (n + 1) + ".x.com", "A", 10, "1.1.1.1"));
    return z;
  };
  assert.strictEqual(followCname(chain(8), "h1.x.com", "A").ok, true);
  assert.deepStrictEqual(followCname(chain(9), "h1.x.com", "A"), { ok: false, reason: "too many hops" });
});

test("followCname: a direct record of the type wins over a CNAME", () => {
  const z = [rec("a.x.com", "A", 10, "1.1.1.1"), rec("a.x.com", "CNAME", 10, "b.x.com")];
  assert.deepStrictEqual(followCname(z, "a.x.com", "A").answers.map((a) => a.type), ["A"]);
});

test("followCname: asking for the CNAME itself does not follow it", () => {
  assert.deepStrictEqual(followCname(zone, "www.example.com", "CNAME"), {
    ok: true,
    answers: [rec("www.example.com", "CNAME", 3600, "example.com")],
  });
});

test("followCname: does not change the zone", () => {
  const before = copy(zone);
  followCname(zone, "www.example.com", "A");
  assert.deepStrictEqual(zone, before);
});

// ---------- wildcardLookup ----------

const wz = [
  rec("apps.example.com", "A", 300, "10.0.0.1"),
  rec("*.apps.example.com", "A", 300, "10.0.0.1"),
  rec("captain.apps.example.com", "A", 60, "10.0.0.9"),
  rec("dev.apps.example.com", "A", 60, "10.0.0.7"),
  rec("x.dev.apps.example.com", "A", 60, "10.0.0.8"),
  rec("*.dev.apps.example.com", "AAAA", 60, "2606:4700::7"),
];

test("wildcardLookup: a wildcard answers for a name that has no record", () => {
  assert.deepStrictEqual(wildcardLookup(wz, "my-app.apps.example.com", "A"), [rec("my-app.apps.example.com", "A", 300, "10.0.0.1")]);
});

test("wildcardLookup: the answer carries the host name, not the star", () => {
  assert.strictEqual(wildcardLookup(wz, "Shop.Apps.Example.com.", "A")[0].name, "shop.apps.example.com");
});

test("wildcardLookup: an own record beats the wildcard", () => {
  assert.deepStrictEqual(wildcardLookup(wz, "captain.apps.example.com", "A"), [rec("captain.apps.example.com", "A", 60, "10.0.0.9")]);
});

test("wildcardLookup: a name that exists without this type does not use the wildcard", () => {
  assert.deepStrictEqual(wildcardLookup(wz, "captain.apps.example.com", "AAAA"), []);
});

test("wildcardLookup: the wildcard does not answer for its own parent name", () => {
  const z = [rec("*.apps.example.com", "A", 300, "10.0.0.1")];
  assert.deepStrictEqual(wildcardLookup(z, "apps.example.com", "A"), []);
});

test("wildcardLookup: several labels can match", () => {
  const out = wildcardLookup(wz, "a.b.apps.example.com", "A");
  assert.deepStrictEqual(out, [rec("a.b.apps.example.com", "A", 300, "10.0.0.1")]);
});

test("wildcardLookup: a name that exists below blocks the wildcard above it", () => {
  // "dev.apps.example.com" exists and "x.dev.apps.example.com" exists. "y.dev.apps..." has no
  // A record of its own, and the nearest parent "dev.apps.example.com" exists, with no A wildcard.
  assert.deepStrictEqual(wildcardLookup(wz, "y.dev.apps.example.com", "A"), []);
});

test("wildcardLookup: a wildcard of another type at the nearest parent is not used for this type", () => {
  assert.deepStrictEqual(wildcardLookup(wz, "y.dev.apps.example.com", "AAAA"), [rec("y.dev.apps.example.com", "AAAA", 60, "2606:4700::7")]);
});

test("wildcardLookup: a name that exists only because something sits below it blocks the wildcard", () => {
  const z = [rec("*.example.com", "A", 300, "1.1.1.1"), rec("deep.mid.example.com", "A", 300, "2.2.2.2")];
  assert.deepStrictEqual(wildcardLookup(z, "mid.example.com", "A"), []);
  assert.deepStrictEqual(wildcardLookup(z, "other.example.com", "A"), [rec("other.example.com", "A", 300, "1.1.1.1")]);
});

test("wildcardLookup: no wildcard anywhere gives an empty list", () => {
  assert.deepStrictEqual(wildcardLookup(zone, "shop.example.com", "A"), []);
});

test("wildcardLookup: does not change the zone", () => {
  const before = copy(wz);
  wildcardLookup(wz, "my-app.apps.example.com", "A");
  assert.deepStrictEqual(wz, before);
});

// ---------- validateZone ----------

test("validateZone: a good zone has no problems", () => {
  assert.deepStrictEqual(validateZone(zone, "example.com"), []);
});

test("validateZone: a CNAME with another record on the same name", () => {
  const z = [rec("www.example.com", "CNAME", 60, "example.com"), rec("www.example.com", "TXT", 60, "hello")];
  assert.deepStrictEqual(validateZone(z, "example.com"), [{ name: "www.example.com", problem: "cname with other records" }]);
});

test("validateZone: a CNAME at the apex", () => {
  const z = [rec("example.com", "CNAME", 60, "shops.otherhost.net")];
  assert.deepStrictEqual(validateZone(z, "example.com"), [{ name: "example.com", problem: "cname at apex" }]);
});

test("validateZone: the apex rule wins over the other-records rule, and origin case does not matter", () => {
  const z = [rec("Example.com.", "CNAME", 60, "x.net"), rec("example.com", "NS", 60, "ns1.x.net"), rec("example.com", "MX", 60, "10 m.x.net")];
  assert.deepStrictEqual(validateZone(z, "EXAMPLE.com"), [{ name: "example.com", problem: "cname at apex" }]);
});

test("validateZone: two CNAMEs on one name come first", () => {
  const z = [rec("www.example.com", "CNAME", 60, "a.net"), rec("www.example.com", "CNAME", 60, "b.net"), rec("www.example.com", "A", 60, "1.1.1.1")];
  assert.deepStrictEqual(validateZone(z, "example.com"), [{ name: "www.example.com", problem: "more than one cname" }]);
});

test("validateZone: problems are sorted by name", () => {
  const z = [
    rec("z.example.com", "CNAME", 60, "a.net"), rec("z.example.com", "A", 60, "1.1.1.1"),
    rec("b.example.com", "CNAME", 60, "a.net"), rec("b.example.com", "TXT", 60, "x"),
    rec("m.example.com", "CNAME", 60, "a.net"),
  ];
  assert.deepStrictEqual(validateZone(z, "example.com").map((p) => p.name), ["b.example.com", "z.example.com"]);
});

test("validateZone: a CNAME on a subdomain of the apex alone is fine", () => {
  assert.deepStrictEqual(validateZone([rec("www.example.com", "CNAME", 60, "x.net")], "example.com"), []);
});

test("validateZone: does not change the zone", () => {
  const before = copy(zone);
  validateZone(zone, "example.com");
  assert.deepStrictEqual(zone, before);
});

// ---------- createResolver ----------

const world = {
  root: { com: "a.gtld", net: "a.nettld" },
  tld: {
    "a.gtld": { "example.com": "ns1.example", "shopfront.com": "ns1.shopfront" },
    "a.nettld": { "otherhost.net": "ns1.otherhost" },
  },
  auth: {
    "ns1.example": [
      rec("example.com", "A", 300, "93.184.216.34"),
      rec("example.com", "AAAA", 300, "2606:4700::1"),
      rec("www.example.com", "CNAME", 3600, "example.com"),
      rec("blog.example.com", "CNAME", 600, "shops.otherhost.net"),
      rec("loop1.example.com", "CNAME", 60, "loop2.example.com"),
      rec("loop2.example.com", "CNAME", 60, "loop1.example.com"),
      rec("zero.example.com", "A", 0, "5.5.5.5"),
    ],
    "ns1.shopfront": [rec("shopfront.com", "A", 100, "7.7.7.7")],
    "ns1.otherhost": [rec("shops.otherhost.net", "A", 120, "1.2.3.4")],
  },
};

test("resolver: a first lookup asks root, then the TLD server, then the authoritative server", () => {
  const r = createResolver(world);
  const out = r.resolve("example.com", "A", 0);
  assert.deepStrictEqual(out, {
    rcode: "NOERROR",
    answers: [rec("example.com", "A", 300, "93.184.216.34")],
    fromCache: false,
    asked: ["root", "a.gtld", "ns1.example"],
  });
});

test("resolver: the second lookup comes from the cache and asks nobody", () => {
  const r = createResolver(world);
  r.resolve("example.com", "A", 0);
  const out = r.resolve("example.com", "A", 10);
  assert.strictEqual(out.fromCache, true);
  assert.deepStrictEqual(out.asked, []);
  assert.strictEqual(out.rcode, "NOERROR");
  assert.strictEqual(out.answers[0].value, "93.184.216.34");
});

test("resolver: the TTL in a cached answer counts down", () => {
  const r = createResolver(world);
  r.resolve("example.com", "A", 100);
  assert.strictEqual(r.resolve("example.com", "A", 130).answers[0].ttl, 270);
  assert.strictEqual(r.resolve("example.com", "A", 399).answers[0].ttl, 1);
});

test("resolver: the answer is gone from the cache at exactly the end of its TTL", () => {
  const r = createResolver(world);
  r.resolve("example.com", "A", 0);
  assert.strictEqual(r.resolve("example.com", "A", 299).fromCache, true);
  const out = r.resolve("example.com", "A", 300);
  assert.strictEqual(out.fromCache, false);
  assert.deepStrictEqual(out.asked, ["root", "a.gtld", "ns1.example"]);
  assert.strictEqual(out.answers[0].ttl, 300);
});

test("resolver: after the cache runs out, a changed record shows up (this is why changes take time)", () => {
  const w = copy(world);
  const r = createResolver(w);
  assert.strictEqual(r.resolve("example.com", "A", 0).answers[0].value, "93.184.216.34");
  w.auth["ns1.example"][0].value = "203.0.113.9";
  assert.strictEqual(r.resolve("example.com", "A", 200).answers[0].value, "93.184.216.34");
  assert.strictEqual(r.resolve("example.com", "A", 300).answers[0].value, "203.0.113.9");
});

test("resolver: two resolvers have two separate caches", () => {
  const a = createResolver(world);
  const b = createResolver(world);
  a.resolve("example.com", "A", 0);
  assert.strictEqual(b.resolve("example.com", "A", 5).fromCache, false);
});

test("resolver: the same name with another type is another lookup", () => {
  const r = createResolver(world);
  r.resolve("example.com", "A", 0);
  const out = r.resolve("example.com", "AAAA", 1);
  assert.strictEqual(out.fromCache, false);
  assert.strictEqual(out.answers[0].value, "2606:4700::1");
});

test("resolver: letter case in the name does not matter, also for the cache", () => {
  const r = createResolver(world);
  r.resolve("Example.COM.", "A", 0);
  assert.strictEqual(r.resolve("example.com", "A", 1).fromCache, true);
});

test("resolver: a CNAME in the same zone is followed and both records are returned", () => {
  const out = createResolver(world).resolve("www.example.com", "A", 0);
  assert.strictEqual(out.rcode, "NOERROR");
  assert.deepStrictEqual(out.answers.map((a) => a.type + ":" + a.value), ["CNAME:example.com", "A:93.184.216.34"]);
  assert.deepStrictEqual(out.asked, ["root", "a.gtld", "ns1.example"]);
});

test("resolver: a CNAME to another provider starts a second lookup from the root", () => {
  const out = createResolver(world).resolve("blog.example.com", "A", 0);
  assert.strictEqual(out.rcode, "NOERROR");
  assert.deepStrictEqual(out.answers.map((a) => a.value), ["shops.otherhost.net", "1.2.3.4"]);
  assert.deepStrictEqual(out.asked, ["root", "a.gtld", "ns1.example", "root", "a.nettld", "ns1.otherhost"]);
});

test("resolver: each record in a cached CNAME answer keeps its own countdown", () => {
  const r = createResolver(world);
  r.resolve("blog.example.com", "A", 0);
  const out = r.resolve("blog.example.com", "A", 50);
  assert.strictEqual(out.fromCache, true);
  assert.deepStrictEqual(out.answers.map((a) => a.ttl), [550, 70]);
});

test("resolver: a chain is cached only until its shortest TTL ends", () => {
  const r = createResolver(world);
  r.resolve("blog.example.com", "A", 0);
  assert.strictEqual(r.resolve("blog.example.com", "A", 119).fromCache, true);
  assert.strictEqual(r.resolve("blog.example.com", "A", 120).fromCache, false);
});

test("resolver: a name that does not exist gives NXDOMAIN after asking all three", () => {
  const out = createResolver(world).resolve("nope.example.com", "A", 0);
  assert.deepStrictEqual(out, { rcode: "NXDOMAIN", answers: [], fromCache: false, asked: ["root", "a.gtld", "ns1.example"] });
});

test("resolver: an unknown TLD stops at the root", () => {
  const out = createResolver(world).resolve("example.zzz", "A", 0);
  assert.deepStrictEqual(out, { rcode: "NXDOMAIN", answers: [], fromCache: false, asked: ["root"] });
});

test("resolver: an unknown domain stops at the TLD server", () => {
  const out = createResolver(world).resolve("unknown.com", "A", 0);
  assert.deepStrictEqual(out, { rcode: "NXDOMAIN", answers: [], fromCache: false, asked: ["root", "a.gtld"] });
});

test("resolver: NXDOMAIN is remembered for 300 seconds by default", () => {
  const r = createResolver(world);
  r.resolve("nope.example.com", "A", 0);
  const hit = r.resolve("nope.example.com", "A", 299);
  assert.strictEqual(hit.rcode, "NXDOMAIN");
  assert.strictEqual(hit.fromCache, true);
  assert.deepStrictEqual(hit.asked, []);
  assert.strictEqual(r.resolve("nope.example.com", "A", 300).fromCache, false);
});

test("resolver: the negative time can be set", () => {
  const r = createResolver(world, { negativeTtl: 30 });
  r.resolve("nope.example.com", "A", 0);
  assert.strictEqual(r.resolve("nope.example.com", "A", 29).fromCache, true);
  assert.strictEqual(r.resolve("nope.example.com", "A", 30).fromCache, false);
});

test("resolver: a new record is not seen while the old NXDOMAIN is remembered", () => {
  const w = copy(world);
  const r = createResolver(w);
  assert.strictEqual(r.resolve("new.example.com", "A", 0).rcode, "NXDOMAIN");
  w.auth["ns1.example"].push(rec("new.example.com", "A", 60, "8.8.4.4"));
  assert.strictEqual(r.resolve("new.example.com", "A", 100).rcode, "NXDOMAIN");
  assert.strictEqual(r.resolve("new.example.com", "A", 300).rcode, "NOERROR");
});

test("resolver: a CNAME loop gives SERVFAIL and is not remembered", () => {
  const r = createResolver(world);
  const out = r.resolve("loop1.example.com", "A", 0);
  assert.deepStrictEqual(out, { rcode: "SERVFAIL", answers: [], fromCache: false, asked: ["root", "a.gtld", "ns1.example"] });
  assert.strictEqual(r.resolve("loop1.example.com", "A", 1).fromCache, false);
});

test("resolver: a CNAME that ends at a missing name gives NXDOMAIN with the CNAME in the answers", () => {
  const w = copy(world);
  w.auth["ns1.example"].push(rec("dead.example.com", "CNAME", 60, "gone.otherhost.net"));
  const out = createResolver(w).resolve("dead.example.com", "A", 0);
  assert.strictEqual(out.rcode, "NXDOMAIN");
  assert.deepStrictEqual(out.answers.map((a) => a.type), ["CNAME"]);
});

test("resolver: a TTL of 0 is never served from the cache", () => {
  const r = createResolver(world);
  r.resolve("zero.example.com", "A", 0);
  assert.strictEqual(r.resolve("zero.example.com", "A", 0).fromCache, false);
});

test("resolver: a long CNAME chain across zones ends in SERVFAIL after 8 jumps", () => {
  const w = { root: { com: "t" }, tld: { t: {} }, auth: {} };
  for (let i = 1; i <= 12; i++) {
    const domain = "d" + i + ".com";
    w.tld.t[domain] = "ns" + i;
    w.auth["ns" + i] = i === 12 ? [rec(domain, "A", 10, "1.1.1.1")] : [rec(domain, "CNAME", 10, "d" + (i + 1) + ".com")];
  }
  assert.strictEqual(createResolver(w).resolve("d1.com", "A", 0).rcode, "SERVFAIL");
  assert.strictEqual(createResolver(w).resolve("d9.com", "A", 0).rcode, "NOERROR");
});

test("resolver: does not change the world", () => {
  const before = copy(world);
  const r = createResolver(world);
  r.resolve("blog.example.com", "A", 0);
  r.resolve("blog.example.com", "A", 5);
  r.resolve("nope.example.com", "A", 5);
  assert.deepStrictEqual(world, before);
});

test("resolver: changing an answer you got does not change what the cache holds", () => {
  const r = createResolver(world);
  const first = r.resolve("example.com", "A", 0);
  first.answers[0].value = "0.0.0.0";
  assert.strictEqual(r.resolve("example.com", "A", 1).answers[0].value, "93.184.216.34");
});

// ---------- earliestSafeMove ----------

test("earliestSafeMove: lower the TTL, then wait one old TTL", () => {
  assert.strictEqual(earliestSafeMove(1000, 3600), 4600);
  assert.strictEqual(earliestSafeMove(0, 86400), 86400);
  assert.strictEqual(earliestSafeMove(500, 0), 500);
});

test("earliestSafeMove: bad input throws", () => {
  assert.throws(() => earliestSafeMove(1000, -1), Error);
  assert.throws(() => earliestSafeMove("1000", 60), Error);
  assert.throws(() => earliestSafeMove(1000, NaN), Error);
  assert.throws(() => earliestSafeMove(Infinity, 60), Error);
});

// ---------- pickWeighted ----------

test("pickWeighted: equal weights split the range in equal parts", () => {
  const rs = [{ value: "a" }, { value: "b" }];
  assert.strictEqual(pickWeighted(rs, 0), "a");
  assert.strictEqual(pickWeighted(rs, 0.49), "a");
  assert.strictEqual(pickWeighted(rs, 0.5), "b");
  assert.strictEqual(pickWeighted(rs, 0.99), "b");
});

test("pickWeighted: weights 3 and 1 give 75 and 25 percent", () => {
  const rs = [{ value: "big", weight: 3 }, { value: "small", weight: 1 }];
  assert.strictEqual(pickWeighted(rs, 0.74), "big");
  assert.strictEqual(pickWeighted(rs, 0.75), "small");
  assert.strictEqual(pickWeighted(rs, 0.999), "small");
});

test("pickWeighted: counts for 100 evenly spaced rolls match the weights", () => {
  const rs = [{ value: "a", weight: 1 }, { value: "b", weight: 2 }, { value: "c", weight: 5 }];
  const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 80; i++) counts[pickWeighted(rs, i / 80)]++;
  assert.deepStrictEqual(counts, { a: 10, b: 20, c: 50 });
});

test("pickWeighted: a record with weight 0 is never picked", () => {
  const rs = [{ value: "off", weight: 0 }, { value: "on", weight: 1 }];
  assert.strictEqual(pickWeighted(rs, 0), "on");
});

test("pickWeighted: an unhealthy record is left out and the rest share the range", () => {
  const rs = [{ value: "a", healthy: false }, { value: "b" }, { value: "c" }];
  assert.strictEqual(pickWeighted(rs, 0), "b");
  assert.strictEqual(pickWeighted(rs, 0.49), "b");
  assert.strictEqual(pickWeighted(rs, 0.5), "c");
});

test("pickWeighted: nothing left gives null", () => {
  assert.strictEqual(pickWeighted([], 0.5), null);
  assert.strictEqual(pickWeighted([{ value: "a", healthy: false }], 0.5), null);
  assert.strictEqual(pickWeighted([{ value: "a", weight: 0 }], 0.5), null);
});

test("pickWeighted: bad roll or weight throws", () => {
  const rs = [{ value: "a" }];
  assert.throws(() => pickWeighted(rs, 1), Error);
  assert.throws(() => pickWeighted(rs, -0.1), Error);
  assert.throws(() => pickWeighted(rs, NaN), Error);
  assert.throws(() => pickWeighted([{ value: "a", weight: -1 }], 0.5), Error);
  assert.throws(() => pickWeighted([{ value: "a", weight: "2" }], 0.5), Error);
});

test("pickWeighted: does not change the records", () => {
  const rs = [{ value: "a", weight: 3 }, { value: "b", healthy: false }];
  const before = copy(rs);
  pickWeighted(rs, 0.2);
  assert.deepStrictEqual(rs, before);
});

// ---------- recordTypeFor ----------

test("recordTypeFor: an IPv4 address is an A record", () => {
  assert.strictEqual(recordTypeFor("93.184.216.34"), "A");
  assert.strictEqual(recordTypeFor("0.0.0.0"), "A");
  assert.strictEqual(recordTypeFor("255.255.255.255", { apex: true }), "A");
  assert.strictEqual(recordTypeFor("  10.0.0.1 "), "A");
});

test("recordTypeFor: an IPv6 address is an AAAA record", () => {
  assert.strictEqual(recordTypeFor("2606:4700::1"), "AAAA");
  assert.strictEqual(recordTypeFor("2001:DB8::ff00:42:8329"), "AAAA");
  assert.strictEqual(recordTypeFor("2606:4700::1", { apex: true }), "AAAA");
});

test("recordTypeFor: a name is a CNAME", () => {
  assert.strictEqual(recordTypeFor("my-app.herokuapp.com"), "CNAME");
  assert.strictEqual(recordTypeFor("d111111abcdef8.cloudfront.net", { apex: false }), "CNAME");
  assert.strictEqual(recordTypeFor("  lb-1234.elb.amazonaws.com "), "CNAME");
});

test("recordTypeFor: a name at the apex needs ALIAS", () => {
  assert.strictEqual(recordTypeFor("my-app.herokuapp.com", { apex: true }), "ALIAS");
});

test("recordTypeFor: four numbers with one over 255 is an error, not a name", () => {
  assert.throws(() => recordTypeFor("999.1.1.1"), /bad IPv4 address/);
  assert.throws(() => recordTypeFor("1.2.3.256", { apex: true }), /bad IPv4 address/);
});

test("recordTypeFor: empty or not text throws", () => {
  assert.throws(() => recordTypeFor(""), /target must be text/);
  assert.throws(() => recordTypeFor("   "), /target must be text/);
  assert.throws(() => recordTypeFor(42), /target must be text/);
  assert.throws(() => recordTypeFor(undefined), /target must be text/);
});

test("recordTypeFor: a host name with a number part is still a name", () => {
  assert.strictEqual(recordTypeFor("10.example.com"), "CNAME");
  assert.strictEqual(recordTypeFor("1.2.3.example.com"), "CNAME");
  assert.strictEqual(recordTypeFor("1.2.3"), "CNAME");
  assert.strictEqual(recordTypeFor("1.2.3.4.5"), "CNAME");
});
