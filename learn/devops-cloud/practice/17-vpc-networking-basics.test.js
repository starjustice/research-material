const test = require("node:test");
const assert = require("node:assert");
const {
  cidrSize, usableInSubnet, cidrContains, pickRoute, isPublicSubnet,
  sgAllowsInbound, naclAllows, roundTrip, internetAccess, natCost,
} = require("./17-vpc-networking-basics");

const same = (value) => JSON.parse(JSON.stringify(value));

const publicRoutes = [
  { dest: "10.0.0.0/16", target: "local" },
  { dest: "0.0.0.0/0", target: "igw-1" },
];
const natRoutes = [
  { dest: "10.0.0.0/16", target: "local" },
  { dest: "0.0.0.0/0", target: "nat-1" },
];
const isolatedRoutes = [{ dest: "10.0.0.0/16", target: "local" }];

// ---------- CIDR ----------

test("cidrSize: /16 is 65536 and /24 is 256 and /28 is 16", () => {
  assert.strictEqual(cidrSize("10.0.0.0/16"), 65536);
  assert.strictEqual(cidrSize("10.0.1.0/24"), 256);
  assert.strictEqual(cidrSize("10.0.1.0/28"), 16);
});

test("cidrSize: /32 is one address and /0 is every address", () => {
  assert.strictEqual(cidrSize("203.0.113.1/32"), 1);
  assert.strictEqual(cidrSize("0.0.0.0/0"), 4294967296);
});

test("cidrSize: a bigger number after the slash is a smaller block", () => {
  assert.ok(cidrSize("10.0.0.0/20") < cidrSize("10.0.0.0/19"));
  assert.strictEqual(cidrSize("10.0.0.0/20") * 2, cidrSize("10.0.0.0/19"));
});

test("cidrSize: bad text throws an Error", () => {
  assert.throws(() => cidrSize("10.0.0.0"), Error);
  assert.throws(() => cidrSize("10.0.0.0/33"), Error);
  assert.throws(() => cidrSize("10.0.0/24"), Error);
});

test("usableInSubnet: AWS keeps 5 addresses, so a /24 gives 251", () => {
  assert.strictEqual(usableInSubnet("10.0.1.0/24"), 251);
});

test("usableInSubnet: a /28 gives 11 and a /16 gives 65531", () => {
  assert.strictEqual(usableInSubnet("10.0.1.0/28"), 11);
  assert.strictEqual(usableInSubnet("10.0.0.0/16"), 65531);
});

test("usableInSubnet: only /16 to /28 is allowed for a subnet", () => {
  assert.throws(() => usableInSubnet("10.0.1.0/29"), Error);
  assert.throws(() => usableInSubnet("10.0.0.0/15"), Error);
  assert.throws(() => usableInSubnet("10.0.1.0/32"), Error);
});

test("cidrContains: addresses inside and outside a /24", () => {
  assert.strictEqual(cidrContains("10.0.1.0/24", "10.0.1.0"), true);
  assert.strictEqual(cidrContains("10.0.1.0/24", "10.0.1.255"), true);
  assert.strictEqual(cidrContains("10.0.1.0/24", "10.0.2.0"), false);
  assert.strictEqual(cidrContains("10.0.1.0/24", "10.0.0.255"), false);
});

test("cidrContains: the whole VPC contains its subnets and 0.0.0.0/0 contains everything", () => {
  assert.strictEqual(cidrContains("10.0.0.0/16", "10.0.21.30"), true);
  assert.strictEqual(cidrContains("10.0.0.0/16", "10.1.0.1"), false);
  assert.strictEqual(cidrContains("0.0.0.0/0", "198.51.100.7"), true);
});

test("cidrContains: a /32 holds exactly one address", () => {
  assert.strictEqual(cidrContains("203.0.113.1/32", "203.0.113.1"), true);
  assert.strictEqual(cidrContains("203.0.113.1/32", "203.0.113.2"), false);
});

test("cidrContains: a block that is not clean still means its clean form", () => {
  assert.strictEqual(cidrContains("10.0.1.18/24", "10.0.1.200"), true);
  assert.strictEqual(cidrContains("10.0.1.18/24", "10.0.2.1"), false);
});

// ---------- routes: what makes a subnet public ----------

test("pickRoute: an address inside the VPC takes the local route", () => {
  assert.strictEqual(pickRoute(publicRoutes, "10.0.21.30"), "local");
});

test("pickRoute: an address outside the VPC takes the default route", () => {
  assert.strictEqual(pickRoute(publicRoutes, "198.51.100.7"), "igw-1");
  assert.strictEqual(pickRoute(natRoutes, "198.51.100.7"), "nat-1");
});

