# 10. Composite, partial and covering indexes

> **Subject:** Database · **Lesson:** 10 · **Made:** 2026-10-16 · **Status:** ready
> **You will be able to:** pick the column order for a two-column index, say why it beats two single indexes, build a partial and a covering index, and list six reasons Postgres ignores an index.
> **Before this:** [Indexes and B-trees](09-indexes-and-b-trees.md) · **Next:** [Reading EXPLAIN](11-reading-explain.md)

## 1. The idea in one sentence

One index can be sorted by two columns, like a phone book sorted by last name and then first name, and Postgres can only jump in using the first one.

Words from lesson 09 that you need here:

- An **index entry** is one line in the index: the sorted value plus a pointer to the row in the table.
- A **Seq Scan** means Postgres reads every row of the table. An **Index Scan** means Postgres uses an index.
- `EXPLAIN` prints the plan Postgres picked. A **Sort** step in the plan means Postgres had to sort rows itself.

New words, at most 4:

- **Composite index:** one index on two or more columns, sorted by the first, then by the second inside it. (Interview words: *multicolumn index*, *compound index*.)
- **Partial index:** an index that holds only some rows, the ones that match a `WHERE` you write when you make it.
- **Covering index:** an index that holds every column a query needs, so Postgres never opens the table. In Postgres you add the extra columns with `INCLUDE`.
- **Skip scan:** new in Postgres 18. Postgres jumps once per value of the first column, so it can use the index without that column.

The rule to remember: **equality columns first, then the sort or range column. Postgres jumps with the first column, then reads in order and stops early.**

## 2. The pictures

### 2a. The big picture

The DBO admin shows "the 5 newest orders of this store". Notice that Postgres never sorts anything: the index is already in the right order.

```mermaid
graph LR
    Q["Query: store 42, newest 5"] -->|uses| I["Index sorted by store, then newest date"]
    I -->|jump to| J["First entry of store 42"]
    J -->|read in order| R["Entries 1 to 5"]
    R -->|LIMIT 5 reached| S["Stop. 5 rows. No Sort."]
```

### 2b. The problem, drawn

Without the right index Postgres has two bad choices. Notice how much each one reads to keep only 5 rows. The numbers come from the practice database with 100,000 orders.

**No index:** read everything, then sort.

```mermaid
graph LR
    A["Read all 100,000 orders"] -->|keep store 42| B["139 rows"]
    B -->|sort by date| C["Sorted 139 rows"]
    C -->|keep top 5| D["5 rows"]
```

**Two single indexes, one on store_id and one on created_at:** walk the dates and check each store.

```mermaid
graph LR
    A["Walk the date index, newest first"] -->|for each entry| B["Open the table to see the store"]
    B -->|wrong store| C["Throw away. 3,787 times."]
    B -->|store 42| D["Keep. Stop at 5."]
```

### 2c. How it works over time

The same query with one index on `(store_id, created_at DESC)`. Notice the loop runs exactly 5 times.

```mermaid
sequenceDiagram
    participant A as Your app
    participant P as Planner
    participant I as Index
    participant T as Table
    A->>P: store_id = 42, newest first, LIMIT 5
    Note over P: store_id is the first index column so a jump is possible
    Note over P: created_at DESC is the second column so the order is already right
    P->>I: jump to the first entry of store 42
    loop 5 times
        I->>T: follow the pointer of the next entry
        T-->>A: one row
    end
    Note over I: LIMIT 5 reached. The other 134 entries of store 42 are never read.
```

### 2d. What is on disk right now

This is the whole index for the 13 small orders used in the stepper and the practice file. Notice the dates go newest first **inside** each store. Dates of different stores are not next to each other.

