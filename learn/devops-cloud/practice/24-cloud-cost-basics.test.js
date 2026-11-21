const test = require("node:test");
const assert = require("node:assert");
const {
  estimateBill, biggestLine, breakEvenShare, cheaperOption, rightSize,
  findWaste, forecastMonth, firstAlertDay, costByTag,
} = require("./24-cloud-cost-basics");

// Example prices in US dollars, US East (N. Virginia), read from the AWS price list on 2026-11-19. They change.
const PRICES = {
  server: { "t3.small": 0.0208, "t3.micro": 0.0104, "t3.micro 1yr plan": 0.0065 },
  db: { "db.t4g.small": 0.032 },
  dbStoragePerGb: 0.115,
  lbPerHour: 0.0225, lcuPerHour: 0.008,
  natPerHour: 0.045, natPerGb: 0.045,
  egressPerGb: 0.09, egressFreeGb: 100,
  diskPerGb: 0.08,
  logIngestPerGb: 0.5, logStoragePerGb: 0.03,
};
const USAGE = {
  hours: 730, servers: 2, serverType: "t3.small", dbType: "db.t4g.small", dbStorageGb: 50,
  loadBalancers: 1, lcu: 1.2, natGateways: 1, natGb: 200, egressGb: 300, diskGb: 40, unattachedDiskGb: 100,
  logIngestGb: 40, logStoredGb: 100,
};
const same = (value) => JSON.parse(JSON.stringify(value));
const line = (bill, name) => bill.lines.find((l) => l.name === name).cost;

// ---------- estimateBill ----------

test("estimateBill: the example app costs 176.96 a month", () => {
  const bill = estimateBill(same(USAGE), same(PRICES));
  assert.deepStrictEqual(bill.lines, [
    { name: "compute", cost: 30.37 },
    { name: "database", cost: 29.11 },
    { name: "load balancer", cost: 23.43 },
    { name: "nat gateway", cost: 41.85 },
    { name: "data out", cost: 18 },
    { name: "disk", cost: 11.2 },
    { name: "logs", cost: 23 },
  ]);
  assert.strictEqual(bill.total, 176.96);
});

test("estimateBill: nothing used costs nothing, and the seven lines are still there", () => {
  const bill = estimateBill({}, same(PRICES));
  assert.deepStrictEqual(bill.lines.map((l) => l.name), ["compute", "database", "load balancer", "nat gateway", "data out", "disk", "logs"]);
  assert.strictEqual(bill.total, 0);
  assert.ok(bill.lines.every((l) => l.cost === 0));
});

test("estimateBill: servers cost price x hours x count (2 x 0.0208 x 730)", () => {
  const bill = estimateBill({ servers: 2, serverType: "t3.small" }, same(PRICES));
  assert.strictEqual(line(bill, "compute"), 30.37);
  assert.strictEqual(estimateBill({ servers: 1, serverType: "t3.micro", hours: 100 }, same(PRICES)).total, 1.04);
});

test("estimateBill: the database is hours plus storage", () => {
  const bill = estimateBill({ dbType: "db.t4g.small", dbStorageGb: 50 }, same(PRICES));
  assert.strictEqual(line(bill, "database"), 29.11);
  assert.strictEqual(line(estimateBill({ dbType: "db.t4g.small" }, same(PRICES)), "database"), 23.36);
});

test("estimateBill: the load balancer costs its hours even when nobody uses it", () => {
  const idle = estimateBill({ loadBalancers: 1 }, same(PRICES));
  assert.strictEqual(line(idle, "load balancer"), 16.43);   // 0.0225 x 730 = 16.425
  assert.strictEqual(line(estimateBill({ loadBalancers: 1, lcu: 1.2 }, same(PRICES)), "load balancer"), 23.43);
  assert.strictEqual(line(estimateBill({ loadBalancers: 2, lcu: 0 }, same(PRICES)), "load balancer"), 32.85);
});

test("estimateBill: a NAT gateway costs its hours even with zero traffic, then every GB on top", () => {
  assert.strictEqual(line(estimateBill({ natGateways: 1, natGb: 0 }, same(PRICES)), "nat gateway"), 32.85);
  assert.strictEqual(line(estimateBill({ natGateways: 1, natGb: 200 }, same(PRICES)), "nat gateway"), 41.85);
  assert.strictEqual(line(estimateBill({ natGateways: 2, natGb: 0 }, same(PRICES)), "nat gateway"), 65.7);
});