test("pickRoute: no matching route gives null", () => {
  assert.strictEqual(pickRoute(isolatedRoutes, "198.51.100.7"), null);
  assert.strictEqual(pickRoute([], "10.0.0.5"), null);
});

test("pickRoute: the most specific route wins, whatever the order of the list", () => {
  const routes = [
    { dest: "0.0.0.0/0", target: "igw-1" },
    { dest: "172.31.0.0/16", target: "pcx-1" },
    { dest: "172.31.5.0/24", target: "pcx-2" },
  ];
  assert.strictEqual(pickRoute(routes, "172.31.5.9"), "pcx-2");
  assert.strictEqual(pickRoute(routes, "172.31.9.9"), "pcx-1");
  assert.strictEqual(pickRoute(routes, "8.8.8.8"), "igw-1");
  assert.strictEqual(pickRoute([...routes].reverse(), "172.31.5.9"), "pcx-2");
});

test("isPublicSubnet: a route to an internet gateway makes it public", () => {
  assert.strictEqual(isPublicSubnet(publicRoutes), true);
});

test("isPublicSubnet: a route to a NAT gateway does not", () => {
  assert.strictEqual(isPublicSubnet(natRoutes), false);
});

test("isPublicSubnet: a table with only the local route is private", () => {
  assert.strictEqual(isPublicSubnet(isolatedRoutes), false);
  assert.strictEqual(isPublicSubnet([]), false);
});

test("isPublicSubnet: a route to the gateway for only some addresses still counts", () => {
  assert.strictEqual(isPublicSubnet([{ dest: "10.0.0.0/16", target: "local" }, { dest: "203.0.113.0/24", target: "igw-1" }]), true);
});

// ---------- security groups ----------

const albRules = [{ protocol: "tcp", port: 443, source: "0.0.0.0/0" }];
const appRules = [{ protocol: "tcp", port: 3000, source: "sg-alb" }];
const dbRules = [{ protocol: "tcp", port: 5432, source: "sg-app" }];

test("sgAllowsInbound: with no rules nothing gets in", () => {
  assert.strictEqual(sgAllowsInbound([], { protocol: "tcp", port: 443, srcIp: "198.51.100.7", srcGroups: [] }), false);
});

test("sgAllowsInbound: the load balancer group lets the internet in on 443", () => {
  assert.strictEqual(sgAllowsInbound(albRules, { protocol: "tcp", port: 443, srcIp: "198.51.100.7", srcGroups: [] }), true);
});

test("sgAllowsInbound: the right address but the wrong port is refused", () => {
  assert.strictEqual(sgAllowsInbound(albRules, { protocol: "tcp", port: 22, srcIp: "198.51.100.7", srcGroups: [] }), false);
  assert.strictEqual(sgAllowsInbound(albRules, { protocol: "udp", port: 443, srcIp: "198.51.100.7", srcGroups: [] }), false);
});

test("sgAllowsInbound: a rule with a CIDR source only lets that range in", () => {
  const office = [{ protocol: "tcp", port: 22, source: "203.0.113.0/24" }];
  assert.strictEqual(sgAllowsInbound(office, { protocol: "tcp", port: 22, srcIp: "203.0.113.40", srcGroups: [] }), true);
  assert.strictEqual(sgAllowsInbound(office, { protocol: "tcp", port: 22, srcIp: "198.51.100.7", srcGroups: [] }), false);
});

test("sgAllowsInbound: a rule that names a group lets in members of that group only", () => {
  assert.strictEqual(sgAllowsInbound(appRules, { protocol: "tcp", port: 3000, srcIp: "10.0.1.20", srcGroups: ["sg-alb"] }), true);
  assert.strictEqual(sgAllowsInbound(appRules, { protocol: "tcp", port: 3000, srcIp: "10.0.1.20", srcGroups: ["sg-other"] }), false);
  assert.strictEqual(sgAllowsInbound(appRules, { protocol: "tcp", port: 3000, srcIp: "10.0.1.20", srcGroups: [] }), false);
});

test("sgAllowsInbound: the database group refuses the internet even on the right port", () => {
  assert.strictEqual(sgAllowsInbound(dbRules, { protocol: "tcp", port: 5432, srcIp: "198.51.100.7", srcGroups: [] }), false);
  assert.strictEqual(sgAllowsInbound(dbRules, { protocol: "tcp", port: 5432, srcIp: "10.0.11.15", srcGroups: ["sg-app"] }), true);
});

test("sgAllowsInbound: any one matching rule is enough", () => {
  const rules = [...albRules, { protocol: "tcp", port: 80, source: "0.0.0.0/0" }];
  assert.strictEqual(sgAllowsInbound(rules, { protocol: "tcp", port: 80, srcIp: "198.51.100.7", srcGroups: [] }), true);
});

