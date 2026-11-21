// Lesson 02: DNS. Write the eight pieces below, then run:
//   node --test learn/networking/practice/02-dns.test.js
//
// A record is a plain object: { name, type, ttl, value }.
//   { name: "www.example.com", type: "CNAME", ttl: 3600, value: "example.com" }
// A zone is a list of records, like the list one authoritative server holds.
// Names: letter case does not matter, and one dot at the end is ignored.
//   "WWW.Example.com." is the same name as "www.example.com". Records you return have the clean name.
// Never change the objects you are given. Return new ones.
//
//   lookupRecord(zone, name, type)
//       Every record in the zone with this name and this type, in the same order as the zone.
//       Return copies { name, type, ttl, value }. No match: an empty list.
//
//   followCname(zone, name, type)
//       Look up name and type in this one zone. If there is no such record but there is a CNAME for
//       the name, add the CNAME to the answers and look up its value instead. Repeat.
//       Return one of:
//         { ok: true, answers: [...] }              the chain ends with records of the type you asked for.
//                                                   answers holds every CNAME on the way, then those records.
//         { ok: true, answers: [...], next: name }  the chain ends at a name this zone has nothing for.
//                                                   answers holds the CNAMEs. next is the name to ask elsewhere.
//         { ok: false, reason: "no record" }        nothing for the first name (no record, no CNAME).
//         { ok: false, reason: "loop" }             a CNAME points back to a name already seen.
//         { ok: false, reason: "too many hops" }    more than 8 CNAMEs in the chain.
//       A direct record wins: if the name has the type you asked for, do not follow a CNAME.
//       If type is "CNAME", that is a direct lookup and it never follows.
//
//   wildcardLookup(zone, host, type)
//       Wildcard rules (RFC 4592). A record named "*.apps.example.com" answers for names below apps.example.com.
//         - If the host name exists in the zone (it has a record, or some record sits below it), the host
//           uses its own records only. No wildcard is used. Return those of this type (maybe none).
//         - Else look for a wildcard, starting at the nearest parent and going up. At each parent P:
//             a record named "*.P" of this type exists: return copies of them, with name set to the host.
//             else if the name P exists in the zone: stop and return an empty list.
//         - Several labels can match: "*.apps.example.com" answers for "a.b.apps.example.com"
//           when "b.apps.example.com" does not exist.
//         - "*.apps.example.com" never answers for "apps.example.com" itself.
//
//   validateZone(zone, origin)
//       origin is the name of the zone, like "example.com" (the apex). Look at every name that has
//       a CNAME. Report the first problem that applies, in this order:
//         "more than one cname"       two or more CNAME records on one name
//         "cname at apex"             the CNAME name is the origin
//         "cname with other records"  the name has any other record too
//       Return a list of { name, problem }, sorted by name. A good zone gives an empty list.
//
//   createResolver(world, options)
//       A resolver with a cache. world is the three layers of DNS:
//         world.root: { com: "a.gtld" }                 the root says which server runs each TLD
//         world.tld:  { "a.gtld": { "example.com": "ns1.example" } }   the TLD server says who runs each domain
//         world.auth: { "ns1.example": [records...] }    the authoritative server holds the records
//       The domain is the last two labels of the name (no co.uk style names here).
//       Return { resolve(name, type, now) }. now is seconds, a number. Return
//         { rcode, answers, fromCache, asked }
//       Rules:
//         1. A cache hit means the answer was stored earlier and has not run out. Give it back
//            with fromCache: true and asked: []. Each answer has ttl = seconds still left.
//         2. A miss asks "root", then the TLD server name, then the authoritative server name.
//            asked lists them in that order. rcode "NOERROR", fromCache: false, answers as followCname made them.
//         3. A TLD that root does not know, or a domain the TLD server does not know, or followCname
//            says "no record": rcode "NXDOMAIN", answers []. Remember it for options.negativeTtl seconds
//            (default 300). asked lists the servers asked so far.
//         4. followCname gives a "loop" or "too many hops": rcode "SERVFAIL", answers [], not cached.
//         5. followCname gives a next name: resolve it from the start (root again) and put its answers
//            after the CNAMEs. asked gets those servers too. rcode is the rcode of that second lookup.
//            (More than 8 of these jumps in a row: "SERVFAIL".)
//         6. Remember a NOERROR answer. It runs out when its shortest TTL runs out.
//            At exactly that second it is gone (a hit needs time left over 0).
//         7. Keep the keys apart: the same name with type A and type AAAA are two lookups.
//
//   earliestSafeMove(lowerTtlAt, oldTtl)
//       You lower a record's TTL at the time lowerTtlAt (seconds). Caches may still hold the old TTL.
//       Return the earliest time when no cache can hold the old answer: lowerTtlAt + oldTtl.
//       Throw an Error if a value is not a finite number or oldTtl is below 0.
//
//   pickWeighted(records, roll)
//       DNS load balancing by weights. records: [{ value, weight, healthy }].
//       weight defaults to 1. healthy defaults to true. roll is a number from 0 up to (not including) 1.
//       Ignore records with healthy false or weight 0. Of the rest, split 0..1 in parts by weight,
//       in list order, and return the value whose part holds roll. Weights 3 and 1: rolls under 0.75 give the first.
//       No record left: return null. A roll outside 0..<1: throw an Error.
//       A weight that is not a number, or is below 0: throw an Error.
//
//   recordTypeFor(target, options)
//       Which record type points a name at this target? options: { apex: true or false } (default false).
//         "93.184.216.34" is an IPv4 address: "A". (four numbers 0 to 255. Four numbers where one is
//         over 255: throw an Error("bad IPv4 address").)
//         "2606:4700::1" is an IPv6 address (has a colon, and only hex digits, colons and dots): "AAAA".
//         Any other text is a name: "CNAME", but at the apex a CNAME is not allowed, so "ALIAS"
//         (a provider feature such as Route 53 alias or Cloudflare CNAME flattening).
//       Empty or not text: throw an Error("target must be text").

const MAX_HOPS = 8;

function lookupRecord(zone, name, type) {
  // TODO
}

function followCname(zone, name, type) {
  // TODO
}

function wildcardLookup(zone, host, type) {
  // TODO
}

function validateZone(zone, origin) {
  // TODO
}

function createResolver(world, options = {}) {
  // TODO
}

function earliestSafeMove(lowerTtlAt, oldTtl) {
  // TODO
}

function pickWeighted(records, roll) {
  // TODO
}

function recordTypeFor(target, options = {}) {
  // TODO
}

module.exports = { lookupRecord, followCname, wildcardLookup, validateZone, createResolver, earliestSafeMove, pickWeighted, recordTypeFor };
