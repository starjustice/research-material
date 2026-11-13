const test = require("node:test");
const assert = require("node:assert");
const { whoManages, yourLayerCount, chooseModel, survives, nearestRegion } = require("./06-cloud-models");

// The seven layers, from the top of the stack to the bottom.
const ALL = ["data", "code", "runtime", "platform", "os", "vm", "building"];
const owners = (model, layers = ALL) => whoManages(layers, model).map((x) => x.owner);

// ---------- whoManages ----------

test("whoManages: on-prem means you look after every layer", () => {
  assert.deepStrictEqual(owners("on-prem"), ["you", "you", "you", "you", "you", "you", "you"]);
});

test("whoManages: IaaS gives the building and the virtual machine to the provider", () => {
  assert.deepStrictEqual(owners("iaas"), ["you", "you", "you", "you", "you", "provider", "provider"]);
});

test("whoManages: PaaS gives everything under your code to the provider", () => {
  assert.deepStrictEqual(owners("paas"), ["you", "you", "provider", "provider", "provider", "provider", "provider"]);
});

test("whoManages: SaaS leaves only your data to you", () => {
  assert.deepStrictEqual(owners("saas"), ["you", "provider", "provider", "provider", "provider", "provider", "provider"]);
});

test("whoManages: a self hosted PaaS on a rented server hands the platform layer to the tool", () => {
  assert.deepStrictEqual(owners("self-hosted-paas"), ["you", "you", "you", "tool", "you", "provider", "provider"]);
});

test("whoManages: each answer has the layer name and the owner", () => {
  assert.deepStrictEqual(whoManages(["os"], "paas"), [{ layer: "os", owner: "provider" }]);
});

test("whoManages: keeps the order of the layers you give, and can take a short list", () => {
  assert.deepStrictEqual(whoManages(["vm", "data"], "iaas"), [
    { layer: "vm", owner: "provider" },
    { layer: "data", owner: "you" },
  ]);
  assert.deepStrictEqual(whoManages([], "iaas"), []);
});

test("whoManages: your data is yours in every model", () => {
  for (const model of ["on-prem", "iaas", "paas", "saas", "self-hosted-paas"]) {
    assert.deepStrictEqual(whoManages(["data"], model), [{ layer: "data", owner: "you" }], model);
  }
});

test("whoManages: an unknown model or layer throws", () => {
  assert.throws(() => whoManages(ALL, "faas"), /unknown model: faas/);
  assert.throws(() => whoManages(["data", "cpu"], "iaas"), /unknown layer: cpu/);
});

test("whoManages does not change the list you give it", () => {
  const layers = ["os", "data"];
  const answer = whoManages(layers, "paas");
  assert.deepStrictEqual(answer, [{ layer: "os", owner: "provider" }, { layer: "data", owner: "you" }]);
  assert.deepStrictEqual(layers, ["os", "data"]);
});

// ---------- yourLayerCount ----------

test("yourLayerCount: how many of the seven layers are yours", () => {
  assert.strictEqual(yourLayerCount(ALL, "on-prem"), 7);
  assert.strictEqual(yourLayerCount(ALL, "iaas"), 5);
  assert.strictEqual(yourLayerCount(ALL, "paas"), 2);
  assert.strictEqual(yourLayerCount(ALL, "saas"), 1);
  assert.strictEqual(yourLayerCount(ALL, "self-hosted-paas"), 4);
});

test("yourLayerCount: the climb never adds work", () => {
  const counts = ["on-prem", "iaas", "paas", "saas"].map((m) => yourLayerCount(ALL, m));
  assert.deepStrictEqual(counts, [7, 5, 2, 1]);
  assert.deepStrictEqual(counts, [...counts].sort((a, b) => b - a));
});

test("yourLayerCount: counts only the layers you ask about, and can be zero", () => {
  assert.strictEqual(yourLayerCount(["vm", "building"], "iaas"), 0);
  assert.strictEqual(yourLayerCount(["os", "data"], "iaas"), 2);
  assert.strictEqual(yourLayerCount(["platform"], "self-hosted-paas"), 0);
});

// ---------- chooseModel ----------

test("chooseModel: a team that writes code and needs nothing special gets a PaaS", () => {
  const r = chooseModel({ writesCode: true });
  assert.strictEqual(r.model, "paas");
});

test("chooseModel: no code to write means SaaS", () => {
  assert.strictEqual(chooseModel({ writesCode: false }).model, "saas");
  assert.strictEqual(chooseModel({}).model, "saas");
});

test("chooseModel: needing the operating system means IaaS", () => {
  assert.strictEqual(chooseModel({ writesCode: true, needsOsControl: true, hasOpsPerson: true }).model, "iaas");
});

test("chooseModel: a rule to keep the machines in your own building beats everything else", () => {
  assert.strictEqual(chooseModel({ writesCode: true, mustOwnHardware: true, hasOpsPerson: true }).model, "on-prem");
  assert.strictEqual(chooseModel({ writesCode: false, needsOsControl: true, mustOwnHardware: true }).model, "on-prem");
});

