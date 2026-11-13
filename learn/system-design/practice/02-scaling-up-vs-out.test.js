const test = require("node:test");
const assert = require("node:assert");
const { createSite } = require("./02-scaling-up-vs-out");

const makeSite = (mode, servers = ["A", "B", "C"]) => createSite({ mode, servers });
const asks = (site, id, times) => Array.from({ length: times }, () => site.request(id));

test("login goes to the first server and gives session ids in order", () => {
  const site = makeSite("memory");
  assert.deepStrictEqual(site.login("Mia"), { id: "s1", server: "A" });
  assert.deepStrictEqual(site.login("Sam"), { id: "s2", server: "B" });
});

test("memory: only the server that took the login knows the user (the bug)", () => {
  const site = makeSite("memory");
  const { id } = site.login("Mia");                       // lands on A
  assert.deepStrictEqual(asks(site, id, 4), [
    { server: "B", says: "please log in" },
    { server: "C", says: "please log in" },
    { server: "A", says: "Mia" },
    { server: "B", says: "please log in" },
  ]);
});

test("shared: every server says the same, whichever one is asked (the fix)", () => {
  const site = makeSite("shared");
  const { id } = site.login("Mia");
  const answers = asks(site, id, 4);
  assert.deepStrictEqual(answers.map((r) => r.says), ["Mia", "Mia", "Mia", "Mia"]);
  assert.deepStrictEqual(answers.map((r) => r.server), ["B", "C", "A", "B"]);   // the login took turn 1 on A
});

test("sticky: the user always lands on the server of the login", () => {
  const site = makeSite("sticky");
  site.login("Sam");                                       // s1 lands on A
  const { id } = site.login("Mia");                        // s2 lands on B
  assert.deepStrictEqual(asks(site, id, 3), [
    { server: "B", says: "Mia" }, { server: "B", says: "Mia" }, { server: "B", says: "Mia" },
  ]);
});

test("an id that nobody knows says please log in, in every mode", () => {
  for (const mode of ["memory", "sticky", "shared"]) {
    assert.strictEqual(makeSite(mode).request("nope").says, "please log in", mode);
  }
});

test("losing a server: memory and sticky lose the sessions that lived on it", () => {
  for (const mode of ["memory", "sticky"]) {
    const site = makeSite(mode);
    const { id } = site.login("Mia");                      // lives on A
    assert.strictEqual(site.loseServer("A"), true);
    assert.deepStrictEqual(site.servers(), ["B", "C"]);
    assert.ok(asks(site, id, 4).every((r) => r.says === "please log in"), mode);
  }
});

test("losing a server: shared keeps every session", () => {
  const site = makeSite("shared");
  const { id } = site.login("Mia");                        // took the login on A
  site.loseServer("A");
  assert.deepStrictEqual(asks(site, id, 4).map((r) => r.says), ["Mia", "Mia", "Mia", "Mia"]);
});

test("sticky: only the users of the lost server are logged out", () => {
  const site = makeSite("sticky");
  const a = site.login("Sam").id;                          // on A
  const b = site.login("Mia").id;                          // on B
  site.loseServer("A");
  assert.strictEqual(site.request(a).says, "please log in");
  assert.strictEqual(site.request(b).says, "Mia");
  assert.strictEqual(site.request(b).server, "B");
});

test("adding a server: shared puts it to work at once", () => {
  const site = createSite({ mode: "shared", servers: ["A", "B"] });
  const { id } = site.login("Mia");                        // turn 1: on A
  assert.strictEqual(site.addServer("C"), true);
  assert.deepStrictEqual(site.servers(), ["A", "B", "C"]);
  const answers = asks(site, id, 3);                       // now the list has three servers, so the turns go B, C, A
  assert.deepStrictEqual(answers.map((r) => r.server), ["B", "C", "A"]);
  assert.ok(answers.every((r) => r.says === "Mia"));
});

test("adding a server: sticky users stay where they are, so the new server gets nothing", () => {
  const site = createSite({ mode: "sticky", servers: ["A", "B"] });
  const { id } = site.login("Mia");
  site.addServer("C");
  assert.deepStrictEqual(asks(site, id, 3).map((r) => r.server), ["A", "A", "A"]);
});

test("adding a server: in memory mode the new server knows nobody", () => {
  const site = createSite({ mode: "memory", servers: ["A"] });
  const { id } = site.login("Mia");
  site.addServer("B");
  assert.deepStrictEqual(asks(site, id, 2), [{ server: "B", says: "please log in" }, { server: "A", says: "Mia" }]);
});

test("adding or losing the wrong name changes nothing", () => {
  const site = makeSite("shared");
  assert.strictEqual(site.addServer("A"), false);
  assert.strictEqual(site.loseServer("Z"), false);
  assert.deepStrictEqual(site.servers(), ["A", "B", "C"]);
});

test("with no server up, login and request throw", () => {
  const site = createSite({ mode: "shared", servers: ["A"] });
  const { id } = site.login("Mia");
  site.loseServer("A");
  assert.throws(() => site.login("Sam"));
  assert.throws(() => site.request(id));
});

test("the default is two servers with a shared box", () => {
  const site = createSite();
  assert.deepStrictEqual(site.servers(), ["A", "B"]);
  const { id } = site.login("Mia");
  assert.deepStrictEqual(asks(site, id, 2).map((r) => r.says), ["Mia", "Mia"]);
});
