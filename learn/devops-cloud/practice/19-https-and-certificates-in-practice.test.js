const test = require("node:test");
const assert = require("node:assert");
const {
  daysLeft, renewalStatus, challengeFor, matchesName, verifyChain, hstsHeader, maxLifetimeDays, legs,
} = require("./19-https-and-certificates-in-practice");

const copy = (value) => JSON.parse(JSON.stringify(value));

// A 90 day certificate, like a Let's Encrypt one. Issued 2026-11-03, ends 2027-02-01.
const cert90 = { notBefore: "2026-11-03T00:00:00Z", notAfter: "2027-02-01T00:00:00Z" };

// ---------- daysLeft ----------

test("daysLeft: counts whole days until the end date", () => {
  assert.strictEqual(daysLeft(cert90, "2027-01-22T00:00:00Z"), 10);
  assert.strictEqual(daysLeft(cert90, "2026-11-03T00:00:00Z"), 90);
});

test("daysLeft: part of a day is dropped (rounds down)", () => {
  assert.strictEqual(daysLeft(cert90, "2027-01-22T12:00:00Z"), 9);
  assert.strictEqual(daysLeft(cert90, "2027-01-31T00:00:01Z"), 0);
});

test("daysLeft: zero on the last day, negative after the end", () => {
  assert.strictEqual(daysLeft(cert90, "2027-01-31T23:00:00Z"), 0);
  assert.strictEqual(daysLeft(cert90, "2027-02-03T00:00:00Z"), -2);
  assert.ok(daysLeft(cert90, "2027-02-01T06:00:00Z") < 0);
});

test("daysLeft: does not change the certificate", () => {
  const c = copy(cert90);
  daysLeft(c, "2027-01-01T00:00:00Z");
  assert.deepStrictEqual(c, cert90);
});

// ---------- renewalStatus ----------

test("renewalStatus: a fresh certificate is ok", () => {
  assert.strictEqual(renewalStatus(cert90, "2026-11-04T00:00:00Z"), "ok");
});

test("renewalStatus: ok while at least a third of the life is left", () => {
  // exactly 30 days left of 90 is still ok. The rule is: renew when LESS than a third is left.
  assert.strictEqual(renewalStatus(cert90, "2027-01-02T00:00:00Z"), "ok");
});

test("renewalStatus: renew when less than a third is left", () => {
  assert.strictEqual(renewalStatus(cert90, "2027-01-03T00:00:00Z"), "renew");
  assert.strictEqual(renewalStatus(cert90, "2027-01-30T00:00:00Z"), "renew");
});

test("renewalStatus: expired at the end time and after", () => {
  assert.strictEqual(renewalStatus(cert90, "2027-02-01T00:00:00Z"), "expired");
  assert.strictEqual(renewalStatus(cert90, "2027-05-01T00:00:00Z"), "expired");
});

test("renewalStatus: one second before the end is renew, not expired", () => {
  assert.strictEqual(renewalStatus(cert90, "2027-01-31T23:59:59Z"), "renew");
});

test("renewalStatus: before the start date it is not yet valid", () => {
  assert.strictEqual(renewalStatus(cert90, "2026-11-02T00:00:00Z"), "not yet valid");
});

test("renewalStatus: a 45 day certificate renews with 15 days left", () => {
  const c = { notBefore: "2026-11-01T00:00:00Z", notAfter: "2026-12-16T00:00:00Z" };
  assert.strictEqual(renewalStatus(c, "2026-12-01T00:00:00Z"), "ok");
  assert.strictEqual(renewalStatus(c, "2026-12-02T00:00:00Z"), "renew");
});

test("renewalStatus: a 6 day certificate uses half of its life, not a third", () => {
  const c = { notBefore: "2026-11-01T00:00:00Z", notAfter: "2026-11-07T00:00:00Z" };
  assert.strictEqual(renewalStatus(c, "2026-11-04T00:00:00Z"), "ok");      // exactly half left
  assert.strictEqual(renewalStatus(c, "2026-11-04T00:00:01Z"), "renew");   // a little less than half
  assert.strictEqual(renewalStatus(c, "2026-11-02T00:00:00Z"), "ok");
});

