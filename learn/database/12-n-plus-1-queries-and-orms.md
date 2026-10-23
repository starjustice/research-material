# 12. N+1 queries and ORMs

> **Subject:** Database · **Lesson:** 12 · **Made:** 2026-10-16 · **Status:** ready
> **You will be able to:** say why one page can send 101 queries, find it in a query log, and fix it with a JOIN, an `= ANY($1)` batch, Prisma `include`, a GraphQL DataLoader, or Hasura.
> **Before this:** [Reading EXPLAIN](11-reading-explain.md) · **Next:** Transactions and ACID (lesson 13, not written yet)

## 1. The idea in one sentence

If your code asks the database for a list, and then asks again **once for every item** in the list, a page with 100 items sends 101 queries, and each one waits for its own trip over the network.

New words:

- **Round trip:** the app sends one query, then waits until the answer comes back. Every query costs at least one trip.
- **N+1:** 1 query for the list, then N more queries, one per item. With N = 100 stores, that is 101 queries.
- **Batch:** many small requests packed into one query. For example, "orders of stores 1, 2, 3 ... 100" in one go.
- **ORM:** a library that writes the SQL for you from code, like Prisma. (Interview word: *object relational mapper*.)

The rule to remember: **count the trips, not the speed of one query.**

## 2. The pictures

### 2a. The big picture

The same page can be built in two ways. Notice that the result is the same, but the number of trips is very different.

```mermaid
graph LR
    P["Page needs 100 stores and their orders"] -->|way 1| L["Loop and ask once per store"]
    P -->|way 2| B["Ask for all orders in one go"]
    L -->|sends| L2["1 + 100 = 101 queries"]
    B -->|sends| B2["1 + 1 = 2 queries"]
    L2 --> R["Same data on the page"]
    B2 --> R
```

### 2b. The problem, drawn

Every arrow to the right is a trip. Notice that the app is **waiting** the whole time, and the waiting adds up.

```mermaid
sequenceDiagram
    participant A as App
    participant D as Postgres
    A->>D: query 1 - give me 100 stores
    D-->>A: 100 rows
    A->>D: query 2 - orders of store 1
    D-->>A: 112 rows
    A->>D: query 3 - orders of store 2
    D-->>A: 114 rows
    Note over A,D: 97 more trips, one by one
    A->>D: query 101 - orders of store 100
    D-->>A: 139 rows
    Note over A: only now can the page be sent
```

### 2c. Why it hides

Each query alone looks fine. Notice that the number of queries follows the **data**, not the code. Your code did not change, but the page got slower.

```mermaid
graph LR
    D1["Test data with 5 stores"] -->|loop sends| Q1["6 queries - looks fine"]
    D2["Staging with 100 stores"] -->|loop sends| Q2["101 queries - a bit slow"]
    D3["Production with 1000 stores"] -->|loop sends| Q3["1001 queries - slow page"]
```

### 2d. How a fix works over time: DataLoader

In GraphQL, the `orders` resolver runs once per store. A DataLoader lets each resolver ask, but waits before it sends anything. Notice that 5 `load` calls become **one** query.

```mermaid
sequenceDiagram
    participant G as GraphQL
    participant L as DataLoader
    participant D as Postgres
    G->>D: query 1 - the stores
    D-->>G: 5 stores
    G->>L: load 1
    G->>L: load 2
    G->>L: load 3
    G->>L: load 4
    G->>L: load 5
    Note over L: the running code is done so the tick ends
    L->>D: query 2 - orders WHERE store_id = ANY of 1 to 5
    D-->>L: 8 rows mixed together
    L-->>G: 5 lists in the same order as the 5 keys
```

### 2e. What is in memory at one moment

A snapshot just before the tick ends (step 9 of tab 4 in the stepper). Notice that 5 promises are waiting, but only 1 query has been sent so far.