test("sgAllowsInbound: a packet without srcGroups does not break the check", () => {
  assert.strictEqual(sgAllowsInbound(appRules, { protocol: "tcp", port: 3000, srcIp: "10.0.1.20" }), false);
});

// ---------- network ACLs ----------

const open = (n) => ({ number: n, action: "allow", protocol: "all", portFrom: 0, portTo: 65535, cidr: "0.0.0.0/0" });

test("naclAllows: no rules means deny", () => {
  assert.strictEqual(naclAllows([], { protocol: "tcp", port: 443, ip: "198.51.100.7" }), false);
});

test("naclAllows: an allow rule that matches lets the packet in", () => {
  const rules = [{ number: 100, action: "allow", protocol: "tcp", portFrom: 443, portTo: 443, cidr: "0.0.0.0/0" }];
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 443, ip: "198.51.100.7" }), true);
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 444, ip: "198.51.100.7" }), false);
  assert.strictEqual(naclAllows(rules, { protocol: "udp", port: 443, ip: "198.51.100.7" }), false);
});

test("naclAllows: a deny rule with a lower number beats an allow rule with a higher number", () => {
  const rules = [
    { number: 200, action: "allow", protocol: "all", portFrom: 0, portTo: 65535, cidr: "0.0.0.0/0" },
    { number: 100, action: "deny", protocol: "all", portFrom: 0, portTo: 65535, cidr: "198.51.100.0/24" },
  ];
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 443, ip: "198.51.100.7" }), false);
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 443, ip: "203.0.113.5" }), true);
});

test("naclAllows: the lowest matching number decides, so allow first can beat deny later", () => {
  const rules = [
    { number: 100, action: "allow", protocol: "tcp", portFrom: 443, portTo: 443, cidr: "198.51.100.0/24" },
    { number: 200, action: "deny", protocol: "all", portFrom: 0, portTo: 65535, cidr: "198.51.100.0/24" },
  ];
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 443, ip: "198.51.100.7" }), true);
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 80, ip: "198.51.100.7" }), false);
});

test("naclAllows: a port range includes both ends", () => {
  const rules = [{ number: 100, action: "allow", protocol: "tcp", portFrom: 1024, portTo: 65535, cidr: "0.0.0.0/0" }];
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 1024, ip: "198.51.100.7" }), true);
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 65535, ip: "198.51.100.7" }), true);
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 1023, ip: "198.51.100.7" }), false);
});

test("naclAllows: when no rule matches the packet is denied", () => {
  const rules = [{ number: 100, action: "allow", protocol: "tcp", portFrom: 443, portTo: 443, cidr: "203.0.113.0/24" }];
  assert.strictEqual(naclAllows(rules, { protocol: "tcp", port: 443, ip: "198.51.100.7" }), false);
  assert.strictEqual(naclAllows([open(100)], { protocol: "tcp", port: 5432, ip: "1.2.3.4" }), true);
});

test("naclAllows: does not change the list it was given", () => {
  const rules = [open(300), { number: 100, action: "deny", protocol: "all", portFrom: 0, portTo: 65535, cidr: "10.0.0.0/8" }];
  const before = same(rules);
  naclAllows(rules, { protocol: "tcp", port: 1, ip: "10.1.1.1" });
  assert.deepStrictEqual(rules, before);
});

// ---------- stateful or stateless: the answer coming back ----------

const request = { protocol: "tcp", port: 443, srcIp: "198.51.100.7", srcPort: 50000, srcGroups: [] };

test("roundTrip: a security group lets the answer out with no outbound rule at all", () => {
  const sg = { type: "sg", inbound: albRules, outbound: [] };
  assert.deepStrictEqual(roundTrip(sg, request), { requestOk: true, replyOk: true });
});

test("roundTrip: a security group that refuses the request has no answer to let out", () => {
  const sg = { type: "sg", inbound: appRules, outbound: [] };
  assert.deepStrictEqual(roundTrip(sg, request), { requestOk: false, replyOk: false });
});

test("roundTrip: a network ACL that allows 443 in but nothing out blocks the answer", () => {
  const nacl = { type: "nacl", inbound: [{ number: 100, action: "allow", protocol: "tcp", portFrom: 443, portTo: 443, cidr: "0.0.0.0/0" }], outbound: [] };
  assert.deepStrictEqual(roundTrip(nacl, request), { requestOk: true, replyOk: false });
});

test("roundTrip: a network ACL that allows only port 443 out still blocks the answer", () => {
  const rule443 = { number: 100, action: "allow", protocol: "tcp", portFrom: 443, portTo: 443, cidr: "0.0.0.0/0" };
  const nacl = { type: "nacl", inbound: [rule443], outbound: [rule443] };
  assert.deepStrictEqual(roundTrip(nacl, request), { requestOk: true, replyOk: false });
});

