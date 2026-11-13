const test = require("node:test");
const assert = require("node:assert");
const { reconcile, applyActions, selectorMatches, serviceEndpoints, ingressRoute } = require("./04-kubernetes-objects");

const pod = (name, labels = { app: "shop-api" }, ready = true) => ({ name, labels, ready });

// ---------- reconcile ----------

test("reconcile: nothing to do when the number is right", () => {
  assert.deepStrictEqual(reconcile(2, [pod("a"), pod("b")]), []);
  assert.deepStrictEqual(reconcile(0, []), []);
});

test("reconcile: a missing pod gives one create", () => {
  assert.deepStrictEqual(reconcile(3, [pod("a"), pod("b")]), ["create"]);
});

test("reconcile: an empty cluster gets all the pods", () => {
  assert.deepStrictEqual(reconcile(3, []), ["create", "create", "create"]);
});

test("reconcile: extra pods are deleted from the end of the list", () => {
  assert.deepStrictEqual(reconcile(2, [pod("a"), pod("b"), pod("c"), pod("d")]), ["delete d", "delete c"]);
  assert.deepStrictEqual(reconcile(0, [pod("a"), pod("b")]), ["delete b", "delete a"]);
});

test("reconcile does not change the pods list", () => {
  const pods = [pod("a"), pod("b"), pod("c")];
  assert.deepStrictEqual(reconcile(1, pods), ["delete c", "delete b"]);
  assert.deepStrictEqual(pods.map((p) => p.name), ["a", "b", "c"]);
});

// ---------- applyActions ----------

test("applyActions: create adds the pod from makePod at the end", () => {
  let n = 0;
  const next = applyActions([pod("a")], ["create", "create"], () => pod("new" + ++n));
  assert.deepStrictEqual(next.map((p) => p.name), ["a", "new1", "new2"]);
});

test("applyActions: delete removes the pod with that name", () => {
  const next = applyActions([pod("a"), pod("b"), pod("c")], ["delete b"], () => pod("x"));
  assert.deepStrictEqual(next.map((p) => p.name), ["a", "c"]);
});

test("applyActions returns a new list and keeps the old one the same", () => {
  const pods = [pod("a"), pod("b")];
  const next = applyActions(pods, ["delete a", "create"], () => pod("c"));
  assert.deepStrictEqual(next.map((p) => p.name), ["b", "c"]);
  assert.deepStrictEqual(pods.map((p) => p.name), ["a", "b"]);
  assert.notStrictEqual(next, pods);
  const more = applyActions(pods, ["create"], () => pod("d"));
  assert.deepStrictEqual(more.map((p) => p.name), ["a", "b", "d"]);
  assert.deepStrictEqual(pods.map((p) => p.name), ["a", "b"]);
});

test("the loop settles: after the actions, there is nothing left to do", () => {
  let n = 0;
  const make = () => pod("p" + ++n);
  let pods = [pod("a")];
  pods = applyActions(pods, reconcile(3, pods), make);
  assert.strictEqual(pods.length, 3);
  assert.deepStrictEqual(reconcile(3, pods), []);
  pods = applyActions(pods, reconcile(1, pods), make);
  assert.strictEqual(pods.length, 1);
  assert.deepStrictEqual(reconcile(1, pods), []);
});

test("a pod dies and the loop makes a new one with a new name", () => {
  let n = 0;
  const make = () => pod("new" + ++n);
  let pods = [pod("a"), pod("b"), pod("c")];
  pods = pods.filter((p) => p.name !== "b");                 // the pod dies
  assert.deepStrictEqual(reconcile(3, pods), ["create"]);
  pods = applyActions(pods, reconcile(3, pods), make);
  assert.deepStrictEqual(pods.map((p) => p.name), ["a", "c", "new1"]);
});

// ---------- selectorMatches ----------

test("selectorMatches: the same label matches", () => {
  assert.strictEqual(selectorMatches({ app: "shop-api" }, { app: "shop-api" }), true);
});

test("selectorMatches: a different value does not match", () => {
  assert.strictEqual(selectorMatches({ app: "shop-api" }, { app: "shop-web" }), false);
});

test("selectorMatches: a missing key does not match", () => {
  assert.strictEqual(selectorMatches({ app: "shop-api" }, { tier: "backend" }), false);
  assert.strictEqual(selectorMatches({ app: "shop-api" }, {}), false);
});

test("selectorMatches: extra labels on the pod are fine", () => {
  assert.strictEqual(selectorMatches({ app: "shop-api" }, { app: "shop-api", version: "v2", tier: "backend" }), true);
});

test("selectorMatches: every key must match (AND, not OR)", () => {
  assert.strictEqual(selectorMatches({ app: "shop-api", tier: "backend" }, { app: "shop-api", tier: "frontend" }), false);
  assert.strictEqual(selectorMatches({ app: "shop-api", tier: "backend" }, { app: "shop-api" }), false);
  assert.strictEqual(selectorMatches({ app: "shop-api", tier: "backend" }, { app: "shop-api", tier: "backend" }), true);
});

test("selectorMatches: an empty selector matches nothing", () => {
  assert.strictEqual(selectorMatches({}, { app: "shop-api" }), false);
});

// ---------- serviceEndpoints ----------

const service = { name: "shop-api", selector: { app: "shop-api" } };

test("serviceEndpoints: ready pods with the right label get traffic", () => {
  const pods = [pod("a"), pod("b"), pod("c")];
  assert.deepStrictEqual(serviceEndpoints(service, pods), ["a", "b", "c"]);
});