```mermaid
graph TB
    subgraph LD ["DataLoader for this request"]
        K["Waiting keys 1 2 3 4 5"]
    end
    R1["Alpha resolver waits"] -->|load 1| K
    R2["Bravo resolver waits"] -->|load 2| K
    R3["Cempaka resolver waits"] -->|load 3| K
    R4["Delta resolver waits"] -->|load 4| K
    R5["Elang resolver waits"] -->|load 5| K
    K -->|one batch when the tick ends| DB["Postgres - queries sent so far is 1"]
```

### 2f. Right against wrong

**Wrong:** a query inside a loop. The trips grow with the list.

```mermaid
graph LR
    A["SELECT the stores"] --> B["for each store"]
    B -->|one trip per store| C["SELECT orders WHERE store_id = this id"]
    C -->|repeat 100 times| B
```

**Right:** one trip for the list, one trip for all the children, then sort in code.

```mermaid
graph LR
    A["SELECT the stores"] -->|collect ids| B["ids 1 to 100 in app memory"]
    B -->|one trip| C["SELECT orders WHERE store_id = ANY of the ids"]
    C -->|group by store_id| D["each store gets its list"]
```

**Also wrong, the opposite mistake:** one giant join of a store with **two** child lists. The rows multiply (fan-out, from [lesson 02](02-joins.md)). Notice how 3 orders and 2 point rows become 6 rows.

```mermaid
graph LR
    S["Alpha"] -->|join| O["3 orders"]
    O -->|join again| P["2 point rows each"]
    P --> X["6 rows - SUM of orders counts each order twice"]
```

### 2g. Which tool does what

Notice that every fix ends at 1 or 2 queries, no matter how many stores there are.

```mermaid
graph TB
    N["Page with N stores and their orders"]
    N -->|Prisma include with query strategy| P1["2 queries - second one uses IN"]
    N -->|Prisma include with join strategy| P2["1 query - orders packed as JSON"]
    N -->|GraphQL resolver plus DataLoader| G["2 queries - keys batched per tick"]
    N -->|Hasura nested query| H["1 SQL query - built by Hasura"]
    N -->|hand written SQL| S["1 JOIN or 1 ANY batch"]
```

## 3. Real life analogy

You need 100 items from a shop that is 10 minutes away.

- **N+1:** you drive there, buy one item, drive home. Then you do it again 100 times. Each drive is short, but the day is gone.
- **Batch:** you write one shopping list and make one drive.

Where the analogy stops: a real shop does not care how long the list is. A database does. One huge query can be slow too, and one giant join can bring back far more rows than you need (picture 2f).

## 4. The smallest code that shows it

This runs against the practice database (stores, orders). `db` is a connected Postgres client, for example from the `pg` package. The helper `q` counts every query sent.

```js
let count = 0;
const q = (sql, params) => { count++; return db.query(sql, params); };

const stores = (await q("SELECT id, name FROM stores ORDER BY id LIMIT 100")).rows;
for (const s of stores) {
  s.orders = (await q("SELECT id, total_cents FROM orders WHERE store_id = $1", [s.id])).rows;
}
console.log("loop:", count, "queries");

count = 0;
const stores2 = (await q("SELECT id, name FROM stores ORDER BY id LIMIT 100")).rows;
const ids = stores2.map(s => s.id);
const orders = (await q("SELECT id, store_id, total_cents FROM orders WHERE store_id = ANY($1)", [ids])).rows;
const byStore = Map.groupBy(orders, o => o.store_id);
for (const s of stores2) s.orders = byStore.get(s.id) ?? [];
console.log("batch:", count, "queries");
```

**Output:**

```
loop: 101 queries
batch: 2 queries
```

Both versions put exactly the same orders on each store. The `?? []` matters: a store with no orders is missing from the Map, and it must get an empty list.

Checked on 2026-10-16 with Node 24.15.0 and PostgreSQL 18.3 (PGlite) on the practice seed. `Map.groupBy` needs Node 21 or newer.

## 5. What really happens, step by step

The trace of section 4. The practice seed has **exactly 100,000 orders** and no index on `orders.store_id` yet. Your row counts per store will be a little different, because the seed uses random numbers.