```mermaid
graph LR
    subgraph S7 ["Store 7"]
        A1["10-12 row 13"] --> A2["10-11 row 12"] --> A3["10-09 row 10"] --> A4["10-07 row 8"] --> A5["10-05 row 6"] --> A6["10-03 row 3"] --> A7["10-01 row 1"]
    end
    subgraph S8 ["Store 8"]
        B1["10-10 row 11"] --> B2["10-06 row 7"] --> B3["10-03 row 4"]
    end
    subgraph S9 ["Store 9"]
        C1["10-08 row 9"] --> C2["10-04 row 5"] --> C3["10-01 row 2"]
    end
    A7 --> B1
    B3 --> C1
```

Now look for "every order on 10-03". One is in store 7 and one is in store 8. There is no single place to jump to. That is the leftmost column rule.

### 2e. Right against wrong

**Wrong:** two single indexes. Neither one knows both columns.

```mermaid
graph LR
    W1["Index on store_id"] -->|finds store 42 but| W3["rows come out unsorted so Postgres sorts"]
    W2["Index on created_at"] -->|in order but| W4["store unknown so Postgres throws rows away"]
```

**Right:** one composite index with the equality column first.

```mermaid
graph LR
    R1["Index on store_id then created_at"] -->|jump to| R2["store 42"]
    R2 -->|read already sorted| R3["5 rows then stop"]
```

### 2f. The leftmost column rule, and the Postgres 18 exception

Notice what decides it: does the query give a value for the first column?

```mermaid
graph TB
    Q["Index on store_id then created_at"] --> A["Query gives store_id"]
    Q --> B["Query gives only created_at"]
    A -->|jump| A1["Fast Index Scan"]
    B -->|Postgres 16 or 17| B1["Read the whole index or the whole table"]
    B -->|Postgres 18 and few stores| B2["Skip scan with one jump per store"]
    B -->|Postgres 18 and many stores| B3["Still a Seq Scan"]
```

### 2g. Three special shapes

Notice each one solves a different waste.

```mermaid
graph LR
    P["Partial index WHERE status = PENDING"] -->|less to store and search| P1["Only 14 percent of rows. 336 kB not 3,352 kB."]
    C["Covering index INCLUDE total_cents"] -->|no trip to the table| C1["Index Only Scan"]
    E["Index on lower of name"] -->|matches a query that uses lower| E1["Search without caring about capitals"]
```

## 3. Real life analogy

A phone book is sorted by last name, then by first name.

- "Find Tan, Budi": open at the Tans, then find Budi. Fast. (Both columns.)
- "Find all the Tans": open at the Tans, read until they end. Fast. (First column only.)
- "Find everyone called Budi": the Budis are spread across every last name. You read the whole book. (Second column only.)
- A partial index is a small book with only the people who owe money.
- A covering index is a book that prints the phone number next to each name, so you never call the office to ask.

Where the analogy stops: Postgres reads its "book" backward as fast as forward. And Postgres 18 can flip to each last name and look for Budi there. That is skip scan. A person would also do that if the book had only five last names.

## 4. The smallest code that shows it

Run this in the practice database. First without an index, then with one.

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF)
SELECT id, total_cents, created_at FROM orders
WHERE store_id = 42 ORDER BY created_at DESC LIMIT 5;

CREATE INDEX orders_store_created_idx ON orders (store_id, created_at DESC);

-- run the same EXPLAIN again
```

**Output before the index:**

```
Limit (actual rows=5.00 loops=1)
  ->  Sort (actual rows=5.00 loops=1)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 17kB
        ->  Seq Scan on orders (actual rows=139.00 loops=1)
              Filter: (store_id = 42)
              Rows Removed by Filter: 99861
```

**Output after the index:**

```
Limit (actual rows=5.00 loops=1)
  ->  Index Scan using orders_store_created_idx on orders (actual rows=5.00 loops=1)
        Index Cond: (store_id = 42)
        Index Searches: 1
