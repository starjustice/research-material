const test = require("node:test");
const assert = require("node:assert");
const { startOrder, canStart, webStartsAt, connectResult, resolve, dataSurvives } = require("./03-docker-compose");

// ---- startOrder ----

test("startOrder puts what a service needs before it", () => {
  const order = startOrder({ web: { depends_on: ["db", "cache"] }, db: {}, cache: {} });
  assert.deepStrictEqual(order, ["db", "cache", "web"]);
});

test("startOrder keeps the written order when nothing depends on anything", () => {
  assert.deepStrictEqual(startOrder({ b: {}, a: {}, c: {} }), ["b", "a", "c"]);
});

test("startOrder follows a chain", () => {
  const order = startOrder({ c: { depends_on: ["b"] }, b: { depends_on: ["a"] }, a: {} });
  assert.deepStrictEqual(order, ["a", "b", "c"]);
});

test("startOrder reads the object form of depends_on", () => {
  const order = startOrder({
    web: { depends_on: { db: { condition: "service_healthy" }, cache: { condition: "service_started" } } },
    db: {},
    cache: {},
  });
  assert.deepStrictEqual(order, ["db", "cache", "web"]);
});

test("startOrder lists a shared dependency once", () => {
  const order = startOrder({
    web: { depends_on: ["api", "worker"] },
    api: { depends_on: ["db"] },
    worker: { depends_on: ["db"] },
    db: {},
  });
  assert.deepStrictEqual(order, ["db", "api", "worker", "web"]);
});

test("startOrder throws on a cycle", () => {
  assert.throws(() => startOrder({ a: { depends_on: ["b"] }, b: { depends_on: ["a"] } }), /cycle/);
  assert.throws(() => startOrder({ a: { depends_on: ["b"] }, b: { depends_on: ["c"] }, c: { depends_on: ["a"] } }), /cycle/);
});

test("startOrder treats a service that needs itself as a cycle", () => {
  assert.throws(() => startOrder({ a: { depends_on: ["a"] } }), /cycle/);
});

test("startOrder throws on a name that is not a service", () => {
  assert.throws(() => startOrder({ web: { depends_on: ["database"] }, db: {} }), /unknown service/);
});

// ---- canStart ----

test("service_started is true for a running service, even if its health is still starting", () => {
  assert.strictEqual(canStart("service_started", { state: "running", health: "starting", exitCode: null }), true);
  assert.strictEqual(canStart("service_started", { state: "running", health: "none", exitCode: null }), true);
});

test("service_started is false for a service that is not running", () => {
  assert.strictEqual(canStart("service_started", { state: "created", health: "none", exitCode: null }), false);
  assert.strictEqual(canStart("service_started", { state: "exited", health: "none", exitCode: 1 }), false);
});

test("no condition means service_started", () => {
  assert.strictEqual(canStart(undefined, { state: "running", health: "starting", exitCode: null }), true);
  assert.strictEqual(canStart(undefined, { state: "created", health: "none", exitCode: null }), false);
});

test("service_healthy waits for the healthcheck to pass", () => {
  assert.strictEqual(canStart("service_healthy", { state: "running", health: "starting", exitCode: null }), false);
  assert.strictEqual(canStart("service_healthy", { state: "running", health: "unhealthy", exitCode: null }), false);
  assert.strictEqual(canStart("service_healthy", { state: "running", health: "healthy", exitCode: null }), true);
});

test("service_healthy on a service with no healthcheck is an error", () => {
  assert.throws(() => canStart("service_healthy", { state: "running", health: "none", exitCode: null }), /no healthcheck/);
});

test("service_completed_successfully needs an exit with code 0", () => {
  assert.strictEqual(canStart("service_completed_successfully", { state: "exited", health: "none", exitCode: 0 }), true);
  assert.strictEqual(canStart("service_completed_successfully", { state: "exited", health: "none", exitCode: 1 }), false);
  assert.strictEqual(canStart("service_completed_successfully", { state: "running", health: "none", exitCode: null }), false);
});

test("canStart throws on a condition it does not know", () => {
  assert.throws(() => canStart("service_ready", { state: "running", health: "healthy", exitCode: null }), /unknown condition/);
});

// ---- webStartsAt and connectResult ----