| Step | Code | What the app does | What Postgres does | Queries so far | Rows Postgres read |
|---|---|---|---|---|---|
| 1 | `SELECT ... FROM stores LIMIT 100` | sends query 1, then waits | walks the `stores_pkey` index and stops after 100 rows | 1 | 100 |
| 2 | loop, store 1 | sends `WHERE store_id = $1` with 1, then waits | `Seq Scan on orders`: reads all 100,000 rows, keeps 112, throws away 99,888 | 2 | about 100,100 |
| 3 | loop, store 2 | sends the same query with 2, then waits | reads all 100,000 rows **again**, keeps 114 | 3 | about 200,100 |
| 4 | stores 3 to 99 | 97 more trips, one after the other | 97 more full reads of the table | 100 | about 9,900,100 |
| 5 | loop, store 100 | the last trip | reads all 100,000 rows, keeps 139 | **101** | about **10,000,100** |
| 6 | `count = 0`, stores again | sends query 1 of the batch version | 100 store rows | 1 | 100 |
| 7 | `stores2.map(s => s.id)` | builds `[1, 2, ... 100]` in its own memory, **no trip** | nothing | 1 | 100 |
| 8 | `WHERE store_id = ANY($1)` | sends the whole list as **one** parameter | `Seq Scan on orders` **once**: keeps 11,054 rows that match any of the 100 ids | **2** | about 100,100 |
| 9 | `Map.groupBy` | sorts the 11,054 rows into 100 lists by `store_id` | nothing | 2 | |
| 10 | `?? []` | a store with no orders gets `[]` | nothing | 2 | |

What to notice:

- The loop made **101 trips**. The batch made **2**.
- Without an index, the loop also read the whole orders table **100 times**. That is about 10 million rows read, against 100 thousand.
- An index on `orders.store_id` ([lesson 09](09-indexes-and-b-trees.md)) makes each loop query fast. But it does **not** remove the 101 trips.

Real plan for one loop query (step 2), from `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF)`:

```
Seq Scan on orders (actual rows=112.00 loops=1)
  Filter: (store_id = 1)
  Rows Removed by Filter: 99888
```

Real plan for the batch query (step 8), with the 100 ids written out:

```
Seq Scan on orders (actual rows=11054.00 loops=1)
  Filter: (store_id = ANY ('{1,2,3, ... ,100}'::integer[]))
  Rows Removed by Filter: 88946
```

(The middle of the id list is cut short here.)

**Step through it yourself:** [open the N+1 stepper](visuals/12-n-plus-1-queries-and-orms.html). The app is on the left and Postgres on the right. Press Next and watch the query counter. It has five tabs, all with the 5 tiny stores from the practice file:

1. The N+1 loop (6 trips)
2. Fix 1, one JOIN
3. Fix 2, the `ANY` batch
4. Fix 3, DataLoader collecting keys in one tick
5. Prisma join and Hasura, one query with JSON lists

<details><summary>Go deeper (optional): Postgres 16 against 18, and timing</summary>

- These plans come from PostgreSQL 18.3. In your Docker playground (PostgreSQL 16) you will see `actual rows=112` with no `.00`. Plans that use an index also show an extra line `Index Searches: 1` on 18 only.
- Timing in PGlite is not the same as a real server, so this lesson shows trips and rows read, not milliseconds. On a real network, every trip also adds network time. For example, 101 trips of 1 ms each add about 100 ms of pure waiting.
- `pg_stat_statements` groups an `IN (...)` list on PostgreSQL 18 into one line, even when the list length changes. On 16, an `IN` list of 7 values and one of 8 values can show as two lines. `= ANY($1)` with one array parameter shows as one line on both.

</details>

## 6. Why it exists and what it costs

