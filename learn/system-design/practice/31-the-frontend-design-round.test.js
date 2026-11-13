const test = require("node:test");
const assert = require("node:assert");
const { visibleRange, pageByOffset, pageByCursor, createDedupe, createOptimisticStore } = require("./31-the-frontend-design-round");

// ---- Part 1: a window over a long list (virtualization) ----

const box = { viewportHeight: 600, rowHeight: 50, total: 100000 };

test("visibleRange at the top shows the first rows that fit", () => {
  assert.deepStrictEqual(visibleRange({ ...box, scrollTop: 0 }), { start: 0, end: 12, offsetTop: 0, totalHeight: 5000000 });
});

test("visibleRange includes a row that is only partly in view", () => {
  // scrollTop 125 is the middle of row 2. The bottom edge 725 is the middle of row 14.
  const r = visibleRange({ ...box, scrollTop: 125 });
  assert.strictEqual(r.start, 2);
  assert.strictEqual(r.end, 15);
  assert.strictEqual(r.offsetTop, 100);
});

test("visibleRange in the middle of 100,000 rows still draws only 12", () => {
  const r = visibleRange({ ...box, scrollTop: 2500000 });
  assert.deepStrictEqual([r.start, r.end], [50000, 50012]);
  assert.strictEqual(r.end - r.start, 12);
});

test("overscan adds spare rows above and below", () => {
  const r = visibleRange({ ...box, scrollTop: 2500000, overscan: 3 });
  assert.deepStrictEqual([r.start, r.end], [49997, 50015]);
  assert.strictEqual(r.offsetTop, 49997 * 50);
});

test("overscan never goes below row 0 or above the last row", () => {
  assert.strictEqual(visibleRange({ ...box, scrollTop: 0, overscan: 5 }).start, 0);
  const end = visibleRange({ ...box, scrollTop: 4999400, overscan: 5 });
  assert.strictEqual(end.end, 100000);
});

test("a short list ends at its last row", () => {
  const r = visibleRange({ scrollTop: 0, viewportHeight: 600, rowHeight: 50, total: 5 });
  assert.deepStrictEqual([r.start, r.end, r.totalHeight], [0, 5, 250]);
});

test("a scroll position past the end or below 0 is kept inside the list", () => {
  const last = visibleRange({ ...box, scrollTop: 99999999 });
  assert.deepStrictEqual([last.start, last.end], [99988, 100000]);
  assert.strictEqual(visibleRange({ ...box, scrollTop: -40 }).start, 0);
});

test("an empty list draws nothing", () => {
  const r = visibleRange({ scrollTop: 0, viewportHeight: 600, rowHeight: 50, total: 0 });
  assert.deepStrictEqual([r.start, r.end, r.totalHeight], [0, 0, 0]);
});

// ---- Part 2: pages by offset and by cursor ----

const feed = (top) => Array.from({ length: top }, (_, i) => ({ id: top - i }));   // newest first: top, top-1, ..., 1
const ids = (list) => list.map((x) => x.id);

test("pageByOffset takes a slice", () => {
  assert.deepStrictEqual(ids(pageByOffset(feed(10), 0, 5)), [10, 9, 8, 7, 6]);
  assert.deepStrictEqual(ids(pageByOffset(feed(10), 5, 5)), [5, 4, 3, 2, 1]);
});

test("pageByCursor starts at the top with a null cursor and returns the next cursor", () => {
  const page = pageByCursor(feed(10), null, 5);
  assert.deepStrictEqual(ids(page.items), [10, 9, 8, 7, 6]);
  assert.strictEqual(page.nextCursor, 6);
});

test("pageByCursor continues after the cursor and ends with a null cursor", () => {
  const page = pageByCursor(feed(10), 6, 5);
  assert.deepStrictEqual(ids(page.items), [5, 4, 3, 2, 1]);
  assert.strictEqual(page.nextCursor, null);
});

test("a last page that is exactly full has no next cursor", () => {
  assert.strictEqual(pageByCursor(feed(5), null, 5).nextCursor, null);
});

test("a new post at the top makes OFFSET show an old post twice", () => {
  const first = pageByOffset(feed(10), 0, 5);                          // 10 9 8 7 6
  const second = pageByOffset(feed(11), 5, 5);                         // post 11 arrived, everything moved down
  assert.deepStrictEqual(ids(second), [6, 5, 4, 3, 2]);
  assert.ok(ids(second).includes(6) && ids(first).includes(6));        // 6 is in both pages
});

test("the same new post does not hurt CURSOR pages", () => {
  const first = pageByCursor(feed(10), null, 5);                       // 10 9 8 7 6
  const second = pageByCursor(feed(11), first.nextCursor, 5);
  assert.deepStrictEqual(ids(second.items), [5, 4, 3, 2, 1]);
});

test("a cursor still works when the post it points at was deleted", () => {
  const withoutSix = feed(10).filter((x) => x.id !== 6);
  assert.deepStrictEqual(ids(pageByCursor(withoutSix, 6, 5).items), [5, 4, 3, 2, 1]);
});

// ---- Part 3: one request for the same key ----