test("estimateBill: the first 100 GB out are free, the rest cost 0.09 a GB", () => {
  assert.strictEqual(line(estimateBill({ egressGb: 300 }, same(PRICES)), "data out"), 18);
  assert.strictEqual(line(estimateBill({ egressGb: 101 }, same(PRICES)), "data out"), 0.09);
  assert.strictEqual(line(estimateBill({ egressGb: 100 }, same(PRICES)), "data out"), 0);
  assert.strictEqual(line(estimateBill({ egressGb: 40 }, same(PRICES)), "data out"), 0);
});

test("estimateBill: a disk that is not attached still costs money", () => {
  assert.strictEqual(line(estimateBill({ diskGb: 40 }, same(PRICES)), "disk"), 3.2);
  assert.strictEqual(line(estimateBill({ diskGb: 40, unattachedDiskGb: 100 }, same(PRICES)), "disk"), 11.2);
  assert.strictEqual(line(estimateBill({ unattachedDiskGb: 100 }, same(PRICES)), "disk"), 8);
});

test("estimateBill: logs cost for what goes in AND for what you keep", () => {
  assert.strictEqual(line(estimateBill({ logIngestGb: 40, logStoredGb: 100 }, same(PRICES)), "logs"), 23);
  assert.strictEqual(line(estimateBill({ logIngestGb: 40 }, same(PRICES)), "logs"), 20);
  assert.strictEqual(line(estimateBill({ logStoredGb: 100 }, same(PRICES)), "logs"), 3);
});

test("estimateBill: the total is the sum of the rounded lines", () => {
  const bill = estimateBill({ ...same(USAGE), lcu: 1.7, natGb: 333 }, same(PRICES));
  const sum = Math.round(bill.lines.reduce((s, l) => s + l.cost, 0) * 100) / 100;
  assert.strictEqual(bill.total, sum);
});

test("estimateBill: an unknown server or database type is an error, not a quiet zero", () => {
  assert.strictEqual(estimateBill({ servers: 1, serverType: "t3.small" }, same(PRICES)).total, 15.18);
  assert.throws(() => estimateBill({ servers: 1, serverType: "t3.huge" }, same(PRICES)), /unknown server type: t3.huge/);
  assert.throws(() => estimateBill({ dbType: "db.nope" }, same(PRICES)), /unknown database type: db.nope/);
});

test("estimateBill: does not change the objects it was given", () => {
  assert.strictEqual(estimateBill(same(USAGE), same(PRICES)).total, 176.96);
  const usage = same(USAGE);
  const prices = same(PRICES);
  estimateBill(usage, prices);
  assert.deepStrictEqual(usage, USAGE);
  assert.deepStrictEqual(prices, PRICES);
});

test("estimateBill: each saving from the lesson shows up in the right line", () => {
  const start = estimateBill(same(USAGE), same(PRICES));
  const noOldDisk = estimateBill({ ...USAGE, unattachedDiskGb: 0 }, same(PRICES));
  assert.strictEqual(Math.round((start.total - noOldDisk.total) * 100) / 100, 8);
  const endpoint = estimateBill({ ...USAGE, natGb: 80 }, same(PRICES));
  assert.strictEqual(line(endpoint, "nat gateway"), 36.45);
  const small = estimateBill({ ...USAGE, serverType: "t3.micro" }, same(PRICES));
  assert.strictEqual(line(small, "compute"), 15.18);
  const plan = estimateBill({ ...USAGE, serverType: "t3.micro 1yr plan" }, same(PRICES));
  assert.strictEqual(line(plan, "compute"), 9.49);
});

// ---------- biggestLine ----------

test("biggestLine: the NAT gateway is the biggest line of the example bill", () => {
  assert.strictEqual(biggestLine(estimateBill(same(USAGE), same(PRICES))), "nat gateway");
});

test("biggestLine: picks the biggest cost, and the first one on a tie", () => {
  assert.strictEqual(biggestLine({ lines: [{ name: "a", cost: 1 }, { name: "b", cost: 5 }, { name: "c", cost: 3 }] }), "b");
  assert.strictEqual(biggestLine({ lines: [{ name: "a", cost: 5 }, { name: "b", cost: 5 }] }), "a");
});

test("biggestLine: no lines gives null", () => {
  assert.strictEqual(biggestLine({ lines: [{ name: "a", cost: 1 }] }), "a");
  assert.strictEqual(biggestLine({ lines: [] }), null);
});

// ---------- breakEvenShare and cheaperOption ----------