- **Problem without a fix:** the page waits for one trip per item. It looks fine with test data, then gets slower as the data grows. It also puts more load on the database and uses a connection for longer.
- **Why it happens so easily:**
  - A loop with `await` inside looks innocent.
  - In GraphQL, each resolver only sees its own parent. The `orders` resolver for Alpha does not know that Bravo is asking too.
  - With an ORM, a "lazy" relation can send a query when you just read a field.
- **How to see it:**
  - **Prisma log.** `new PrismaClient({ log: ["query"] })` prints every SQL query. In Prisma 7, you also pass your `adapter` in the same object. Look for the same query printed many times in a row.
  - **pg_stat_statements.** This view counts how many times each query shape ran. The Docker playground has it turned on. Look at the `calls` column. If `SELECT ... WHERE store_id = $1` has `calls` going up by 100 for every page view, you found an N+1.
  - **APM tools** (Datadog, New Relic, Sentry and similar) draw one bar per query under one request. N+1 looks like a long staircase of tiny, equal bars.
- **The fixes:**
  - **One JOIN.** One trip. The parent columns repeat on every child row.
  - **One batch with `IN` or `= ANY($1)`.** Two trips. You must group the rows in code and give empty lists to parents with no children.
  - **Prisma `include`.** Prisma loads the relation for all parents. Its docs say the default `query` strategy sends one query per table, with `IN` for the children. With `relationLoadStrategy: "join"`, it sends one query with the children packed as JSON.
  - **DataLoader in GraphQL.** Each resolver calls `loader.load(id)`. The loader collects all keys from one tick, then calls your batch function once.
  - **Hasura.** Hasura turns one GraphQL query into one SQL query. You do not write resolvers, so there is nothing to batch.
- **Cost or tradeoff:**
  - A batch has to be grouped in code, and the batch function must return values in the same order as the keys.
  - A very long id list makes a big query. Paginate the parents ([lesson 17, not written yet](README.md)).
  - One giant join with two child lists fans out and gives wrong sums (picture 2f). Use two batches, or group each child table first.
  - A DataLoader must be made **once per request**. A shared loader keeps a cache across users and can show one user's data to another.

<details><summary>Go deeper (optional): Prisma versions, the generated SQL, and Hasura's explain</summary>

- **Prisma 7.** The docs for Prisma ORM 7 say `relationLoadStrategy` is still in Preview. You turn it on with `previewFeatures = ["relationJoins"]` in the generator block. It works on PostgreSQL, CockroachDB and MySQL. With the flag on, `join` is the default, and `query` is the other choice. Without the flag, Prisma always uses the `query` way.
- **What `join` sends on PostgreSQL.** One query with a `LEFT JOIN LATERAL` and `JSONB_AGG`. For each parent row, the lateral part finds that parent's children and packs them into one JSON list. Task 5 in the practice file builds the same shape by hand.
- **The Prisma log example** in the docs shows the `query` strategy: one `SELECT ... FROM "User"`, then one `SELECT ... FROM "Post" WHERE "authorId" IN ($1,$2,$3,$4)`.
- **Prisma's own batching.** Prisma groups `findUnique()` calls made in the same tick into one query. The docs suggest `prisma.store.findUnique({ where: { id } }).orders()` in resolvers for this reason. `findMany()` is not batched.
- **Prisma ORM 8.** On 2026-10-16, the Prisma docs call Prisma ORM 8 a release candidate, a full TypeScript rewrite with a new API. Its docs say `.include("posts")` reads the relation in the same SQL statement with a correlated subquery. Check the release status page before you use it.
- **Hasura.** Hasura says it compiles a GraphQL query instead of resolving it field by field, and makes one SQL query for a query of any depth. It builds the JSON inside Postgres with `json_agg`. The admin endpoint `POST /v1/graphql/explain` returns the SQL and the Postgres plan for each top level field. A query with two top level fields becomes two SQL queries.
- **Hasura is not free of N+1 everywhere.** Remote schemas, actions and remote joins call other services. Those calls are outside the single SQL query.

</details>

## 7. Common mistakes

**Wrong:** a query inside a loop.