test("serviceEndpoints: a pod that is not ready is left out", () => {
  const pods = [pod("a"), pod("b", { app: "shop-api" }, false), pod("c")];
  assert.deepStrictEqual(serviceEndpoints(service, pods), ["a", "c"]);
});

test("serviceEndpoints: a pod with another label is left out", () => {
  const pods = [pod("a"), pod("w1", { app: "shop-web" }), pod("c")];
  assert.deepStrictEqual(serviceEndpoints(service, pods), ["a", "c"]);
});

test("serviceEndpoints: no matching pod gives an empty list", () => {
  assert.deepStrictEqual(serviceEndpoints(service, [pod("w1", { app: "shop-web" })]), []);
  assert.deepStrictEqual(serviceEndpoints(service, []), []);
});

test("serviceEndpoints: a typo in the selector means no pods", () => {
  const typo = { name: "shop-api", selector: { app: "shop-apii" } };
  assert.deepStrictEqual(serviceEndpoints(typo, [pod("a"), pod("b")]), []);
});

test("serviceEndpoints: a pod that becomes ready joins, a pod that fails leaves", () => {
  const pods = [pod("a", { app: "shop-api" }, false), pod("b")];
  assert.deepStrictEqual(serviceEndpoints(service, pods), ["b"]);
  pods[0].ready = true;
  pods[1].ready = false;
  assert.deepStrictEqual(serviceEndpoints(service, pods), ["a"]);
});

// ---------- ingressRoute ----------

const H = "shop.example.com";
const rules = [
  { host: H, path: "/api", pathType: "Prefix", service: "shop-api" },
  { host: H, path: "/", pathType: "Prefix", service: "shop-web" },
];

test("ingressRoute: a Prefix rule matches its path and the paths below it", () => {
  assert.strictEqual(ingressRoute(rules, H, "/api"), "shop-api");
  assert.strictEqual(ingressRoute(rules, H, "/api/users"), "shop-api");
  assert.strictEqual(ingressRoute(rules, H, "/api/users/7"), "shop-api");
});

test("ingressRoute: Prefix compares whole pieces, so /apis is not /api", () => {
  assert.strictEqual(ingressRoute(rules, H, "/apis"), "shop-web");
});

test("ingressRoute: the Prefix / rule catches every other path", () => {
  assert.strictEqual(ingressRoute(rules, H, "/"), "shop-web");
  assert.strictEqual(ingressRoute(rules, H, "/about"), "shop-web");
  assert.strictEqual(ingressRoute(rules, H, "/blog/2026/hello"), "shop-web");
});

test("ingressRoute: the longest path wins, whatever the order of the rules", () => {
  assert.strictEqual(ingressRoute([...rules].reverse(), H, "/api/users"), "shop-api");
  const deep = [
    { host: H, path: "/api", pathType: "Prefix", service: "shop-api" },
    { host: H, path: "/api/admin", pathType: "Prefix", service: "shop-admin" },
  ];
  assert.strictEqual(ingressRoute(deep, H, "/api/admin/users"), "shop-admin");
  assert.strictEqual(ingressRoute(deep, H, "/api/orders"), "shop-api");
});

test("ingressRoute: another host gets no route", () => {
  assert.strictEqual(ingressRoute(rules, "other.example.com", "/api"), null);
  assert.strictEqual(ingressRoute(rules, "other.example.com", "/"), null);
});

test("ingressRoute: no rule matches gives null", () => {
  assert.strictEqual(ingressRoute([], H, "/"), null);
  const only = [{ host: H, path: "/api", pathType: "Prefix", service: "shop-api" }];
  assert.strictEqual(ingressRoute(only, H, "/"), null);
  assert.strictEqual(ingressRoute(only, H, "/about"), null);
});

test("ingressRoute: Exact matches only the same path", () => {
  const exact = [{ host: H, path: "/login", pathType: "Exact", service: "shop-auth" }];
  assert.strictEqual(ingressRoute(exact, H, "/login"), "shop-auth");
  assert.strictEqual(ingressRoute(exact, H, "/login/reset"), null);
  assert.strictEqual(ingressRoute(exact, H, "/log"), null);
});

test("ingressRoute: capital letters count", () => {
  assert.strictEqual(ingressRoute(rules, H, "/API"), "shop-web");
  const exact = [{ host: H, path: "/login", pathType: "Exact", service: "shop-auth" }];
  assert.strictEqual(ingressRoute(exact, H, "/Login"), null);
});

test("ingressRoute: on a tie, Exact beats Prefix", () => {
  const tie = [
    { host: H, path: "/status", pathType: "Prefix", service: "shop-web" },
    { host: H, path: "/status", pathType: "Exact", service: "shop-health" },
  ];
  assert.strictEqual(ingressRoute(tie, H, "/status"), "shop-health");
  assert.strictEqual(ingressRoute([...tie].reverse(), H, "/status"), "shop-health");
  assert.strictEqual(ingressRoute(tie, H, "/status/x"), "shop-web");
});

test("ingressRoute: two hosts keep their own rules", () => {
  const two = [
    { host: "shop.example.com", path: "/", pathType: "Prefix", service: "shop-web" },
    { host: "api.example.com", path: "/", pathType: "Prefix", service: "shop-api" },
  ];
  assert.strictEqual(ingressRoute(two, "shop.example.com", "/x"), "shop-web");
  assert.strictEqual(ingressRoute(two, "api.example.com", "/x"), "shop-api");
});
