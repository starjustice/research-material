// Lesson 19: HTTPS and certificates in practice. Write the eight pieces below, then run:
//   node --test learn/devops-cloud/practice/19-https-and-certificates-in-practice.test.js
//
// Times are text like "2026-11-03T00:00:00Z". Turn them into numbers with Date.parse(text).
// A certificate is a plain object: { notBefore, notAfter } (the leaf also has names, see verifyChain).
// Never change the objects you are given.
//
//   daysLeft(cert, now)
//       Whole days from now until cert.notAfter, rounded down.
//       0 on the last day. Negative after the end.
//
//   renewalStatus(cert, now)
//       Return one of these words, checked in this order:
//         "not yet valid"  now is before notBefore
//         "expired"        now is at or after notAfter
//         "renew"          less than a third of the whole life is left
//                          (the whole life is notAfter - notBefore)
//                          For a certificate with a whole life of 10 days or less, use a half, not a third.
//         "ok"             anything else
//       "Less than" means exactly a third left is still "ok".
//
//   challengeFor(names, options)
//       names: list of host names, like ["shop.example.com", "*.example.com"].
//       options: { port80: true or false, dnsApi: true or false }.
//       Return { ok: true, challenge: "http-01" } or { ok: true, challenge: "dns-01" }
//       or { ok: false, reason: "..." }. Rules, in this order:
//         - names is not a list, or is empty: throw an Error.
//         - A name with a star is only good when it starts with "*." and has exactly one star.
//           Any other star: { ok: false, reason: "bad wildcard name" }
//         - A wildcard in the list needs dns-01:
//             with dnsApi: { ok: true, challenge: "dns-01" }
//             without:     { ok: false, reason: "a wildcard needs dns-01 and a DNS API" }
//         - No wildcard: port80 gives "http-01". Else dnsApi gives "dns-01".
//           Else { ok: false, reason: "needs open port 80 or a DNS API" }
//
//   matchesName(pattern, host)
//       Does a name on a certificate cover this host? Letter case does not matter.
//       "shop.example.com" covers only "shop.example.com".
//       "*.example.com" covers exactly one more label: "shop.example.com" yes,
//       "example.com" no, "a.shop.example.com" no.
//
//   verifyChain(chain, trustedRoots, host, now)
//       chain: the certificates the server sent, your own first (the leaf), then the middle ones.
//       Each one is { subject, issuer, notBefore, notAfter }. The leaf also has names: [...].
//       trustedRoots: a list of subject names that the browser trusts.
//       Return { ok: true } or { ok: false, reason }. Check in this order and stop at the first problem:
//         1. chain is empty:                          "no certificate"
//         2. no name on the leaf covers host:         "hostname mismatch"
//         3. walk from the leaf up. For each one:     "not yet valid" or "expired"
//            (expired when now is at or after notAfter)
//         4. each issuer must equal the next subject: "broken chain"
//         5. the top certificate is trusted when its subject OR its issuer is in trustedRoots
//            (the server does not have to send the root). If not: "unknown issuer"
//
//   hstsHeader(options)
//       options: { days, includeSubDomains, preload }. The last two default to false.
//       Return the header VALUE, with max-age in seconds: "max-age=86400" for 1 day.
//       Add "; includeSubDomains" and then "; preload" when they are true.
//       Throw an Error("days must be a whole number of 0 or more") unless days is a whole number >= 0
//       (0 is allowed: it switches HSTS off).
//       Throw an Error("preload needs at least 365 days and includeSubDomains") when preload is true
//       and days is under 365 or includeSubDomains is not true.
//
//   maxLifetimeDays(issueDate)
//       The longest life, in days, that a public certificate may have, by the day it is issued
//       (the CA/Browser Forum rule):
//         before 2026-03-15: 398      from 2026-03-15: 200
//         from 2027-03-15: 100        from 2029-03-15: 47
//       The change happens at 00:00 UTC on those dates. Use Date.UTC(2026, 2, 15) (months start at 0).
//
//   legs(mode)
//       Where does the HTTPS end? mode is "terminate", "reencrypt" or "passthrough".
//       Return { browserLeg, appLeg, proxyCanRead, certificateOn }:
//         terminate:   { browserLeg: "encrypted", appLeg: "plain",     proxyCanRead: true,  certificateOn: "proxy" }
//         reencrypt:   { browserLeg: "encrypted", appLeg: "encrypted", proxyCanRead: true,  certificateOn: "proxy and app" }
//         passthrough: { browserLeg: "encrypted", appLeg: "encrypted", proxyCanRead: false, certificateOn: "app" }
//       Any other mode: throw an Error("mode must be terminate, reencrypt or passthrough").

const DAY = 24 * 60 * 60 * 1000;

function daysLeft(cert, now) {
  // TODO
}

function renewalStatus(cert, now) {
  // TODO
}

function challengeFor(names, options) {
  // TODO
}

function matchesName(pattern, host) {
  // TODO
}

function verifyChain(chain, trustedRoots, host, now) {
  // TODO
}

function hstsHeader(options) {
  // TODO
}

function maxLifetimeDays(issueDate) {
  // TODO
}

function legs(mode) {
  // TODO
}

module.exports = { daysLeft, renewalStatus, challengeFor, matchesName, verifyChain, hstsHeader, maxLifetimeDays, legs };