```

The Sort step is gone. `Index Cond` means Postgres used `store_id` to jump. The seed uses random data, so your row counts will be a bit different.

Checked on 2026-10-16 with PostgreSQL 18.3 (PGlite). On your Docker Postgres 16 you will see `rows=5` without decimals and no `Index Searches` line.

## 5. What really happens, step by step

The stepper's first program uses the 13 small orders from picture 2d and the index `(store_id, created_at DESC)`.

```sql
SELECT id, created_at, total_cents FROM l10_orders
WHERE store_id = 7 ORDER BY created_at DESC LIMIT 5;
```

| Step | What Postgres does | Where the reader is | Rows sent | Table visits |
|---|---|---|---|---|
| 1 | The planner sees `store_id = 7`. The index starts with store_id, so it can jump. Inside a store the dates are newest first, which matches `ORDER BY`. No Sort needed. | not started | none | 0 |
| 2 | It walks down the index tree to the first entry of store 7. | store 7, 10-12 | none | 0 |
| 3 | It follows the pointer to row 13 to get `total_cents`. It sends the row. | store 7, 10-12 | 13 | 1 |
| 4 | Next entry. Same thing. | store 7, 10-11 | 13, 12 | 2 |
| 5 | Next entry. | store 7, 10-09 | 13, 12, 10 | 3 |
| 6 | Next entry. | store 7, 10-07 | 13, 12, 10, 8 | 4 |
| 7 | Next entry. That is 5 rows. | store 7, 10-05 | 13, 12, 10, 8, 6 | 5 |
| 8 | `LIMIT 5` is reached, so it stops. Two older store 7 entries and all of stores 8 and 9 are never read. | stopped | 5 rows | 5 |

Real result: rows 13, 12, 10, 8, 6. The same work on the 100,000-row seed, counted in 8 kB pages:

| Plan | Pages Postgres touched |
|---|---|
| No index: Seq Scan, then Sort | 837 |
| Two single indexes: walk dates, throw away 3,787 rows | 3,800 |
| One composite index | 8 |

**Step through it yourself:** [open the stepper](visuals/10-composite-partial-and-covering-indexes.html). It has five programs: "Both columns", "Two single indexes", "Only the second column" (with skip scan), "Partial index" and "Covering index". Each one asks you to predict a number first. Watch the counters for jumps, entries read and table visits.

## 6. Why it exists and what it costs

**Composite index**

- **Problem without it:** a query filters on one column and sorts by another. Single indexes force a Sort or wasted reads.
- **How it solves it:** one sorted list. Postgres jumps with the first column and reads the second in order.
- **Column order:** put columns you test with `=` first. Put the sort or range column (`>=`, `BETWEEN`, `ORDER BY`) last. On the seed, `(created_at, store_id)` touched 101 index pages for "store 42, last 90 days". `(store_id, created_at)` touched 3.

**Partial index**

- **Problem without it:** a worker asks every few seconds for the oldest PENDING orders. A full index also stores every PAID and DELIVERED order, which this query never needs.
- **How it solves it:** `CREATE INDEX ON orders (created_at) WHERE status = 'PENDING'` stores only the hot rows. On the seed it was 336 kB, against 3,352 kB for a full `(status, created_at)` index.
- **Cost:** Postgres uses it only when the query repeats the same condition. A query for PAID cannot use it.

**Covering index**

- **Problem without it:** the index finds the row, but the query wants one more column. So Postgres visits the table for every row.
- **How it solves it:** `INCLUDE (total_cents)` stores the value in the index. The plan becomes `Index Only Scan`, with `Heap Fetches: 0`. A heap fetch is a trip to the table.
- **Cost:** a bigger index. And Postgres can skip the table only for pages that `VACUUM` has marked as clean. Right after the inserts it printed `Heap Fetches: 5`. After `VACUUM orders` it printed `Heap Fetches: 0`.

**Every index costs writes.** Each `INSERT`, and each `UPDATE` of an indexed column, must also change every index on the table. A wide index (many columns, big `INCLUDE`) is bigger, so it uses more disk and memory. Index the queries you really run, not every column.

<details><summary>Go deeper (optional): Postgres 16 against 18, DESC, prepared statements</summary>

**Version differences you will see** (checked in the [PostgreSQL 18 release notes](https://www.postgresql.org/docs/release/18.0/), released 2025-09-25):

- Postgres 18 added B-tree skip scan. Your Docker playground runs 16, so a query on only the second column will most likely show a Seq Scan there. The [Postgres 16 docs](https://www.postgresql.org/docs/16/indexes-multicolumn.html) say the whole index would have to be read, "so in most cases the planner would prefer a sequential table scan".
- Postgres 18 prints `rows=5.00` with decimals, an `Index Searches` line, and `Disabled: true` under a step you switched off with `SET enable_seqscan = off`. `EXPLAIN ANALYZE` also shows buffers by default on 18. Postgres 16 shows none of these.
- On the seed (18.3), an index on `(status, created_at)` with a query on `created_at` only gave `Index Searches: 6`: 5 statuses plus one. The same query with the index `(store_id, created_at)` and 900 stores gave a Seq Scan.

**DESC is not required here.** A plain `(store_id, created_at)` index also works for `ORDER BY created_at DESC`. The plan says `Index Scan Backward`. You need `DESC` in the index only when the directions are mixed, for example `ORDER BY a ASC, b DESC`.

**Partial indexes and parameters.** Prisma sends values as parameters (`status = $1`). Postgres usually plans with the real value, and then it uses the partial index. If it switches to one shared plan for every value (a *generic plan*), it cannot use the partial index. With `plan_cache_mode = force_generic_plan` the seed showed `Seq Scan` plus `Sort` instead. The [partial index docs](https://www.postgresql.org/docs/current/indexes-partial.html) explain why.

**Why "most selective column first" is not the rule.** People say it, but the order that matters is equality first, range or sort last. A range on the first column stops Postgres from using the second column to narrow the search.

</details>

## 7. Common mistakes

**Wrong:** two single indexes for a "filter plus sort" query.

```sql
CREATE INDEX ON orders (store_id);
CREATE INDEX ON orders (created_at);
-- WHERE store_id = 42 ORDER BY created_at DESC LIMIT 5
-- plan: Index Scan Backward using orders_created_at_idx
--       Filter: (store_id = 42)  Rows Removed by Filter: 3787
```

**Right:**

```sql
CREATE INDEX ON orders (store_id, created_at DESC);
-- plan: Index Scan, Index Cond: (store_id = 42), no Sort
```

**Why:** only one index can give "store 42, already in date order".

**Wrong:** the range column first.

```sql
CREATE INDEX ON orders (created_at, store_id);   -- 101 index pages read
```

**Right:**

```sql
CREATE INDEX ON orders (store_id, created_at);   -- 3 index pages read
```

**Why:** with the date first, Postgres reads every store's orders in the date range and skips the wrong stores one by one.

**When Postgres does not use your index.** Every plan below came from a real run on the seed with a fitting index in place.

| Reason | Example | What Postgres printed | Fix |
|---|---|---|---|
| A function on the column | `WHERE date_trunc('day', created_at) = '2026-10-01'` | `Seq Scan`, 99,683 rows removed | Ask for a range: `created_at >= '2026-10-01' AND created_at < '2026-10-02'`. Plan became `Index Only Scan`. |
| A function you really need | `WHERE lower(name) = 'store 42'` | `Seq Scan` on stores | Index the same expression: `CREATE INDEX ON stores (lower(name))`. Plan became `Index Scan`. (Interview word: *expression index*.) |
| A type cast on the column | `WHERE id::text = '4242'` | `Seq Scan`, 99,999 rows removed | Compare with the right type: `WHERE id = 4242`. |
| `LIKE` that starts with `%` | `WHERE name LIKE '%42'` | `Seq Scan` | A sorted list has no place to start for "ends with 42". Use a trigram index (`pg_trgm`) if you need it. |
| Most rows match | `WHERE status IN ('PAID','SHIPPED','DELIVERED')`, 72% of rows | `Seq Scan` | Nothing to fix. Reading the table in one pass is cheaper. |
| A tiny table | `jobs` has 50 rows on 1 page. `WHERE id = 7` | `Seq Scan`, even with the primary key | Nothing to fix. One page is faster than an index. |
| Old statistics | 50,000 PENDING rows, then 49,990 changed to DONE, no `ANALYZE` yet | Guessed 99,815 rows, real 10, chose `Seq Scan` | Run `ANALYZE l10_tasks`. Then it guessed 10 and chose `Index Scan`. |

The rule behind the first three: the index stores the **plain column value**. If your query changes the value first, Postgres cannot look it up. Statistics are Postgres's notes about how many rows have each value. Lesson 11 covers them.

<details><summary>Go deeper (optional): LIKE 'abc%' in your Docker database</summary>

`WHERE name LIKE 'Store 42%'` (no leading `%`) can use a normal B-tree index, but only when the database uses the "C" collation. The PGlite check database uses "C". The `postgres:16` Docker image uses `en_US.utf8` by default. There you need a special index: `CREATE INDEX ON stores (name text_pattern_ops)`. See [operator classes](https://www.postgresql.org/docs/16/indexes-opclass.html) in the docs.

</details>

## 8. Watch and play

Links checked on 2026-10-16: each page was opened. For the videos, the title and channel were confirmed through YouTube. The video lengths were not checked.

- **Video:** [5mins of Postgres E48: Benchmarking multi column, covering and hash indexes in Postgres](https://www.youtube.com/watch?v=sY2auWXW0Fw) by pganalyze. A short episode that compares one composite index with several single ones.
- **Video:** [Composite Indexes & Index Prefixes](https://www.youtube.com/watch?v=Kgv8mkZsmVI) by CockroachDB. The leftmost column rule, shown on a composite index.
- **Play with it:** [The stepper](visuals/10-composite-partial-and-covering-indexes.html) in this folder. Predict the number first, then step.
- **Play with it:** [explain.dalibo.com](https://explain.dalibo.com/). Paste the two plans from section 4 and compare the drawings.
- **Read:** [Concatenated Indexes](https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys) on Use The Index, Luke. The phone book analogy, with a drawing of the index.
- **Read:** [Multicolumn Indexes, PostgreSQL 18 docs](https://www.postgresql.org/docs/18/indexes-multicolumn.html). Read the skip scan paragraph with the `(x, y)` example.
- **Read:** [Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html). The `INCLUDE` example and why the visibility map matters.

<details><summary>More links (optional)</summary>

- [Partial indexes](https://use-the-index-luke.com/sql/where-clause/partial-and-filtered-indexes) on Use The Index, Luke: the "unprocessed messages" example.
- [Case-insensitive search](https://use-the-index-luke.com/sql/where-clause/functions/case-insensitive-search) on Use The Index, Luke: why `UPPER` or `LOWER` hides the index.
- [Tuning SQL LIKE using indexes](https://use-the-index-luke.com/sql/where-clause/searching-for-ranges/like-performance-tuning) on Use The Index, Luke.
- [Index-Only Scan: Avoiding Table Access](https://use-the-index-luke.com/sql/clustering/index-only-scan-covering-index) on Use The Index, Luke.
- [Indexes on expressions](https://www.postgresql.org/docs/current/indexes-expressional.html), PostgreSQL docs, with the `lower(col1)` example.
- [pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html), PostgreSQL docs: indexes that help `LIKE '%foo%'`.
- [Postgres 18: Skip Scan, Breaking Free from the Left-Most Index Limitation](https://www.pgedge.com/blog/postgres-18-skip-scan-breaking-free-from-the-left-most-index-limitation), pgEdge blog, 2025-11-18.
- [Skip scan](https://postgres.fm/episodes/skip-scan), Postgres FM podcast with Peter Geoghegan, who built it. 58 minutes.
- [Database Indexing Explained (with PostgreSQL)](https://www.youtube.com/watch?v=-qNSXK7s7_w) by Hussein Nasser. Longer, about indexes in general.

</details>

## 9. Practice

**A. Predict the output** (write your answer before opening)

The table has only the index `(store_id, created_at)`. There are 900 different stores. Postgres 18. Which plan do you expect?

```sql
SELECT id FROM orders WHERE created_at >= now() - interval '1 day';
```

<details><summary>Answer</summary>

```
Seq Scan on orders (actual rows=273.00 loops=1)
  Filter: (created_at >= (now() - '1 day'::interval))
  Rows Removed by Filter: 99727