test("breakEvenShare: a plan that costs 62.5 percent of on demand pays off above 62.5 percent use", () => {
  assert.strictEqual(breakEvenShare(0.0208, 0.013), 0.625);
  assert.strictEqual(breakEvenShare(0.0208, 0.009), 0.4327);
  assert.strictEqual(breakEvenShare(1, 0.5), 0.5);
});

test("breakEvenShare: a plan that costs the same or more never pays off (share 1 or more)", () => {
  assert.strictEqual(breakEvenShare(1, 1), 1);
  assert.strictEqual(breakEvenShare(1, 1.25), 1.25);
});

test("breakEvenShare: bad prices are errors", () => {
  assert.strictEqual(breakEvenShare(2, 1), 0.5);
  assert.throws(() => breakEvenShare(0, 1), /onDemandPerHour/);
  assert.throws(() => breakEvenShare(-1, 1), /onDemandPerHour/);
  assert.throws(() => breakEvenShare(1, -1), /committedPerHour/);
});

test("cheaperOption: a server that runs all month is cheaper with a plan", () => {
  assert.deepStrictEqual(cheaperOption(730, 730, 0.0208, 0.013), { option: "commit", onDemandCost: 15.18, commitCost: 9.49 });
});

test("cheaperOption: a server that runs half the month is cheaper on demand, because the plan bills every hour", () => {
  assert.deepStrictEqual(cheaperOption(365, 730, 0.0208, 0.013), { option: "on demand", onDemandCost: 7.59, commitCost: 9.49 });
});

test("cheaperOption: at exactly the break even share it is a tie, and a tie stays on demand", () => {
  const r = cheaperOption(500, 800, 0.02, 0.0125);   // 500 / 800 = 0.625 = 0.0125 / 0.02
  assert.strictEqual(r.option, "on demand");
  assert.strictEqual(r.onDemandCost, 10);
  assert.strictEqual(r.commitCost, 10);
  assert.strictEqual(cheaperOption(501, 800, 0.02, 0.0125).option, "commit");
});

test("cheaperOption: zero hours used costs nothing on demand, so on demand wins", () => {
  assert.deepStrictEqual(cheaperOption(0, 730, 0.0208, 0.013), { option: "on demand", onDemandCost: 0, commitCost: 9.49 });
  assert.throws(() => cheaperOption(731, 730, 0.0208, 0.013), /hoursUsed/);
  assert.throws(() => cheaperOption(-1, 730, 0.0208, 0.013), /hoursUsed/);
});

// ---------- rightSize ----------

const SIZES = ["micro", "small", "medium", "large"];

test("rightSize: a server that never goes above 15 percent moves one size down", () => {
  assert.strictEqual(rightSize(SIZES, "small", 15), "micro");
  assert.strictEqual(rightSize(SIZES, "large", 40), "medium");
});

test("rightSize: a server that is almost full moves one size up", () => {
  assert.strictEqual(rightSize(SIZES, "small", 90), "medium");
  assert.strictEqual(rightSize(SIZES, "small", 85), "medium");
});

test("rightSize: a server in the middle stays where it is", () => {
  assert.strictEqual(rightSize(SIZES, "small", 41), "small");
  assert.strictEqual(rightSize(SIZES, "small", 84), "small");
  assert.strictEqual(rightSize(SIZES, "medium", 60), "medium");
});

test("rightSize: it never goes below the smallest or above the biggest size", () => {
  assert.strictEqual(rightSize(SIZES, "small", 15), "micro");
  assert.strictEqual(rightSize(SIZES, "micro", 5), "micro");
  assert.strictEqual(rightSize(SIZES, "large", 99), "large");
});

test("rightSize: an unknown size is an error", () => {
  assert.strictEqual(rightSize(SIZES, "medium", 20), "small");
  assert.throws(() => rightSize(SIZES, "huge", 20), /unknown size: huge/);
});

// ---------- findWaste ----------

const RESOURCES = [
  { id: "vol-2", type: "volume", attached: false },
  { id: "vol-1", type: "volume", attached: true },
  { id: "lb-old", type: "load-balancer", requestsLast7Days: 0 },
  { id: "lb-live", type: "load-balancer", requestsLast7Days: 5200 },
  { id: "ip-1", type: "public-ip", inUse: false },
  { id: "ip-2", type: "public-ip", inUse: true },
  { id: "logs-app", type: "log-group", retentionDays: null },
  { id: "logs-db", type: "log-group", retentionDays: 14 },
];