test("renewalStatus: a 10 day certificate is still on the half rule, an 11 day one is on the third rule", () => {
  const ten = { notBefore: "2026-11-01T00:00:00Z", notAfter: "2026-11-11T00:00:00Z" };
  const eleven = { notBefore: "2026-11-01T00:00:00Z", notAfter: "2026-11-12T00:00:00Z" };
  assert.strictEqual(renewalStatus(ten, "2026-11-06T00:00:01Z"), "renew");
  assert.strictEqual(renewalStatus(eleven, "2026-11-06T00:00:01Z"), "ok");
});

test("renewalStatus: does not change the certificate", () => {
  const c = copy(cert90);
  renewalStatus(c, "2027-01-10T00:00:00Z");
  assert.deepStrictEqual(c, cert90);
});

// ---------- challengeFor ----------

test("challengeFor: one name and port 80 open is http-01", () => {
  assert.deepStrictEqual(challengeFor(["shop.example.com"], { port80: true, dnsApi: false }), { ok: true, challenge: "http-01" });
});

test("challengeFor: http-01 is chosen even when a DNS API is there too", () => {
  assert.deepStrictEqual(challengeFor(["shop.example.com", "www.example.com"], { port80: true, dnsApi: true }), { ok: true, challenge: "http-01" });
});

test("challengeFor: port 80 closed but a DNS API exists is dns-01", () => {
  assert.deepStrictEqual(challengeFor(["shop.example.com"], { port80: false, dnsApi: true }), { ok: true, challenge: "dns-01" });
});

test("challengeFor: no port 80 and no DNS API cannot work", () => {
  assert.deepStrictEqual(challengeFor(["shop.example.com"], { port80: false, dnsApi: false }), { ok: false, reason: "needs open port 80 or a DNS API" });
});

test("challengeFor: a wildcard always needs dns-01, even with port 80 open", () => {
  assert.deepStrictEqual(challengeFor(["*.example.com"], { port80: true, dnsApi: true }), { ok: true, challenge: "dns-01" });
  assert.deepStrictEqual(challengeFor(["example.com", "*.example.com"], { port80: true, dnsApi: true }), { ok: true, challenge: "dns-01" });
});

test("challengeFor: a wildcard without a DNS API fails, with port 80 open or not", () => {
  const expected = { ok: false, reason: "a wildcard needs dns-01 and a DNS API" };
  assert.deepStrictEqual(challengeFor(["*.example.com"], { port80: true, dnsApi: false }), expected);
  assert.deepStrictEqual(challengeFor(["*.example.com"], { port80: false, dnsApi: false }), expected);
});

test("challengeFor: a star in the wrong place is a bad name", () => {
  const bad = { ok: false, reason: "bad wildcard name" };
  assert.deepStrictEqual(challengeFor(["shop.*.example.com"], { port80: true, dnsApi: true }), bad);
  assert.deepStrictEqual(challengeFor(["a*.example.com"], { port80: true, dnsApi: true }), bad);
  assert.deepStrictEqual(challengeFor(["*.*.example.com"], { port80: true, dnsApi: true }), bad);
  assert.deepStrictEqual(challengeFor(["*"], { port80: true, dnsApi: true }), bad);
});

test("challengeFor: an empty list or no list throws", () => {
  assert.throws(() => challengeFor([], { port80: true, dnsApi: true }));
  assert.throws(() => challengeFor(undefined, { port80: true, dnsApi: true }));
});

test("challengeFor: does not change its inputs", () => {
  const names = ["example.com", "*.example.com"];
  const options = { port80: true, dnsApi: true };
  challengeFor(names, options);
  assert.deepStrictEqual(names, ["example.com", "*.example.com"]);
  assert.deepStrictEqual(options, { port80: true, dnsApi: true });
});

// ---------- matchesName ----------

test("matchesName: an exact name matches itself, in any letter case", () => {
  assert.strictEqual(matchesName("shop.example.com", "shop.example.com"), true);
  assert.strictEqual(matchesName("Shop.Example.COM", "shop.example.com"), true);
  assert.strictEqual(matchesName("shop.example.com", "SHOP.example.com"), true);
});