test("chooseModel: needing the OS beats a plain PaaS, but finished software needs no OS at all", () => {
  assert.strictEqual(chooseModel({ writesCode: false, needsOsControl: true }).model, "saas");
});

test("chooseModel: warns when you look after the low layers and have nobody to do it", () => {
  assert.strictEqual(chooseModel({ writesCode: true, needsOsControl: true }).warning, true);
  assert.strictEqual(chooseModel({ writesCode: true, needsOsControl: true, hasOpsPerson: false }).warning, true);
  assert.strictEqual(chooseModel({ mustOwnHardware: true }).warning, true);
  assert.strictEqual(chooseModel({ writesCode: true, needsOsControl: true, hasOpsPerson: true }).warning, false);
  assert.strictEqual(chooseModel({ mustOwnHardware: true, hasOpsPerson: true }).warning, false);
});

test("chooseModel: PaaS and SaaS never warn, because the provider looks after the low layers", () => {
  assert.strictEqual(chooseModel({ writesCode: true }).warning, false);
  assert.strictEqual(chooseModel({ writesCode: false }).warning, false);
});

test("chooseModel: gives a reason in words, and a different reason for a different model", () => {
  const a = chooseModel({ writesCode: true });
  const b = chooseModel({ writesCode: false });
  const c = chooseModel({ writesCode: true, needsOsControl: true, hasOpsPerson: true });
  const d = chooseModel({ mustOwnHardware: true, hasOpsPerson: true });
  for (const r of [a, b, c, d]) assert.ok(typeof r.reason === "string" && r.reason.length > 10);
  assert.strictEqual(new Set([a.reason, b.reason, c.reason, d.reason]).size, 4);
});

// ---------- survives ----------

const inst = (name, zone) => ({ name, zone });

test("survives: every instance in one zone, and that zone fails, means down", () => {
  const placement = [inst("api-1", "a"), inst("api-2", "a"), inst("api-3", "a")];
  assert.deepStrictEqual(survives(placement, ["a"]), { up: false, running: [] });
});

test("survives: instances in three zones, one zone fails, means up with two left", () => {
  const placement = [inst("api-1", "a"), inst("api-2", "b"), inst("api-3", "c")];
  assert.deepStrictEqual(survives(placement, ["b"]), { up: true, running: ["api-1", "api-3"] });
});

test("survives: two zones fail and one instance is left, still up", () => {
  const placement = [inst("api-1", "a"), inst("api-2", "b"), inst("api-3", "c")];
  assert.deepStrictEqual(survives(placement, ["a", "c"]), { up: true, running: ["api-2"] });
});

test("survives: all zones fail (a whole region) means down", () => {
  const placement = [inst("api-1", "a"), inst("api-2", "b"), inst("api-3", "c")];
  assert.deepStrictEqual(survives(placement, ["a", "b", "c"]), { up: false, running: [] });
});

test("survives: no failure keeps everything, in the original order", () => {
  const placement = [inst("api-2", "b"), inst("api-1", "a")];
  assert.deepStrictEqual(survives(placement, []), { up: true, running: ["api-2", "api-1"] });
});

test("survives: a zone with no instances in it changes nothing, and an empty placement is down", () => {
  assert.deepStrictEqual(survives([inst("api-1", "a")], ["z"]), { up: true, running: ["api-1"] });
  assert.deepStrictEqual(survives([], []), { up: false, running: [] });
});

test("survives does not change the placement list", () => {
  const placement = [inst("api-1", "a"), inst("api-2", "b")];
  const answer = survives(placement, ["a"]);
  assert.deepStrictEqual(answer, { up: true, running: ["api-2"] });
  assert.deepStrictEqual(placement, [inst("api-1", "a"), inst("api-2", "b")]);
});

// ---------- nearestRegion ----------

test("nearestRegion: the region with the smallest time wins", () => {
  const pings = [
    { region: "us-east-1", ms: 293 },
    { region: "ap-southeast-1", ms: 26 },
    { region: "eu-west-1", ms: 199 },
  ];
  assert.strictEqual(nearestRegion(pings), "ap-southeast-1");
});

test("nearestRegion: works when the best one is first or last", () => {
  assert.strictEqual(nearestRegion([{ region: "a", ms: 5 }, { region: "b", ms: 9 }]), "a");
  assert.strictEqual(nearestRegion([{ region: "a", ms: 9 }, { region: "b", ms: 5 }]), "b");
});

test("nearestRegion: on a tie the first one in the list wins", () => {
  assert.strictEqual(nearestRegion([{ region: "a", ms: 7 }, { region: "b", ms: 7 }]), "a");
});

test("nearestRegion: an empty list gives null, one region gives that region", () => {
  assert.strictEqual(nearestRegion([]), null);
  assert.strictEqual(nearestRegion([{ region: "only", ms: 400 }]), "only");
});

test("nearestRegion does not change the list", () => {
  const pings = [{ region: "a", ms: 9 }, { region: "b", ms: 5 }];
  assert.strictEqual(nearestRegion(pings), "b");
  assert.deepStrictEqual(pings, [{ region: "a", ms: 9 }, { region: "b", ms: 5 }]);
});