test("findWaste: finds the four kinds of waste, sorted by id", () => {
  assert.deepStrictEqual(findWaste(same(RESOURCES)), [
    { id: "ip-1", reason: "idle public address" },
    { id: "lb-old", reason: "no traffic" },
    { id: "logs-app", reason: "logs never expire" },
    { id: "vol-2", reason: "unattached volume" },
  ]);
});

test("findWaste: a clean list gives an empty list", () => {
  assert.deepStrictEqual(findWaste([{ id: "vol-1", type: "volume", attached: true }, { id: "logs-db", type: "log-group", retentionDays: 14 }]), []);
  assert.deepStrictEqual(findWaste([]), []);
});

test("findWaste: a missing field is not waste, only a clear false, 0 or null is", () => {
  assert.deepStrictEqual(findWaste([{ id: "v", type: "volume" }, { id: "l", type: "load-balancer" }, { id: "i", type: "public-ip" }]), []);
  assert.deepStrictEqual(findWaste([{ id: "g", type: "log-group" }]), [{ id: "g", reason: "logs never expire" }]);
});

test("findWaste: a load balancer with a little traffic is not waste, only one with none", () => {
  assert.deepStrictEqual(findWaste([{ id: "lb-a", type: "load-balancer", requestsLast7Days: 0 }]), [{ id: "lb-a", reason: "no traffic" }]);
  assert.deepStrictEqual(findWaste([{ id: "lb-b", type: "load-balancer", requestsLast7Days: 12 }]), []);
});

test("findWaste: an unknown type is left alone and the input is not changed", () => {
  assert.deepStrictEqual(findWaste([{ id: "x", type: "volume", attached: false }, { id: "y", type: "database" }]), [{ id: "x", reason: "unattached volume" }]);
  const list = same(RESOURCES);
  findWaste(list);
  assert.deepStrictEqual(list, RESOURCES);
});

// ---------- forecastMonth and firstAlertDay ----------

const DAILY = [...Array(9).fill(5.9), 13.9, 13.9];   // 9 normal days, then debug logging is switched on

test("forecastMonth: the average so far, times the days in the month", () => {
  assert.strictEqual(forecastMonth([10, 10, 10], 30), 300);
  assert.strictEqual(forecastMonth([5.9, 5.9, 5.9], 30), 177);
  assert.strictEqual(forecastMonth(DAILY, 30), 220.64);
});

test("forecastMonth: no days yet means 0", () => {
  assert.strictEqual(forecastMonth([2], 30), 60);
  assert.strictEqual(forecastMonth([], 30), 0);
});

test("firstAlertDay: the first day the total reaches the percent of the budget, counting from day 1", () => {
  const spend = [...Array(9).fill(5.9), ...Array(21).fill(13.9)];
  assert.strictEqual(firstAlertDay(spend, 200, 80), 17);
  assert.strictEqual(firstAlertDay([50, 50, 50, 50], 200, 100), 4);
  assert.strictEqual(firstAlertDay([100, 1], 200, 50), 1);
});

test("firstAlertDay: reaching the limit exactly counts, and never reaching it gives null", () => {
  assert.strictEqual(firstAlertDay([40, 40, 40], 150, 80), 3);
  assert.strictEqual(firstAlertDay([10, 10, 10], 200, 80), null);
  assert.strictEqual(firstAlertDay([], 200, 80), null);
});

// ---------- costByTag ----------

const ITEMS = [
  { name: "web", cost: 30.37, tags: { app: "shop", team: "web" } },
  { name: "db", cost: 29.11, tags: { app: "shop" } },
  { name: "old-volume", cost: 8, tags: {} },
  { name: "blog", cost: 12.5, tags: { app: "blog" } },
  { name: "mystery", cost: 4.2 },
];

test("costByTag: adds up the cost of each value of the tag", () => {
  assert.deepStrictEqual(costByTag(same(ITEMS), "app"), { shop: 59.48, blog: 12.5, "(untagged)": 12.2 });
});

test("costByTag: a thing without the tag, or without any tags, goes under (untagged)", () => {
  assert.deepStrictEqual(costByTag(same(ITEMS), "team"), { web: 30.37, "(untagged)": 53.81 });
  assert.deepStrictEqual(costByTag([{ name: "x", cost: 3 }], "app"), { "(untagged)": 3 });
});

test("costByTag: no items gives an empty object, and the input is not changed", () => {
  assert.deepStrictEqual(costByTag([{ name: "x", cost: 1, tags: { app: "a" } }], "app"), { a: 1 });
  assert.deepStrictEqual(costByTag([], "app"), {});
  const items = same(ITEMS);
  costByTag(items, "app");
  assert.deepStrictEqual(items, ITEMS);
});