test("matchesName: a different name does not match", () => {
  assert.strictEqual(matchesName("shop.example.com", "api.example.com"), false);
  assert.strictEqual(matchesName("shop.example.com", "example.com"), false);
});

test("matchesName: a wildcard covers exactly one label", () => {
  assert.strictEqual(matchesName("*.example.com", "shop.example.com"), true);
  assert.strictEqual(matchesName("*.example.com", "SHOP.example.com"), true);
});

test("matchesName: a wildcard does not cover the bare domain", () => {
  assert.strictEqual(matchesName("*.example.com", "example.com"), false);
});

test("matchesName: a wildcard does not cover two labels", () => {
  assert.strictEqual(matchesName("*.example.com", "a.shop.example.com"), false);
});

test("matchesName: a wildcard does not match a different parent domain", () => {
  assert.strictEqual(matchesName("*.example.com", "shop.example.org"), false);
  assert.strictEqual(matchesName("*.example.com", "shop.notexample.com"), false);
  assert.strictEqual(matchesName("*.example.com", ".example.com"), false);
});

// ---------- verifyChain ----------

const NOW = "2026-12-01T00:00:00Z";
const leaf = { subject: "shop.example.test", issuer: "Demo Intermediate", notBefore: "2026-11-19T00:00:00Z", notAfter: "2027-02-17T00:00:00Z", names: ["shop.example.test"] };
const inter = { subject: "Demo Intermediate", issuer: "Demo Root", notBefore: "2026-01-01T00:00:00Z", notAfter: "2031-01-01T00:00:00Z" };
const root = { subject: "Demo Root", issuer: "Demo Root", notBefore: "2020-01-01T00:00:00Z", notAfter: "2036-01-01T00:00:00Z" };
const TRUSTED = ["Demo Root"];

test("verifyChain: leaf plus middle certificate, root in the trust list, is ok", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter], TRUSTED, "shop.example.test", NOW), { ok: true });
});

test("verifyChain: the server may send the root too", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter, root], TRUSTED, "shop.example.test", NOW), { ok: true });
});

test("verifyChain: the middle certificate missing is an unknown issuer", () => {
  assert.deepStrictEqual(verifyChain([leaf], TRUSTED, "shop.example.test", NOW), { ok: false, reason: "unknown issuer" });
});

test("verifyChain: the top certificate is trusted by its own subject, even when another root signed it", () => {
  // like ISRG Root X2, which is also signed by ISRG Root X1
  const crossSigned = { subject: "Demo Root", issuer: "Older Root", notBefore: "2020-01-01T00:00:00Z", notAfter: "2036-01-01T00:00:00Z" };
  assert.deepStrictEqual(verifyChain([leaf, inter, crossSigned], ["Demo Root"], "shop.example.test", NOW), { ok: true });
  assert.deepStrictEqual(verifyChain([leaf, inter, crossSigned], ["Older Root"], "shop.example.test", NOW), { ok: true });
});

test("verifyChain: a root that the browser does not trust is an unknown issuer", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter, root], ["Some Other Root"], "shop.example.test", NOW), { ok: false, reason: "unknown issuer" });
  assert.deepStrictEqual(verifyChain([leaf, inter], [], "shop.example.test", NOW), { ok: false, reason: "unknown issuer" });
});

test("verifyChain: a self signed leaf that is not in the trust list is an unknown issuer", () => {
  const selfSigned = { subject: "shop.example.test", issuer: "shop.example.test", notBefore: "2026-01-01T00:00:00Z", notAfter: "2027-01-01T00:00:00Z", names: ["shop.example.test"] };
  assert.deepStrictEqual(verifyChain([selfSigned], TRUSTED, "shop.example.test", NOW), { ok: false, reason: "unknown issuer" });
});

test("verifyChain: an expired leaf is expired", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter], TRUSTED, "shop.example.test", "2027-06-01T00:00:00Z"), { ok: false, reason: "expired" });
});

test("verifyChain: the exact end time counts as expired", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter], TRUSTED, "shop.example.test", "2027-02-17T00:00:00Z"), { ok: false, reason: "expired" });
  assert.deepStrictEqual(verifyChain([leaf, inter], TRUSTED, "shop.example.test", "2027-02-16T23:59:59Z"), { ok: true });
});

