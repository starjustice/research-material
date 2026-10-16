const test = require("node:test");
const assert = require("node:assert");
const { createPicker, leastConnections } = require("./03-load-balancers");

const take = (picker, n) => Array.from({ length: n }, () => picker.pick());

test("round robin: takes turns A B C A B C", () => {
  const picker = createPicker(["A", "B", "C"]);
  assert.deepStrictEqual(take(picker, 6), ["A", "B", "C", "A", "B", "C"]);
});

test("round robin: skips a server that is marked down", () => {
  const picker = createPicker(["A", "B", "C"]);
  picker.markDown("B");
  assert.deepStrictEqual(take(picker, 4), ["A", "C", "A", "C"]);
});

test("round robin: a server that is marked up again gets turns again", () => {
  const picker = createPicker(["A", "B", "C"]);
  picker.markDown("B");
  take(picker, 4);
  picker.markUp("B");
  assert.deepStrictEqual(take(picker, 3).sort(), ["A", "B", "C"]);
});

test("round robin: returns null when every server is down", () => {
  const picker = createPicker(["A", "B"]);
  picker.markDown("A");
  picker.markDown("B");
  assert.strictEqual(picker.pick(), null);
});

test("least connections: picks the server with the fewest open connections", () => {
  const servers = [
    { name: "A", up: true, open: 4 },
    { name: "B", up: true, open: 1 },
    { name: "C", up: true, open: 2 },
  ];
  assert.strictEqual(leastConnections(servers), "B");
});

test("least connections: a tie goes to the first server in the list", () => {
  const servers = [
    { name: "A", up: true, open: 2 },
    { name: "B", up: true, open: 1 },
    { name: "C", up: true, open: 1 },
  ];
  assert.strictEqual(leastConnections(servers), "B");
});

test("least connections: never picks a server that is down, even with 0 connections", () => {
  const servers = [
    { name: "A", up: true, open: 5 },
    { name: "B", up: false, open: 0 },
    { name: "C", up: true, open: 3 },
  ];
  assert.strictEqual(leastConnections(servers), "C");
});

test("least connections: returns null when every server is down", () => {
  const servers = [
    { name: "A", up: false, open: 0 },
    { name: "B", up: false, open: 0 },
  ];
  assert.strictEqual(leastConnections(servers), null);
});