test("roundTrip: a network ACL needs an outbound rule for the high answer port", () => {
  const nacl = {
    type: "nacl",
    inbound: [{ number: 100, action: "allow", protocol: "tcp", portFrom: 443, portTo: 443, cidr: "0.0.0.0/0" }],
    outbound: [{ number: 100, action: "allow", protocol: "tcp", portFrom: 1024, portTo: 65535, cidr: "0.0.0.0/0" }],
  };
  assert.deepStrictEqual(roundTrip(nacl, request), { requestOk: true, replyOk: true });
});

test("roundTrip: a network ACL that refuses the request has no answer to let out", () => {
  const nacl = { type: "nacl", inbound: [], outbound: [open(100)] };
  assert.deepStrictEqual(roundTrip(nacl, request), { requestOk: false, replyOk: false });
});

test("roundTrip: the outbound rule is checked against the client's address", () => {
  const nacl = {
    type: "nacl",
    inbound: [open(100)],
    outbound: [{ number: 100, action: "allow", protocol: "tcp", portFrom: 1024, portTo: 65535, cidr: "203.0.113.0/24" }],
  };
  assert.deepStrictEqual(roundTrip(nacl, request), { requestOk: true, replyOk: false });
});

test("roundTrip: an outbound rule for the client's own range lets the answer out", () => {
  const nacl = {
    type: "nacl",
    inbound: [open(100)],
    outbound: [{ number: 100, action: "allow", protocol: "tcp", portFrom: 1024, portTo: 65535, cidr: "198.51.100.0/24" }],
  };
  assert.deepStrictEqual(roundTrip(nacl, request), { requestOk: true, replyOk: true });
});

// ---------- internet access from a subnet ----------

test("internetAccess: public subnet with a public address is two-way", () => {
  assert.strictEqual(internetAccess({ routes: publicRoutes, hasPublicIp: true }), "two-way");
});

test("internetAccess: public subnet without a public address has none", () => {
  assert.strictEqual(internetAccess({ routes: publicRoutes, hasPublicIp: false }), "none");
});

test("internetAccess: a public address does not help a private subnet", () => {
  assert.strictEqual(internetAccess({ routes: isolatedRoutes, hasPublicIp: true }), "none");
  assert.strictEqual(internetAccess({ routes: natRoutes, hasPublicIp: true, natSubnetRoutes: publicRoutes }), "outbound-only");
});

test("internetAccess: private subnet with a NAT gateway in a public subnet is outbound only", () => {
  assert.strictEqual(internetAccess({ routes: natRoutes, hasPublicIp: false, natSubnetRoutes: publicRoutes }), "outbound-only");
});

test("internetAccess: a NAT gateway that sits in a private subnet gives nothing", () => {
  assert.strictEqual(internetAccess({ routes: natRoutes, hasPublicIp: false, natSubnetRoutes: natRoutes }), "none");
  assert.strictEqual(internetAccess({ routes: natRoutes, hasPublicIp: false, natSubnetRoutes: isolatedRoutes }), "none");
  assert.strictEqual(internetAccess({ routes: natRoutes, hasPublicIp: false }), "none");
});

test("internetAccess: only the local route means none", () => {
  assert.strictEqual(internetAccess({ routes: isolatedRoutes, hasPublicIp: false }), "none");
});

// ---------- the NAT bill ----------

test("natCost: one gateway for a month with no traffic", () => {
  assert.strictEqual(natCost({ hours: 730, gb: 0, perHour: 0.045, perGb: 0.045 }), 32.85);
});

test("natCost: data adds to the hours", () => {
  assert.strictEqual(natCost({ hours: 730, gb: 100, perHour: 0.045, perGb: 0.045 }), 37.35);
  assert.strictEqual(natCost({ hours: 730, gb: 1000, perHour: 0.045, perGb: 0.045 }), 77.85);
});

test("natCost: two gateways, one per zone, cost twice the hours", () => {
  assert.strictEqual(natCost({ hours: 2 * 730, gb: 0, perHour: 0.045, perGb: 0.045 }), 65.7);
});

test("natCost: zero hours and zero data cost nothing", () => {
  assert.strictEqual(natCost({ hours: 0, gb: 0, perHour: 0.045, perGb: 0.045 }), 0);
});

test("natCost: the prices come from the arguments", () => {
  assert.strictEqual(natCost({ hours: 10, gb: 10, perHour: 1, perGb: 2 }), 30);
});

test("natCost: the answer is rounded to whole cents", () => {
  assert.strictEqual(natCost({ hours: 1, gb: 1, perHour: 0.0333, perGb: 0.0333 }), 0.07);
});