test("with service_started web starts with the database, long before the database is ready", () => {
  const at = webStartsAt({ condition: "service_started", dbStartedAt: 0, dbReadyAt: 1000, interval: 2000 });
  assert.strictEqual(at, 0);
  assert.strictEqual(connectResult(at, 1000), "ECONNREFUSED");
});

test("with service_healthy web waits for the first check after the database is ready", () => {
  const at = webStartsAt({ condition: "service_healthy", dbStartedAt: 0, dbReadyAt: 1000, interval: 2000 });
  assert.strictEqual(at, 2000);
  assert.strictEqual(connectResult(at, 1000), "connected");
});

test("service_healthy takes the first check at or after the ready time", () => {
  assert.strictEqual(webStartsAt({ condition: "service_healthy", dbStartedAt: 0, dbReadyAt: 2000, interval: 2000 }), 2000);
  assert.strictEqual(webStartsAt({ condition: "service_healthy", dbStartedAt: 0, dbReadyAt: 2001, interval: 2000 }), 4000);
  assert.strictEqual(webStartsAt({ condition: "service_healthy", dbStartedAt: 500, dbReadyAt: 7000, interval: 3000 }), 9500);
});

test("a short interval gets web started sooner", () => {
  assert.strictEqual(webStartsAt({ condition: "service_healthy", dbStartedAt: 0, dbReadyAt: 1000, interval: 500 }), 1000);
});

test("webStartsAt throws on a condition it does not know", () => {
  assert.throws(() => webStartsAt({ condition: "later", dbStartedAt: 0, dbReadyAt: 1000, interval: 2000 }), /unknown condition/);
});

test("connectResult connects at or after the ready time and is refused before it", () => {
  assert.strictEqual(connectResult(1000, 1000), "connected");
  assert.strictEqual(connectResult(999, 1000), "ECONNREFUSED");
  assert.strictEqual(connectResult(5000, 1000), "connected");
});

// ---- resolve ----

const FILE = {
  proxy: { networks: ["frontend"] },
  api: { networks: ["frontend", "backend"] },
  db: { networks: ["backend"] },
};

test("localhost is always yourself", () => {
  assert.strictEqual(resolve(FILE, "api", "localhost"), "api");
  assert.strictEqual(resolve(FILE, "db", "localhost"), "db");
});

test("a service finds another service that shares a network", () => {
  assert.strictEqual(resolve(FILE, "proxy", "api"), "api");
  assert.strictEqual(resolve(FILE, "api", "db"), "db");
  assert.strictEqual(resolve(FILE, "db", "api"), "api");
});

test("a service cannot find one that shares no network", () => {
  assert.strictEqual(resolve(FILE, "proxy", "db"), null);
  assert.strictEqual(resolve(FILE, "db", "proxy"), null);
});

test("services with no networks list share the default network", () => {
  const plain = { web: {}, db: {}, cache: {} };
  assert.strictEqual(resolve(plain, "web", "db"), "db");
  assert.strictEqual(resolve(plain, "cache", "web"), "web");
});

test("a service on the default network cannot find one on a named network only", () => {
  const mixed = { web: {}, db: { networks: ["backend"] } };
  assert.strictEqual(resolve(mixed, "web", "db"), null);
});

test("a name that is not a service gives null", () => {
  assert.strictEqual(resolve(FILE, "api", "postgres"), null);
  assert.strictEqual(resolve(FILE, "ghost", "db"), null);
});

// ---- dataSurvives ----

test("stop keeps everything", () => {
  for (const mount of ["layer", "named", "bind"]) assert.strictEqual(dataSurvives("stop", mount), true, mount);
});

test("down removes the container, so its own storage is gone, but volumes and bind mounts stay", () => {
  assert.strictEqual(dataSurvives("down", "layer"), false);
  assert.strictEqual(dataSurvives("down", "named"), true);
  assert.strictEqual(dataSurvives("down", "bind"), true);
});

test("down -v also removes named volumes, but never a bind mount", () => {
  assert.strictEqual(dataSurvives("down -v", "layer"), false);
  assert.strictEqual(dataSurvives("down -v", "named"), false);
  assert.strictEqual(dataSurvives("down -v", "bind"), true);
});

test("dataSurvives throws on a command or a mount it does not know", () => {
  assert.throws(() => dataSurvives("up", "named"), /unknown/);
  assert.throws(() => dataSurvives("down", "tmpfs"), /unknown/);
});
