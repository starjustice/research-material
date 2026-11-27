import test from "node:test";
import assert from "node:assert";
import { createBridge, createJsi } from "./05-bridge-vs-jsi.mjs";

function makeNative() {
  const seen = [];
  return {
    seen,
    modules: {
      Storage: {
        save(data) {
          seen.push(structuredClone(data));
          return data;
        },
        now() {
          return new Date(0);
        },
        shape() {
          return { a: 1, f() {} };
        },
        fail() {
          throw new Error("native crash");
        },
        sum(a, b) {
          return a + b;
        },
      },
    },
  };
}

test("bridge: nothing runs until flush", () => {
  const { modules, seen } = makeNative();
  const bridge = createBridge(modules);
  bridge.call("Storage", "save", { n: 1 });
  assert.strictEqual(seen.length, 0, "the call is only in the queue");
  bridge.flush();
  assert.strictEqual(seen.length, 1);
});

test("bridge: call gives a promise that finishes after flush", async () => {
  const { modules } = makeNative();
  const bridge = createBridge(modules);
  const promise = bridge.call("Storage", "sum", 2, 3);
  assert.ok(promise instanceof Promise);
  bridge.flush();
  assert.strictEqual(await promise, 5);
});

test("bridge: native sees a copy made at call time", () => {
  const { modules, seen } = makeNative();
  const bridge = createBridge(modules);
  const data = { n: 1 };
  bridge.call("Storage", "save", data);
  data.n = 2; // changed after the call, before the batch is delivered
  bridge.flush();
  assert.deepStrictEqual(seen, [{ n: 1 }]);
});

test("bridge: the result is a copy, not the same object", async () => {
  const { modules } = makeNative();
  const bridge = createBridge(modules);
  const data = { n: 1 };
  const promise = bridge.call("Storage", "save", data);
  bridge.flush();
  const result = await promise;
  assert.deepStrictEqual(result, { n: 1 });
  assert.notStrictEqual(result, data);
});

test("bridge: a Date becomes a string and a function is dropped", async () => {
  const { modules } = makeNative();
  const bridge = createBridge(modules);
  const when = bridge.call("Storage", "now");
  const shape = bridge.call("Storage", "shape");
  bridge.flush();
  assert.strictEqual(await when, "1970-01-01T00:00:00.000Z");
  assert.deepStrictEqual(await shape, { a: 1 });
});

test("bridge: one flush delivers the whole batch, in order", async () => {
  const { modules } = makeNative();
  const bridge = createBridge(modules);
  const results = [bridge.call("Storage", "sum", 1, 1), bridge.call("Storage", "sum", 2, 2), bridge.call("Storage", "sum", 3, 3)];
  bridge.flush();
  assert.deepStrictEqual(await Promise.all(results), [2, 4, 6]);
});

test("bridge: a native error rejects the promise", async () => {
  const { modules } = makeNative();
  const bridge = createBridge(modules);
  const promise = bridge.call("Storage", "fail");
  bridge.flush();
  await assert.rejects(promise, /native crash/);
});

test("bridge: stats count messages and bytes, and bytes grow with the data", () => {
  const { modules } = makeNative();
  const small = createBridge(modules);
  small.call("Storage", "save", [1, 2, 3]);
  const big = createBridge(modules);
  big.call("Storage", "save", Array.from({ length: 1000 }, (_, i) => i));
  big.call("Storage", "save", [1]);
  assert.strictEqual(small.stats().messages, 1);
  assert.strictEqual(big.stats().messages, 2);
  assert.ok(big.stats().bytes > small.stats().bytes * 50);
});

test("jsi: runs at once and gives the value back", () => {
  const { modules } = makeNative();
  const jsi = createJsi(modules);
  assert.strictEqual(jsi.call("Storage", "sum", 2, 3), 5);
});

test("jsi: both sides hold the same object", () => {
  const { modules } = makeNative();
  const jsi = createJsi({
    Camera: {
      frame(buffer) {
        buffer[0] = 99; // native changes the very same memory
        return buffer;
      },
    },
  });
  const buffer = new Uint8Array(4);
  const back = jsi.call("Camera", "frame", buffer);
  assert.strictEqual(back, buffer, "no copy was made");
  assert.strictEqual(buffer[0], 99);
  assert.ok(modules);
});

test("jsi: no messages and no bytes, however big the data is", () => {
  const { modules } = makeNative();
  const jsi = createJsi(modules);
  jsi.call("Storage", "save", Array.from({ length: 100000 }, (_, i) => i));
  assert.deepStrictEqual(jsi.stats(), { messages: 0, bytes: 0 });
});