```

The query does not give `store_id`, the first column. Skip scan would need about 900 jumps, so Postgres reads the table. With an index on `(status, created_at)` instead (only 5 statuses), the same query gave a `Bitmap Index Scan` with `Index Searches: 6`. That is skip scan.

</details>

**B. Fix the bug**

The worker query is slow, even though someone added a partial index.

```sql
CREATE INDEX orders_pending_idx ON orders (created_at) WHERE status = 'PENDING';

SELECT id FROM orders
WHERE status <> 'PAID'
ORDER BY created_at LIMIT 10;
```

<details><summary>Answer</summary>

The query asks for "not PAID". That also includes SHIPPED, DELIVERED and CANCELLED, which are not in the index. Postgres can use a partial index only when the query's `WHERE` proves every needed row is inside it. The fix is to ask for what you mean:

```sql
SELECT id FROM orders
WHERE status = 'PENDING'
ORDER BY created_at LIMIT 10;
-- Limit -> Index Scan using orders_pending_idx, no Sort
```

</details>

**C. Write it yourself**

Open [practice/10-composite-partial-and-covering-indexes.sql](practice/10-composite-partial-and-covering-indexes.sql). It makes two tiny tables and has five tasks:

1. Pick the column order for "store 7, from 10-05, in date order".
2. Make a partial index for the two oldest PENDING orders.
3. Make an index-only scan with `Heap Fetches: 0`.
4. Find why three queries ignore their index, and fix two of them.
5. See why Postgres skips a good index on a tiny table.

Every task has the exact expected result in a comment.

<details><summary>One possible answer</summary>

```sql
-- Task 1: equality column first, then the range and sort column
CREATE INDEX l10_task1_idx ON l10_orders (store_id, created_at);