```js
const stores = await prisma.store.findMany();
for (const store of stores) {
  store.orders = await prisma.order.findMany({ where: { storeId: store.id } }); // one trip per store
}
```

**Right:** ask for the relation once.

```js
const stores = await prisma.store.findMany({ include: { orders: true } });
```

**Why:** `include` loads the orders of all stores together. With the default `query` strategy that is 2 queries, not 1 + N.

**Wrong:** a GraphQL resolver that queries the database directly.

```js
const resolvers = {
  Store: {
    orders: (store) => db.query("SELECT * FROM orders WHERE store_id = $1", [store.id]),
  },
};
```

**Right:** a DataLoader, made once per request in the context.

```js
const context = () => ({
  ordersLoader: new DataLoader(async (storeIds) => {
    const { rows } = await db.query("SELECT * FROM orders WHERE store_id = ANY($1)", [storeIds]);
    const byStore = Map.groupBy(rows, r => r.store_id);
    return storeIds.map(id => byStore.get(id) ?? []);   // same order as the keys
  }),
});
const resolvers = {
  Store: { orders: (store, _args, ctx) => ctx.ordersLoader.load(store.id) },
};
```

**Why:** GraphQL calls the resolver once per store. With the real `dataloader` 2.2.3 and `graphql` 17.0.2 packages, the query `{ stores { name orders { id } } }` on the 5 tiny stores sent **6** queries without the loader and **2** with it.

**Wrong:** forgetting parents with no children.

```js
for (const s of stores) s.orders = byStore.get(s.id);   // Elang gets undefined
```

**Right:** `byStore.get(s.id) ?? []`.

**Why:** `IN` and `ANY` only return rows that exist. A store with no orders is simply not there.

**Wrong:** fixing N+1 with one join over two child tables, then summing.

```sql
SELECT s.id, SUM(o.total_cents)
FROM l12_stores s
JOIN l12_orders o ON o.store_id = s.id
LEFT JOIN l12_points p ON p.store_id = s.id
GROUP BY s.id;          -- Alpha shows 2800, the real total is 1400
```

**Right:** sum each child table on its own first, then join the small results (practice task 6).

**Why:** every order row is repeated once per point row. This is fan-out from [lesson 02](02-joins.md).

## 8. Watch and play

Links checked on 2026-10-16. Each page was opened. For the videos, the title, channel and length were confirmed on YouTube.