test("verifyChain: an expired middle certificate is expired, even when the leaf is fine", () => {
  const oldInter = { ...inter, notAfter: "2026-11-30T00:00:00Z" };
  assert.deepStrictEqual(verifyChain([leaf, oldInter], TRUSTED, "shop.example.test", NOW), { ok: false, reason: "expired" });
});

test("verifyChain: a leaf that is not valid yet says not yet valid", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter], TRUSTED, "shop.example.test", "2026-11-18T00:00:00Z"), { ok: false, reason: "not yet valid" });
});

test("verifyChain: a name that is not on the certificate is a hostname mismatch", () => {
  assert.deepStrictEqual(verifyChain([leaf, inter], TRUSTED, "other.example.test", NOW), { ok: false, reason: "hostname mismatch" });
});

test("verifyChain: a wildcard name on the leaf covers one label only", () => {
  const wild = { ...leaf, names: ["*.example.test"] };
  assert.deepStrictEqual(verifyChain([wild, inter], TRUSTED, "shop.example.test", NOW), { ok: true });
  assert.deepStrictEqual(verifyChain([wild, inter], TRUSTED, "example.test", NOW), { ok: false, reason: "hostname mismatch" });
  assert.deepStrictEqual(verifyChain([wild, inter], TRUSTED, "a.b.example.test", NOW), { ok: false, reason: "hostname mismatch" });
});

test("verifyChain: any one of several names on the leaf is enough", () => {
  const many = { ...leaf, names: ["example.test", "shop.example.test", "api.example.test"] };
  assert.deepStrictEqual(verifyChain([many, inter], TRUSTED, "api.example.test", NOW), { ok: true });
});

test("verifyChain: pieces that do not link (issuer does not match the next subject) are a broken chain", () => {
  const stranger = { ...inter, subject: "Another Middle" };
  assert.deepStrictEqual(verifyChain([leaf, stranger], TRUSTED, "shop.example.test", NOW), { ok: false, reason: "broken chain" });
});

test("verifyChain: an empty chain says no certificate", () => {
  assert.deepStrictEqual(verifyChain([], TRUSTED, "shop.example.test", NOW), { ok: false, reason: "no certificate" });
});

test("verifyChain: the hostname is checked first, then the dates, then the links, then trust", () => {
  const expiredLeaf = { ...leaf, notAfter: "2026-11-30T00:00:00Z" };
  assert.strictEqual(verifyChain([expiredLeaf], [], "other.example.test", NOW).reason, "hostname mismatch");
  assert.strictEqual(verifyChain([expiredLeaf], [], "shop.example.test", NOW).reason, "expired");
  const stranger = { ...inter, subject: "Another Middle", notAfter: "2026-11-30T00:00:00Z" };
  assert.strictEqual(verifyChain([leaf, stranger], [], "shop.example.test", NOW).reason, "expired");
  const stranger2 = { ...inter, subject: "Another Middle" };
  assert.strictEqual(verifyChain([leaf, stranger2], [], "shop.example.test", NOW).reason, "broken chain");
});

test("verifyChain: does not change its inputs", () => {
  const chain = [copy(leaf), copy(inter)];
  const before = copy(chain);
  verifyChain(chain, TRUSTED, "shop.example.test", NOW);
  assert.deepStrictEqual(chain, before);
  assert.deepStrictEqual(TRUSTED, ["Demo Root"]);
});

// ---------- hstsHeader ----------

test("hstsHeader: seconds, not days", () => {
  assert.strictEqual(hstsHeader({ days: 1 }), "max-age=86400");
  assert.strictEqual(hstsHeader({ days: 365 }), "max-age=31536000");
});

test("hstsHeader: includeSubDomains is added when asked", () => {
  assert.strictEqual(hstsHeader({ days: 30, includeSubDomains: true }), "max-age=2592000; includeSubDomains");
});

test("hstsHeader: includeSubDomains false or missing adds nothing", () => {
  assert.strictEqual(hstsHeader({ days: 30, includeSubDomains: false }), "max-age=2592000");
});

