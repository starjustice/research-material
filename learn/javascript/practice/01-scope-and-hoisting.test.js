const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { collectIndexes, snippets, predictions } = require("./01-scope-and-hoisting");

test("collectIndexes: each timer sees its own i", async () => {
  assert.deepStrictEqual(await collectIndexes(3), [0, 1, 2]);
});

test("collectIndexes: works for a bigger n", async () => {
  assert.deepStrictEqual(await collectIndexes(5), [0, 1, 2, 3, 4]);
});

// Run a snippet in a fresh, empty world and collect what it prints.
function runSnippet(code) {
  const printed = [];
  const sandbox = { console: { log: (x) => printed.push(String(x)) } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return printed;
}

for (const name of Object.keys(snippets)) {
  test(`prediction ${name}: ${snippets[name]}`, () => {
    const real = runSnippet(snippets[name]);
    assert.ok(predictions[name].length > 0, "write your prediction first");
    assert.deepStrictEqual(
      predictions[name],
      real,
      `You wrote ${JSON.stringify(predictions[name])}. The real output is ${JSON.stringify(real)}.`
    );
  });
}