function slowLoader(delayMs = 5) {
  const calls = [];
  const load = (key) => { calls.push(key); return new Promise((resolve) => setTimeout(() => resolve(`value of ${key}`), delayMs)); };
  return { load, calls };
}

test("three callers with the same key share one request", async () => {
  const { load, calls } = slowLoader();
  const cache = createDedupe(load);
  const results = await Promise.all([cache.get("user:me"), cache.get("user:me"), cache.get("user:me")]);
  assert.deepStrictEqual(results, ["value of user:me", "value of user:me", "value of user:me"]);
  assert.deepStrictEqual(calls, ["user:me"]);
});

test("different keys make different requests", async () => {
  const { load, calls } = slowLoader();
  const cache = createDedupe(load);
  await Promise.all([cache.get("a"), cache.get("b")]);
  assert.deepStrictEqual(calls.sort(), ["a", "b"]);
});

test("with freshMs 0 a second call after the first one finished loads again", async () => {
  const { load, calls } = slowLoader();
  const cache = createDedupe(load);
  await cache.get("a");
  await cache.get("a");
  assert.strictEqual(calls.length, 2);
});

test("a saved value is used while it is fresh and loaded again when it is old", async () => {
  let clock = 1000;
  const { load, calls } = slowLoader(1);
  const cache = createDedupe(load, { now: () => clock, freshMs: 100 });
  await cache.get("a");
  clock = 1099;
  await cache.get("a");
  assert.strictEqual(calls.length, 1);                                  // 99 ms old: fresh
  clock = 1100;
  await cache.get("a");
  assert.strictEqual(calls.length, 2);                                  // 100 ms old: stale
});

test("invalidate forces a new request even when the value is fresh", async () => {
  const { load, calls } = slowLoader(1);
  const cache = createDedupe(load, { freshMs: 60000 });
  await cache.get("a");
  cache.invalidate("a");
  await cache.get("a");
  assert.strictEqual(calls.length, 2);
});

test("a failed request is shared by the waiting callers but is never saved", async () => {
  let n = 0;
  const load = async () => { n += 1; if (n === 1) throw new Error("network"); return "ok"; };
  const cache = createDedupe(load, { freshMs: 60000 });
  const [x, y] = await Promise.allSettled([cache.get("a"), cache.get("a")]);
  assert.strictEqual(x.status, "rejected");
  assert.strictEqual(y.status, "rejected");
  assert.strictEqual(n, 1);                                             // both callers shared the failed request
  assert.strictEqual(await cache.get("a"), "ok");                       // the failure was not saved: this one tries again
  assert.strictEqual(n, 2);
});

// ---- Part 4: an optimistic update with a rollback ----

const likes = (state) => state.map((p) => `${p.id}:${p.likes}`).join(" ");
const like = (id) => (state) => state.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p));
const start = () => [{ id: "a", likes: 10 }, { id: "b", likes: 5 }];
function later(ms, fail = false) {
  return () => new Promise((resolve, reject) => setTimeout(() => (fail ? reject(new Error("server said no")) : resolve()), ms));
}

test("the screen changes at once, before the server answers", async () => {
  const store = createOptimisticStore(start());
  const done = store.run(like("a"), later(20));
  assert.strictEqual(likes(store.getState()), "a:11 b:5");              // the server has not answered yet
  await done;
});

test("when the server says yes the change stays", async () => {
  const store = createOptimisticStore(start());
  assert.deepStrictEqual(await store.run(like("a"), later(5)), { ok: true });
  assert.strictEqual(likes(store.getState()), "a:11 b:5");
});

test("when the server says no the change is undone and the error is returned", async () => {
  const store = createOptimisticStore(start());
  const result = await store.run(like("a"), later(5, true));
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.message, "server said no");
  assert.strictEqual(likes(store.getState()), "a:10 b:5");
});

test("rolling back one failed change keeps the other change that is still waiting", async () => {
  const store = createOptimisticStore(start());
  const slowOk = store.run(like("a"), later(30));                       // like post a, the server is slow but says yes
  const fastNo = store.run(like("b"), later(5, true));                  // like post b, the server says no
  await fastNo;
  assert.strictEqual(likes(store.getState()), "a:11 b:5");              // b is undone, a is still shown
  await slowOk;
  assert.strictEqual(likes(store.getState()), "a:11 b:5");              // a was confirmed
});

test("two likes on the same post add up, and one failure removes only one", async () => {
  const store = createOptimisticStore(start());
  const first = store.run(like("a"), later(30, true));
  const second = store.run(like("a"), later(5));
  assert.strictEqual(likes(store.getState()), "a:12 b:5");
  await second;
  assert.strictEqual(likes(store.getState()), "a:12 b:5");
  await first;
  assert.strictEqual(likes(store.getState()), "a:11 b:5");
});

test("onChange is called with the new state each time the screen should change", async () => {
  const seen = [];
  const store = createOptimisticStore(start(), (state) => seen.push(likes(state)));
  await store.run(like("a"), later(5, true));
  assert.deepStrictEqual(seen, ["a:11 b:5", "a:10 b:5"]);
});

test("the start value is not changed", async () => {
  const original = start();
  const store = createOptimisticStore(original);
  await store.run(like("a"), later(1));
  assert.strictEqual(original[0].likes, 10);
});