test("hstsHeader: preload with one year and includeSubDomains is allowed", () => {
  assert.strictEqual(hstsHeader({ days: 365, includeSubDomains: true, preload: true }), "max-age=31536000; includeSubDomains; preload");
  assert.strictEqual(hstsHeader({ days: 730, includeSubDomains: true, preload: true }), "max-age=63072000; includeSubDomains; preload");
});

test("hstsHeader: preload with less than a year throws", () => {
  assert.throws(() => hstsHeader({ days: 364, includeSubDomains: true, preload: true }), /preload needs at least 365 days and includeSubDomains/);
});

test("hstsHeader: preload without includeSubDomains throws", () => {
  assert.throws(() => hstsHeader({ days: 365, preload: true }), /preload needs at least 365 days and includeSubDomains/);
  assert.throws(() => hstsHeader({ days: 365, includeSubDomains: false, preload: true }), /preload needs/);
});

test("hstsHeader: 0 days is allowed, it switches HSTS off", () => {
  assert.strictEqual(hstsHeader({ days: 0 }), "max-age=0");
});

test("hstsHeader: days must be a whole number of 0 or more", () => {
  assert.throws(() => hstsHeader({ days: -1 }), /days must be a whole number of 0 or more/);
  assert.throws(() => hstsHeader({ days: 1.5 }), /days must be a whole number/);
  assert.throws(() => hstsHeader({ days: "30" }), /days must be a whole number/);
  assert.throws(() => hstsHeader({}), /days must be a whole number/);
});

// ---------- maxLifetimeDays ----------

test("maxLifetimeDays: 398 days before 2026-03-15", () => {
  assert.strictEqual(maxLifetimeDays("2025-06-01T00:00:00Z"), 398);
  assert.strictEqual(maxLifetimeDays("2026-03-14T23:59:59Z"), 398);
});

test("maxLifetimeDays: 200 days from 2026-03-15", () => {
  assert.strictEqual(maxLifetimeDays("2026-03-15T00:00:00Z"), 200);
  assert.strictEqual(maxLifetimeDays("2026-11-19T00:00:00Z"), 200);
  assert.strictEqual(maxLifetimeDays("2027-03-14T23:59:59Z"), 200);
});

test("maxLifetimeDays: 100 days from 2027-03-15", () => {
  assert.strictEqual(maxLifetimeDays("2027-03-15T00:00:00Z"), 100);
  assert.strictEqual(maxLifetimeDays("2028-06-01T00:00:00Z"), 100);
  assert.strictEqual(maxLifetimeDays("2029-03-14T23:59:59Z"), 100);
});

test("maxLifetimeDays: 47 days from 2029-03-15", () => {
  assert.strictEqual(maxLifetimeDays("2029-03-15T00:00:00Z"), 47);
  assert.strictEqual(maxLifetimeDays("2031-01-01T00:00:00Z"), 47);
});

test("maxLifetimeDays: a plain date works too", () => {
  assert.strictEqual(maxLifetimeDays("2026-03-15"), 200);
  assert.strictEqual(maxLifetimeDays("2026-03-14"), 398);
});

// ---------- legs ----------

test("legs: terminate means TLS ends at the proxy and the app leg is plain", () => {
  assert.deepStrictEqual(legs("terminate"), { browserLeg: "encrypted", appLeg: "plain", proxyCanRead: true, certificateOn: "proxy" });
});

test("legs: reencrypt means the proxy reads the request and starts a new TLS to the app", () => {
  assert.deepStrictEqual(legs("reencrypt"), { browserLeg: "encrypted", appLeg: "encrypted", proxyCanRead: true, certificateOn: "proxy and app" });
});

test("legs: passthrough means the proxy cannot read the request and the app holds the certificate", () => {
  assert.deepStrictEqual(legs("passthrough"), { browserLeg: "encrypted", appLeg: "encrypted", proxyCanRead: false, certificateOn: "app" });
});

test("legs: an unknown mode throws", () => {
  assert.throws(() => legs("flexible"), /mode must be terminate, reencrypt or passthrough/);
  assert.throws(() => legs(undefined), /mode must be/);
});

test("legs: each call gives a new object", () => {
  const a = legs("terminate");
  a.appLeg = "encrypted";
  assert.strictEqual(legs("terminate").appLeg, "plain");
});