-- Task 2
CREATE INDEX l10_task2_idx ON l10_orders (created_at) WHERE status = 'PENDING';

-- Task 3 (plain created_at instead of created_at DESC also works, read backward)
CREATE INDEX l10_task3_idx ON l10_orders (store_id, created_at DESC) INCLUDE (total_cents);
VACUUM l10_orders;

-- Task 4a: index the same expression the query uses
CREATE INDEX l10_task4_idx ON l10_stores (lower(name));

-- Task 4b: compare the column with a date, do not change the column
SELECT id, store_id FROM l10_orders WHERE created_at = DATE '2026-10-03' ORDER BY id;

-- Task 4c: the index is sorted from the first letter. "Ends with Kita"
-- has no first letters, so there is no place to jump to. Postgres reads everything.

-- Task 5: the table has 5 rows on one page. Reading that one page
-- is cheaper than reading the index and then the table.
```

</details>

## 10. Interview question

**Q:** "This query is slow: `WHERE store_id = ? ORDER BY created_at DESC LIMIT 20`. There is an index on `store_id` and another on `created_at`. Is that enough? What would you do?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** two single indexes cannot serve a filter plus a sort together. Postgres either finds the store's rows and sorts them, or walks the date index and throws away other stores' rows. On 100,000 orders the second plan threw away 3,787 rows to keep 5.
2. **How it works:** I would add one composite index on `(store_id, created_at DESC)`. It is sorted by store, then by date inside each store, like a phone book. Postgres jumps to the store, reads 20 entries in order and stops. No Sort. I check with `EXPLAIN ANALYZE` that the Sort step is gone and the plan says `Index Cond: (store_id = ...)`. Column order rule: equality columns first, sort or range column last. The leftmost column rule says a query without `store_id` cannot jump in. Postgres 18 softens that with skip scan, but only when the first column has few values.
3. **Tradeoff:** every index slows writes and uses disk. I would drop the single `store_id` index, since the composite one also serves `WHERE store_id = ?` alone. If the screen also needs `total_cents`, `INCLUDE (total_cents)` gives an Index Only Scan, at the price of a bigger index.
4. **My example:** *This is an idea, not a fact. Replace it with your own story.* DBO has an admin CMS and a mobile app for stores. A "latest orders of this store" list is exactly this query shape. In Prisma, you would add `@@index([storeId, createdAt(sort: Desc)])` to the model. This same shape was question 4 of your mock interview on 2026-07-07: `ORDER BY tenor DESC, plafon DESC LIMIT 1` with two single indexes. The answer is one composite index, not "add DESC".

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain composite indexes out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the phone book and the words "jump" and "stop early". Then save the transcript into `my-learning/recordings/`, or write your best version below. Run `/explain-check composite indexes` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. Why can an index on `(store_id, created_at)` serve `WHERE store_id = 42 ORDER BY created_at DESC LIMIT 5` with no Sort, when two single indexes cannot?
2. What is the leftmost column rule, and what did Postgres 18 change about it?
3. Name three reasons Postgres ignores an index that exists on the right column.
4. Draw picture 2d from memory: the sorted entries of three stores, and where "all orders on 10-03" sit.

<details><summary>Answers</summary>

1. The composite index is sorted by store, then by date inside each store. Postgres jumps to store 42 and the dates are already in order, so it reads 5 entries and stops. A single store index gives the rows unsorted, so Postgres must sort them. A single date index does not know the store, so Postgres must check rows and throw many away.
2. Postgres can jump into a composite index only with a value for its first column. Without it, the matching entries are spread everywhere. Postgres 18 added skip scan: if the first column has few different values, Postgres jumps once per value. With many values it still reads the table.
3. Any three of: a function on the column (`lower(name)`, `date_trunc`), a type cast (`id::text`), `LIKE '%x'`, most rows match, the table is tiny, old statistics.
4. Store 7: 10-12, 10-11, 10-09, 10-07, 10-05, 10-03, 10-01. Store 8: 10-10, 10-06, 10-03. Store 9: 10-08, 10-04, 10-01. The two 10-03 entries are in different stores, far apart.

</details>

## Connected lessons

- [Indexes and B-trees](09-indexes-and-b-trees.md): the previous lesson. How one index finds a row, and the tree that a "jump" walks down.
- [Reading EXPLAIN](11-reading-explain.md): the next lesson. How to read `Index Cond`, `Filter`, `Rows Removed by Filter` and `Heap Fetches`, and why old statistics give bad guesses.
- [N+1 queries and ORMs](12-n-plus-1-queries-and-orms.md): each of those many small queries needs an index like the ones here.
- [PostgreSQL queries interview guide](postgresql-queries-interview-guide.md): the "burn topic" section has the `tenor, plafon` story in full.
- MVCC and VACUUM (lesson 16, not written yet): why an Index Only Scan needs `VACUUM` to mark pages as clean.
- Pagination (lesson 17, not written yet): keyset pagination needs exactly this kind of composite index.
- Upsert, idempotency and job queues (lesson 18, not written yet): the PENDING worker query is where a partial index shines.
