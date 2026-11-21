// Lesson 17: VPC networking basics. Write the ten pieces below, then run:
//   node --test learn/devops-cloud/practice/17-vpc-networking-basics.test.js
//
// This is a tiny model of how an AWS VPC decides things. It is plain JavaScript and talks to no cloud.
// The two helpers at the top (ipToInt and parseCidr) are already written for you.
//
// A route table is a list of routes. A route is { dest, target }:
//   { dest: "10.0.0.0/16", target: "local" }    inside the VPC
//   { dest: "0.0.0.0/0",   target: "igw-1" }    everything else goes to an internet gateway
//   { dest: "0.0.0.0/0",   target: "nat-1" }    everything else goes to a NAT gateway
//
//   cidrSize(cidr)
//       How many addresses are in the block. "10.0.1.0/24" -> 256. "10.0.0.0/16" -> 65536.
//       (Use parseCidr. It throws an Error for bad text.)
//
//   usableInSubnet(cidr)
//       How many addresses you can use in an AWS subnet: the size minus 5 (AWS keeps 5).
//       A subnet must be between /16 and /28. Throw an Error for any other size.
//
//   cidrContains(cidr, ip)
//       true when the address is inside the block. Both ends of the block count.
//
//   pickRoute(routes, destIp)
//       The target of the route that sends this address. Of all routes whose dest contains the
//       address, the MOST SPECIFIC one wins: the one with the biggest number after the slash.
//       The order of the list does not matter. Return null when no route matches.
//
//   isPublicSubnet(routes)
//       true when the route table has a route whose target starts with "igw-" (an internet gateway).
//       A route to a NAT gateway does not count.
//
//   sgAllowsInbound(rules, packet)
//       Security group check for a packet coming in. A rule is { protocol, port, source }.
//       The source is a CIDR block ("0.0.0.0/0") or a group id that starts with "sg-".
//       A packet is { protocol, port, srcIp, srcGroups } (srcGroups may be missing).
//       Allowed when ANY rule has the same protocol and port AND the source fits:
//         a CIDR source fits when it contains srcIp,
//         a group source fits when srcGroups contains that group id.
//       Security groups only have allow rules. With no rules, nothing gets in.
//
//   naclAllows(rules, packet)
//       Network ACL check. A rule is { number, action, protocol, portFrom, portTo, cidr }.
//       action is "allow" or "deny". protocol is "tcp", "udp" or "all". A packet is { protocol, port, ip }.
//       Look at the rules from the LOWEST number up. The first rule that matches decides:
//       return true for "allow" and false for "deny". A rule matches when the protocol fits,
//       the port is between portFrom and portTo (both ends count) and cidr contains ip.
//       When no rule matches, return false. Never change the list you are given.
//
//   roundTrip(firewall, request)
//       Does the request get in, and can the answer get out?
//       firewall is { type: "sg" or "nacl", inbound, outbound }.
//       request is { protocol, port, srcIp, srcPort, srcGroups } (srcPort is the client's own port).
//       Return { requestOk, replyOk }.
//         "sg" is stateful: requestOk is sgAllowsInbound(inbound, request).
//              The answer is allowed when the request was allowed. The outbound rules are not asked.
//         "nacl" is stateless: requestOk is naclAllows(inbound, { protocol, port, ip: srcIp }).
//              The answer is a new packet. It must pass naclAllows(outbound, { protocol, port: srcPort, ip: srcIp }).
//              There is no answer when the request was refused, so replyOk is false then.
//
//   internetAccess({ routes, hasPublicIp, natSubnetRoutes })
//       What a server in a subnet can do with the internet. Return "two-way", "outbound-only" or "none".
//       Look up the route for 8.8.8.8 with pickRoute.
//         no route, or "local"             -> "none"
//         an internet gateway ("igw-...")  -> "two-way" with a public address, "none" without one
//         a NAT gateway ("nat-...")        -> "outbound-only" when the subnet that holds the NAT gateway
//                                            is public (natSubnetRoutes is ITS route table), else "none"
//
//   natCost({ hours, gb, perHour, perGb })
//       The NAT gateway bill: hours * perHour + gb * perGb, rounded to whole cents (2 decimals).

// ---- Helpers that are given to you (they are already written) ----

// "10.0.1.20" -> 167772436. Throws an Error when the text is not an IPv4 address.
function ipToInt(ip) {
  const parts = String(ip).split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) {
    throw new Error("bad IP address: " + ip);
  }
  return parts.reduce((total, p) => total * 256 + Number(p), 0);
}

// "10.0.1.0/24" -> { base, prefix, size, last }. base is the first address as a number.
// A block like 10.0.1.18/24 is cleaned up to 10.0.1.0/24. Throws an Error for bad text.
function parseCidr(cidr) {
  const [ip, bits, extra] = String(cidr).split("/");
  if (bits === undefined || extra !== undefined || !/^\d{1,2}$/.test(bits) || Number(bits) > 32) {
    throw new Error("bad CIDR block: " + cidr);
  }
  const prefix = Number(bits);
  const size = 2 ** (32 - prefix);
  const base = Math.floor(ipToInt(ip) / size) * size;
  return { base, prefix, size, last: base + size - 1 };
}

// ---- The ten pieces you write ----

function cidrSize(cidr) {
  // TODO
}

function usableInSubnet(cidr) {
  // TODO
}

function cidrContains(cidr, ip) {
  // TODO
}

function pickRoute(routes, destIp) {
  // TODO
}

function isPublicSubnet(routes) {
  // TODO
}

function sgAllowsInbound(rules, packet) {
  // TODO
}

function naclAllows(rules, packet) {
  // TODO
}

function roundTrip(firewall, request) {
  // TODO
}

function internetAccess({ routes, hasPublicIp, natSubnetRoutes }) {
  // TODO
}

function natCost({ hours, gb, perHour, perGb }) {
  // TODO
}

module.exports = { cidrSize, usableInSubnet, cidrContains, pickRoute, isPublicSubnet, sgAllowsInbound, naclAllows, roundTrip, internetAccess, natCost };
