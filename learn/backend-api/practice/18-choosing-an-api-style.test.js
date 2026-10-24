const test = require("node:test");
const assert = require("node:assert");
const { chooseStyle, facts, requestsForUserAndOrders, answers } = require("./18-choosing-an-api-style");

// ---- Task 1: chooseStyle (the five projects from section 5 of the lesson) ----

test("chooseStyle: a public catalog for partner shops is REST", () => {
  assert.deepStrictEqual(chooseStyle({ publicThirdParties: true }), { api: "rest", push: "none" });
});

test("chooseStyle: Go and Node services with a live feed are gRPC, and the browser gets SSE", () => {
  const needs = { serviceToService: true, needsStreaming: true, manyLanguages: true, serverPushToBrowser: "one-way" };
  assert.deepStrictEqual(chooseStyle(needs), { api: "grpc", push: "sse" });
});

test("chooseStyle: a Next.js admin tool and its API in one repo is tRPC", () => {
  assert.deepStrictEqual(chooseStyle({ clientsAreAllTypeScriptInOneRepo: true }), { api: "trpc", push: "none" });
});

test("chooseStyle: a React Native app, a web app and a CMS with different fields is GraphQL", () => {
  assert.deepStrictEqual(chooseStyle({ manyClientsNeedDifferentFields: true }), { api: "graphql", push: "none" });
});

test("chooseStyle: a mobile app in the stores is REST, or GraphQL if the fields differ", () => {
  const stores = { clientsAreAllTypeScriptInOneRepo: true, oldClientsStayInstalled: true };
  assert.strictEqual(chooseStyle(stores).api, "rest");
  assert.strictEqual(chooseStyle({ ...stores, manyClientsNeedDifferentFields: true }).api, "graphql");
});

test("chooseStyle: practice A from the lesson (all TypeScript, but the mobile app stays installed) is GraphQL", () => {
  const needs = { clientsAreAllTypeScriptInOneRepo: true, oldClientsStayInstalled: true, manyClientsNeedDifferentFields: true };
  assert.strictEqual(chooseStyle(needs).api, "graphql");
});

// ---- Task 1: the order of the questions ----

test("chooseStyle: the first yes wins, so a public API is REST even when other answers are yes", () => {
  const everything = {
    publicThirdParties: true, serviceToService: true, needsStreaming: true, manyLanguages: true,
    clientsAreAllTypeScriptInOneRepo: true, manyClientsNeedDifferentFields: true,
  };
  assert.strictEqual(chooseStyle(everything).api, "rest");
});

test("chooseStyle: gRPC needs streaming OR many languages, one of them is enough", () => {
  assert.strictEqual(chooseStyle({ serviceToService: true, needsStreaming: true }).api, "grpc");
  assert.strictEqual(chooseStyle({ serviceToService: true, manyLanguages: true }).api, "grpc");
});

test("chooseStyle: server to server with no streaming and one language is not gRPC", () => {
  assert.strictEqual(chooseStyle({ serviceToService: true }).api, "rest");
  assert.strictEqual(chooseStyle({ serviceToService: true, clientsAreAllTypeScriptInOneRepo: true }).api, "trpc");
});

test("chooseStyle: streaming or many languages alone, with no server caller, is not gRPC", () => {
  assert.strictEqual(chooseStyle({ needsStreaming: true, manyLanguages: true }).api, "rest");
});

test("chooseStyle: gRPC (question 2) comes before tRPC (question 3)", () => {
  const needs = { serviceToService: true, needsStreaming: true, clientsAreAllTypeScriptInOneRepo: true };
  assert.strictEqual(chooseStyle(needs).api, "grpc");
});

test("chooseStyle: tRPC (question 3) comes before GraphQL (question 4)", () => {
  const needs = { clientsAreAllTypeScriptInOneRepo: true, manyClientsNeedDifferentFields: true };
  assert.strictEqual(chooseStyle(needs).api, "trpc");
});

test("chooseStyle: nothing special is REST", () => {
  assert.deepStrictEqual(chooseStyle({}), { api: "rest", push: "none" });
});

// ---- Task 1: push is a separate answer ----

test("chooseStyle: push does not change the style, it only adds sse or websocket", () => {
  assert.deepStrictEqual(chooseStyle({ serverPushToBrowser: "one-way" }), { api: "rest", push: "sse" });
  assert.deepStrictEqual(chooseStyle({ serverPushToBrowser: "two-way" }), { api: "rest", push: "websocket" });
  assert.deepStrictEqual(chooseStyle({ clientsAreAllTypeScriptInOneRepo: true, serverPushToBrowser: "two-way" }), { api: "trpc", push: "websocket" });
});