- **Play with it:** [The N+1 stepper](visuals/12-n-plus-1-queries-and-orms.html) in this folder. Guess the number of queries first, then press Next.
- **Video:** [GraphQL N+1 Problem](https://www.youtube.com/watch?v=uCbFMZYQbxE) by Ben Awad, about 16 minutes. He shows the extra queries in the log, then fixes them with DataLoader.
- **Video:** [Explaining n+1 in GraphQL](https://www.youtube.com/watch?v=7PSEETJRVS8) by Adam Malone at API World 2024, on the Zuplo channel, 1 minute. A quick recap, and how a compiled query like Hasura avoids it.
- **Read:** [Solving the N+1 Problem with DataLoader](https://www.graphql-js.org/docs/n1-dataloader/) in the GraphQL.js docs. The 10 posts and 11 queries example, and why the loader is made per request.
- **Read:** [Query optimization](https://www.prisma.io/docs/orm/v7/prisma-client/queries/advanced/query-optimization-performance) in the Prisma 7 docs. Look at "Solving the n+1 problem" and the `include` and fluent API examples.
- **Read:** [Choosing the Best Join Strategy in Prisma ORM](https://www.prisma.io/blog/prisma-orm-now-lets-you-choose-the-best-join-strategy-preview) on the Prisma blog. Diagrams of `join` against `query`, and the SQL Prisma sends.
- **Play with it:** [explain.dalibo.com](https://explain.dalibo.com/). Paste the plan of the batch query and of one loop query from section 5, and compare.

<details><summary>More links (optional)</summary>

- **Video:** [How Prisma Solves the N+1 Problem in GraphQL Resolvers](https://www.youtube.com/watch?v=7oMfBGEdwsc) by Tim Suchanek at Prisma Day 2020, about 33 minutes. Older, but it explains Prisma's `findUnique` batching.
- **Video:** [DataLoader and the Problem it solves in GraphQL](https://www.youtube.com/watch?v=ld2_AS4l19g) by knowthen, about 22 minutes.
- **Video:** [DataLoader, Source code walkthrough](https://www.youtube.com/watch?v=OQTnXNCDywA) by Lee Byron, about 35 minutes. How the real library collects keys.
- **Read:** [graphql/dataloader on GitHub](https://github.com/graphql/dataloader). The rules for the batch function and the per request cache.
- **Read:** [Relation queries in the Prisma 7 docs](https://www.prisma.io/docs/orm/v7/prisma-client/queries/relation-queries). The `relationLoadStrategy` section.
- **Read:** [Logging in the Prisma 7 docs](https://www.prisma.io/docs/orm/v7/prisma-client/observability-and-logging/logging). The `log` option and the `$on("query")` event.
- **Read:** [Hasura Explain API](https://hasura.io/docs/2.0/api-reference/explain/). See the SQL Hasura makes for a query.
- **Read:** [Architecture of a high performance GraphQL to SQL engine](https://hasura.io/blog/architecture-of-a-high-performance-graphql-to-sql-server-58d9944b8a87) on the Hasura blog, from 2018. The albums and tracks N+1 example.
- **Read:** [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) in the PostgreSQL docs. The `calls` column.
- **Read:** [Prisma ORM release status](https://www.prisma.io/docs/orm/release-status). Where Prisma 7 and Prisma 8 stand.

</details>

## 9. Practice

**A. Predict the output** (write your answer before opening)

A GraphQL server runs `{ stores { name orders { id } } }` for 50 stores. The `orders` resolver uses a DataLoader. How many SQL queries does this send? And what if the loader is **removed**?

<details><summary>Answer</summary>

With the DataLoader: **2**. One for the stores, and one batch for all 50 stores' orders.

Without it: **51**. One for the stores, and one for each of the 50 stores.

The loader waits until the running code is done (the end of the tick). By then, GraphQL has called all 50 resolvers, so all 50 keys are in one list.

</details>

**B. Fix the bug**

This loader sends one query per request, but some stores show the wrong orders.

```js
const ordersLoader = new DataLoader(async (storeIds) => {
  const { rows } = await db.query(
    "SELECT * FROM orders WHERE store_id = ANY($1) ORDER BY store_id", [storeIds]);
  const byStore = Map.groupBy(rows, r => r.store_id);
  return [...byStore.values()];
});
```

<details><summary>Answer</summary>

DataLoader needs the answers **in the same order as the keys**, and the **same number** of answers. `byStore.values()` follows the order of the rows, not the keys. A store with no orders is missing, so the list is also too short. DataLoader then fails, because it got the wrong number of values.

Fix: walk the keys, not the rows.

```js
return storeIds.map(id => byStore.get(id) ?? []);
```

</details>

**C. Write it yourself**

Two parts.

**SQL part.** Open `practice/12-n-plus-1-queries-and-orms.sql`. It makes three tiny tables (5 stores, 8 orders, 3 point rows). Six tasks: count the trips, the `IN` batch, the `ANY` batch, one JOIN, one row per store with a JSON list (the Prisma join and Hasura shape), and the fan-out trap. Every task has its expected result.

**JavaScript part.** Open `practice/12-n-plus-1-dataloader.js`. A fake database counts every query. Write `loadOrdersForStores` (one query, then group) and `createLoader` (a tiny DataLoader). Run the tests from the folder that contains `learn/`:

```
node --test learn/database/practice/12-n-plus-1-dataloader.test.js
```

At the start, 1 test passes: it shows that the N+1 way sends 5 queries for 5 stores.

<details><summary>One possible answer</summary>

SQL tasks:

```sql
-- Task 1. a) 6 queries: 1 for the stores + 1 for each of the 5 stores.
-- b)
SELECT id, total_cents FROM l12_orders WHERE store_id = 3 ORDER BY id;

-- Task 2. Store 5 is not in the result. The app must give it an empty list.
SELECT id, store_id, total_cents
FROM l12_orders
WHERE store_id IN (1, 2, 3, 4, 5)
ORDER BY store_id, id;

-- Task 3
SELECT id, store_id, total_cents
FROM l12_orders
WHERE store_id = ANY(ARRAY[1, 2, 3, 4, 5])
ORDER BY store_id, id;

-- Task 4
SELECT s.id AS store_id, s.name, o.id AS order_id, o.total_cents
FROM l12_stores s
LEFT JOIN l12_orders o ON o.store_id = s.id
ORDER BY s.id, o.id;

-- Task 5 (the LATERAL way, like Prisma "join")
SELECT s.id, s.name, o.orders
FROM l12_stores s
LEFT JOIN LATERAL (
  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('id', x.id, 'total_cents', x.total_cents) ORDER BY x.id),
           '[]') AS orders
  FROM l12_orders x
  WHERE x.store_id = s.id
) o ON true
ORDER BY s.id;

-- Task 5 (another way, with GROUP BY)
SELECT s.id, s.name,
       COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'total_cents', o.total_cents) ORDER BY o.id)
                FILTER (WHERE o.id IS NOT NULL), '[]') AS orders
FROM l12_stores s
LEFT JOIN l12_orders o ON o.store_id = s.id
GROUP BY s.id, s.name
ORDER BY s.id;

-- Task 6. a) Alpha has 3 orders and 2 point rows. The join makes 3 x 2 = 6 rows,
-- so every order is counted twice: 1400 x 2 = 2800.
-- b) Sum each child table on its own, then join the small results.
SELECT s.id, s.name, o.order_total, COALESCE(p.points, 0) AS points
FROM l12_stores s
LEFT JOIN (SELECT store_id, SUM(total_cents) AS order_total FROM l12_orders GROUP BY store_id) o
  ON o.store_id = s.id
LEFT JOIN (SELECT store_id, SUM(amount) AS points FROM l12_points GROUP BY store_id) p
  ON p.store_id = s.id
ORDER BY s.id;
```

JavaScript tasks:

```js
async function loadOrdersForStores(db, storeIds) {
  const rows = await db.ordersOfStores(storeIds);   // one trip
  const byStore = new Map();                          // store id -> its orders
  for (const row of rows) {
    if (!byStore.has(row.store_id)) byStore.set(row.store_id, []);
    byStore.get(row.store_id).push(row);
  }
  return storeIds.map(id => byStore.get(id) ?? []);   // same order as storeIds
}

function createLoader(batchFn) {
  let waiting = [];   // { key, resolve, reject } for every load() in this tick

  async function sendBatch() {
    const batch = waiting;
    waiting = [];                                      // the next tick starts a new list
    const keys = [...new Set(batch.map(w => w.key))];  // each key only once
    try {
      const values = await batchFn(keys);
      for (const w of batch) w.resolve(values[keys.indexOf(w.key)]);
    } catch (err) {
      for (const w of batch) w.reject(err);
    }
  }

  return {
    load(key) {
      return new Promise((resolve, reject) => {
        waiting.push({ key, resolve, reject });
        if (waiting.length === 1) process.nextTick(sendBatch); // first key: plan one send
      });
    },
  };
}
```

All 10 tests pass with this answer. The real DataLoader waits a little longer than `process.nextTick`: it waits until the promise callbacks that are already queued have run too. Lesson 11 of JavaScript, [the event loop](../javascript/11-the-event-loop.md), explains ticks and promise callbacks.

</details>

## 10. Interview question

**Q:** "Our GraphQL API is slow on the store list page, but every single query in the log is fast. What is going on, and how do you fix it?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** this sounds like N+1. The list query runs once, then the `orders` resolver runs once per store. 100 stores means 101 queries, and each one costs a round trip. Each query is fast, so nothing looks wrong alone. The count grows with the data, so it gets worse in production.
2. **How it works and how I find it:** I would check the query log. In Prisma that is `log: ["query"]`. In Postgres, `pg_stat_statements` shows a `calls` count that jumps by N per request. An APM trace shows a staircase of small equal queries. Then I fix it so the number of queries does not depend on N:
   - one JOIN, or one batch with `WHERE store_id = ANY($1)` that I group in code;
   - in Prisma, `include`, which loads the relation for all parents at once;
   - in GraphQL resolvers, a DataLoader made per request, which collects the keys from one tick and sends one `ANY` query;
   - in Hasura, nothing to do, because it compiles the whole GraphQL query into one SQL query.
3. **Tradeoff:** a batch must be grouped in code and keep the order of the keys. Very long id lists need pagination. A giant join over two child lists fans out and gives wrong sums, so sometimes 2 or 3 batched queries are better than 1 join. A DataLoader must never be shared across requests, because its cache could leak data between users.
4. **My example:** *This is an idea, not a fact. Replace it with your own real story.* DBO has stores, orders and loyalty points, with an admin CMS on GraphQL and Hasura. A store list that shows each store's latest orders and points balance is the classic N+1 shape. Hasura would avoid it for table queries. A custom resolver or Express endpoint written with Prisma in a loop would not. Check your own code for a `findMany` or `findUnique` inside a loop, or a resolver that queries per parent.

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain N+1 out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the words "round trip", "batch" and "DataLoader". Draw the 101 arrows picture while you talk. Then save the transcript into `my-learning/recordings/`, or write your best version below. Run `/explain-check n-plus-1-queries` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. A page lists 100 stores and their orders with a loop. How many queries is that, and why is it slow when each query takes only 1 ms?
2. Name three ways to load the orders of 100 stores in one or two queries.
3. What two rules must a DataLoader batch function follow, and why must the loader be made once per request?
4. Draw the picture from section 2b from memory: the app, Postgres, and the arrows. Then draw the fixed version with 2 arrows.

<details><summary>Answers</summary>

1. 101 queries: 1 for the list, 1 per store. Each query waits for its own round trip, one after the other. The waiting adds up, and it grows with the number of stores. Without an index on `store_id`, each query also reads the whole orders table.
2. Any three of: one JOIN; one batch with `WHERE store_id IN (...)` or `= ANY($1)` and group in code; Prisma `include` (with the `query` or `join` strategy); a DataLoader in GraphQL resolvers; a Hasura nested query.
3. It must return the same number of values as keys, in the same order as the keys (missing ones as `[]` or `null`). It must be made per request, because it caches values, and a shared cache could show one user's data to another and keep old data.
4. App on the left, Postgres on the right. Arrow 1 "100 stores", then arrows 2 to 101 "orders of store 1" ... "orders of store 100", each with a reply. The fixed version: arrow 1 "stores", arrow 2 "orders WHERE store_id = ANY of the 100 ids", then group in the app.

</details>

## Connected lessons

- [Joins](02-joins.md): the JOIN fix, and fan-out, the opposite mistake.
- [Indexes and B-trees](09-indexes-and-b-trees.md): an index on `orders.store_id` makes each query fast, but does not remove the trips.
- [Reading EXPLAIN](11-reading-explain.md): the lesson before. EXPLAIN shows one query. N+1 is about how many queries there are, so you also need the log.
- [The event loop](../javascript/11-the-event-loop.md) (JavaScript): what a tick is, and why DataLoader can collect keys before it sends.
- Pagination (lesson 17, not written yet): keep the parent list small, so the batch stays small.
- Connection pooling (lesson 20, not written yet): many trips also hold a database connection for longer.
- [PostgreSQL queries and indexing guide](postgresql-queries-interview-guide.md): the longer guide, for revision.