test("chooseStyle: any other push value means none", () => {
  for (const value of [undefined, null, "", "both", "ONE-WAY", true, 1]) {
    assert.strictEqual(chooseStyle({ serverPushToBrowser: value }).push, "none", String(value));
  }
});

// ---- Task 1: careful input ----

test("chooseStyle: no argument, or null, counts as an empty object", () => {
  assert.deepStrictEqual(chooseStyle(), { api: "rest", push: "none" });
  assert.deepStrictEqual(chooseStyle(undefined), { api: "rest", push: "none" });
  assert.deepStrictEqual(chooseStyle(null), { api: "rest", push: "none" });
});

test("chooseStyle: it does not change the object it was given", () => {
  const needs = { publicThirdParties: true, serverPushToBrowser: "one-way" };
  const copy = { ...needs };
  assert.deepStrictEqual(chooseStyle(needs), { api: "rest", push: "sse" });
  assert.deepStrictEqual(needs, copy);
});

test("chooseStyle: it returns a new object each time", () => {
  assert.notStrictEqual(chooseStyle({}), chooseStyle({}));
});

// ---- Task 2: facts ----

test("facts: the real values from sections 4 and 5", () => {
  assert.deepStrictEqual(facts, {
    rest:    { readMethod: "GET",  body: "json",     browserDirect: true,  callers: "anyone" },
    graphql: { readMethod: "POST", body: "json",     browserDirect: true,  callers: "anyone" },
    trpc:    { readMethod: "GET",  body: "json",     browserDirect: true,  callers: "typescript only" },
    grpc:    { readMethod: "POST", body: "protobuf", browserDirect: false, callers: "any language" },
  });
});

test("facts: only gRPC needs something extra in a browser", () => {
  const notDirect = Object.keys(facts).filter((name) => facts[name].browserDirect !== true);
  assert.deepStrictEqual(notDirect, ["grpc"]);
});

// ---- Task 3: requestsForUserAndOrders ----

test("requestsForUserAndOrders: REST 2, GraphQL 1, tRPC 1, gRPC 2 (the table in section 2d)", () => {
  assert.strictEqual(requestsForUserAndOrders("rest"), 2);
  assert.strictEqual(requestsForUserAndOrders("graphql"), 1);
  assert.strictEqual(requestsForUserAndOrders("trpc"), 1);
  assert.strictEqual(requestsForUserAndOrders("grpc"), 2);
});

test("requestsForUserAndOrders: a name that is not a style gives undefined", () => {
  assert.strictEqual(requestsForUserAndOrders("rest"), 2, "a real style still works");
  for (const name of ["soap", "REST", "", undefined, null, 5]) {
    assert.strictEqual(requestsForUserAndOrders(name), undefined, String(name));
  }
});

test("requestsForUserAndOrders: names from Object.prototype are not styles", () => {
  assert.strictEqual(requestsForUserAndOrders("grpc"), 2, "a real style still works");
  for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__"]) {
    assert.strictEqual(requestsForUserAndOrders(name), undefined, name);
  }
});

// ---- Task 4: answers ----

test("answers: the six short answers", () => {
  assert.deepStrictEqual(answers, {
    firstQuestion: "who calls it",
    publicApiForOtherCompanies: "rest",
    differentFieldsForDifferentApps: "graphql",
    typescriptMonorepoShippedTogether: "trpc",
    busyServiceToServiceWithStreaming: "grpc",
    oneWayLiveUpdatesToABrowser: "sse",
  });
});

test("answers: your answers agree with your own chooseStyle", () => {
  assert.strictEqual(chooseStyle({ publicThirdParties: true }).api, answers.publicApiForOtherCompanies);
  assert.strictEqual(chooseStyle({ manyClientsNeedDifferentFields: true }).api, answers.differentFieldsForDifferentApps);
  assert.strictEqual(chooseStyle({ clientsAreAllTypeScriptInOneRepo: true }).api, answers.typescriptMonorepoShippedTogether);
  assert.strictEqual(chooseStyle({ serviceToService: true, needsStreaming: true }).api, answers.busyServiceToServiceWithStreaming);
  assert.strictEqual(chooseStyle({ serverPushToBrowser: "one-way" }).push, answers.oneWayLiveUpdatesToABrowser);
});
