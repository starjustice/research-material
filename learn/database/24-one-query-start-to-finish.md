# 24. One query, from start to finish

> **Subject:** Database · **Lesson:** 24 · **Made:** 2026-10-27 · **Status:** ready
>
> **You will be able to:** say what Postgres does from the moment you press Enter until the rows come back (connect, parse, plan, run, memory, disk), say what a write adds (the log goes first), and tell which stop a problem comes from.
>
> **Before this:** [SQL basics and the order a query runs](01-sql-basics-and-query-order.md). [Reading EXPLAIN](11-reading-explain.md) helps, but you can read this first. · **Next:** [An index, built and searched](25-an-index-built-and-searched.md)
>
> **How to read it:** one card is one idea. Look at the picture, guess, then press the orange bar to check. The blue bars (📖 More detail) hold the longer explanation with the why and a real example. Skip them on the first read, and open them when you want more. Every number was run on PostgreSQL 17.5 (the newest release is 18). About 25 minutes for the cards.

## 1. The idea: a restaurant kitchen

You order a dish. Behind the counter, six things happen.

```mermaid
graph TB
    A["🧑‍🍳 You order a dish"] --> B["🚪 Waiter: your own line"]
    B --> C["📖 Cook: reads the slip"]
    C --> D["🧠 Head chef: picks the way"]
    D --> E["🔥 Cooks: do the steps"]
    E --> F["🥫 Stove shelf, else warehouse"]
```

Postgres has the same six stops: **connect, parse, plan, run, memory, disk.** Each stop is one card below. Each one can go wrong in its own way.

Notice: the head chef never tastes anything. She decides from notes about the kitchen. If the notes are wrong, the plan is wrong (card 5).

<details class="guess"><summary>🤔 Guess: which stop actually reads the rows of your table? Press to check.</summary>

The cooks. In Postgres this is the **executor**.

The cook who reads the slip (the parser) and the head chef (the planner) never touch a row. They only get ready.

</details>

> **Remember:** six stops: connect, parse, plan, run, memory, disk. Only "run" reads rows.

<details class="more"><summary>📖 More detail: the real names of the six stops</summary>

The kitchen is an analogy. These are the real names:

- **Connect:** the *postmaster* starts a *backend process* for you.
- **Parse:** the *parser* checks the grammar and builds a tree. It does not need to know your tables.
- **Names:** *parse analysis* looks up tables, columns, types and functions in the catalog. It also checks that the types fit.
- **Rewrite:** the *rewriter* replaces a view with the query behind it.
- **Plan:** the *planner* (also called the optimizer) scores the ways and picks the cheapest.
- **Run:** the *executor* walks the plan tree and reads or changes the rows.
- **Memory and disk:** the *buffer manager* keeps 8 KB pages in memory. The table and index files on disk hold the rest.
- **Log:** the *WAL* records every change before the pages reach the disk.

The official docs list the stages as connection, parser, rewrite system, planner/optimizer and executor. See [The Path of a Query](https://www.postgresql.org/docs/current/query-path.html).

</details>

## 2. Stop 1: you get your own process

A host waits at the door. When you connect, the host starts one new helper just for you.

```mermaid
graph TB
    A["🚪 postmaster waits at port 5432"] -->|you connect| B["🧑‍🍳 a new backend process"]
    B --> C["🧠 shared memory, for all"]
```

The host is called the **postmaster**. Your helper is a **backend process**. Ten connections are ten processes. The official docs call this a "process per user" model.

<details class="guess"><summary>🤔 Guess: your app opens 500 connections. How many server processes does Postgres run for them? Press to check.</summary>

500 backend processes, plus a few helpers of its own.

Each one uses memory, and the computer must switch between them. So people keep connections few and put a **pool** in front (PgBouncer, lesson 20, not written yet).

</details>

> **Remember:** one connection is one process. Keep connections few. Use a pool.

<details class="more"><summary>📖 More detail: memory, and why connections are not free</summary>

Each backend process has its own private memory. All of them also share one big memory area (shared buffers, the log buffers, the lock tables).

The setting `work_mem` is **not** per connection. It is per sort or hash step inside a query. The default is 4 MB. A query with 3 such steps can use 12 MB, and 100 sessions can do that at the same time. So the total can be many times `work_mem`. The docs say this too.

By default Postgres allows 100 connections (`max_connections`). A pool such as PgBouncer keeps a small number of real connections and shares them between many clients. This matters for serverless apps, where every function instance can open its own connection.

You can see the helper processes on a real server:

```sql
SELECT backend_type, count(*)
FROM pg_stat_activity
GROUP BY backend_type;
```

</details>

## 3. Stop 2: the parser reads your words

From here on, every example uses one table, `l24_orders`: 100,000 orders with `id`, `status` and `total_cents`.

```mermaid
graph TB
    A["📝 your SQL text"] --> B["🔤 Is the grammar right?"]
    B --> C["📚 Do the names exist?"]
    C --> D["🌳 a query tree"]
```

The parser turns text into a tree. Then Postgres checks each name in its catalog. (A small third step, the rewriter, swaps a view name for the query behind it.)

Four statements. Each one fails.

```sql
SELCT id FROM l24_orders;
SELECT idd FROM l24_orders;
SELECT id FROM l24_orders
WHERE status = 'PAID' AND;
SELECT 1 / 0;
```

<details class="guess"><summary>🤔 Guess: which stop stops each one? Press to check.</summary>

- 1: the **parser**. `syntax error at or near "SELCT"`
- 2: the **name check**. `column "idd" does not exist`
- 3: the **parser**. `syntax error at end of input`
- 4: the **executor**. `division by zero`. The words are fine. The math only fails when it runs.

Statement 2 is the same kind of error as lesson 1, card 3. The name check happens here, before one row is read.

</details>

> **Remember:** typos and unknown names fail early, before any row is read. Bad math fails late.

<details class="more"><summary>📖 More detail: type errors, and what a view becomes</summary>

The name check also checks **types**. Two more statements. Both fail before any row is read:

```sql
SELECT * FROM l24_orders
WHERE id = 'abc';
-- invalid input syntax
--   for type integer: "abc"

SELECT * FROM l24_orders
WHERE id = status;
-- operator does not exist:
--   integer = text
```

The quoted `'abc'` has no type yet. Postgres tries to turn it into an integer and cannot. And there is no operator to compare an integer with text. But `WHERE id = '5'` works: the `'5'` becomes the integer 5.

Now the **rewrite** step. Make a view and ask for it:

```sql
CREATE VIEW l24_paid AS
  SELECT id, total_cents
  FROM l24_orders
  WHERE status = 'PAID';

EXPLAIN (COSTS OFF)
SELECT * FROM l24_paid
WHERE total_cents > 20000;
```

```text
Seq Scan on l24_orders
  Filter: (total_cents > 20000
    AND status = 'PAID')
```

(Shortened.) The view is gone. Postgres joined its WHERE with yours and ran it on the real table.

</details>

## 4. Stop 3: the planner picks the cheapest way

There is an index on `total_cents`. So this query has two ways to run.

```sql
SELECT * FROM l24_orders
WHERE total_cents = 12345;
```

| Way | Cost |
|---|---|
| Read every page | 1791.00 |
| Use the index | 22.95 |

The planner adds up a score for each way. The lowest score wins. Here it uses the index.

<details class="guess"><summary>🤔 Guess: the Seq Scan costs 1791.00. The table has 541 pages and 100,000 rows. Where does 1791 come from? Press to check.</summary>

Three small prices added together:

- 541 pages × 1.00 (read a page in order) = 541
- 100,000 rows × 0.01 (handle a row) = 1,000
- 100,000 rows × 0.0025 (test the WHERE) = 250

541 + 1,000 + 250 = **1,791**.

Cost is **not** milliseconds. It is a made-up score. These prices are settings you can change (`seq_page_cost`, `cpu_tuple_cost`, `cpu_operator_cost`).

</details>

> **Remember:** the planner scores each way and picks the lowest. The score is a guess, not a time.

<details class="more"><summary>📖 More detail: start-up cost, and the prices</summary>

`cost=0.00..1791.00` has two numbers. The first is the **start-up cost**: the work to do before the first row can come out. The second is the **total cost**.

Look at a query that sorts all 100,000 rows (`ORDER BY total_cents DESC`):

```text
Sort
  cost=9845.82..10095.82
  -> Seq Scan
     cost=0.00..1541.00
```

The Seq Scan can give its first row at once (start-up 0.00). The Sort cannot give any row until it has read and sorted all of them. So its start-up cost is almost its whole cost: 9,845.82 of 10,095.82.

Now `ORDER BY id`. The rows already come out of the primary key index in order, so there is nothing to sort:

```text
Index Scan using
  l24_orders_pkey
  cost=0.29..3148.29
```

The start-up cost is tiny (0.29). This is why `ORDER BY ... LIMIT 10` likes an index on the sort column.

The prices are settings. These are the defaults:

- `seq_page_cost` = 1.0: read a page in order.
- `random_page_cost` = 4.0: read a page out of order.
- `cpu_tuple_cost` = 0.01: handle one row.
- `cpu_index_tuple_cost` = 0.005: handle one index entry.
- `cpu_operator_cost` = 0.0025: run one operator, like `=`.

The planner also chooses the join order and the join method (nested loop, hash join, merge join). See [How Postgres works inside](postgres-internals-visual.md), Part 6.

</details>

## 5. The planner's notes

How does the planner know the table has 100,000 rows, and that 10% are PENDING? It keeps **notes** (statistics). It does not count the rows each time.

```sql
EXPLAIN SELECT * FROM l24_orders
WHERE status = 'PENDING';
```

Nobody has run `ANALYZE` on this new table yet. The real answer is 10,000 rows.

<details class="guess"><summary>🤔 Guess: how many rows does the planner expect? About 10,000, about 3,000, or about 300? Press to check.</summary>

About **300**. It printed `rows=325`.

Then I ran `ANALYZE l24_orders;` and asked again. Now it said `rows=9807`. Close to the truth.

`ANALYZE` reads a random sample, so the number moves a little each time (it said 10,030 on an earlier run).

In a real database, **autovacuum** runs ANALYZE for you after about 10% of the rows change. The test tables turn autovacuum off so the numbers stay still.

</details>

> **Remember:** wrong notes make a wrong plan. After a big load, run `ANALYZE`.

<details class="more"><summary>📖 More detail: what is in the notes</summary>

The notes live in the view `pg_stats`. This is `l24_orders` after one `ANALYZE`:

- `id`: n_distinct = -1, correlation = 1
- `status`: n_distinct = 2, correlation = 0.82
- `total_cents`: n_distinct = -0.19, correlation = -0.005

What the columns mean:

- **n_distinct:** how many different values. A negative number is a share of the rows. -1 means every row is different.
- **most_common_vals and most_common_freqs:** for `status`: PAID 0.898 and PENDING 0.102.
- **histogram_bounds:** for `total_cents`: 101 values that cut the column into 100 groups with about the same number of rows. The first four are 1001, 1199, 1382 and 1582.
- **correlation:** how well the order of the values matches the order of the rows in the table, from -1 to 1. `id` is 1, because the rows were loaded in id order. A high number makes an index scan look cheaper.

The guess is just arithmetic. 100,000 rows × 0.10213 (the share of PENDING) = 10,213. In this run EXPLAIN printed `rows=10213`. (`ANALYZE` reads a random sample, so every run gives a slightly different number. The card showed 9,807 from another run.)

Before the first `ANALYZE`, `pg_class.reltuples` is -1 ("unknown"). So the planner builds a guess from the size of the file and a default share. That is where `rows=325` came from.

Two limits. The notes are always approximate. A bigger `default_statistics_target` (100 by default) means a bigger sample and more detail. And the notes look at each column alone. If two columns depend on each other, like city and country, the guess can be far off. `CREATE STATISTICS` can help.

</details>

## 6. Stop 4: the executor runs the plan

This is the query from lesson 1.

```sql
SELECT id, total_cents
FROM l24_orders
WHERE status = 'PAID'
ORDER BY total_cents DESC
LIMIT 2;
```

The plan is a **tree**. The executor starts at the bottom. Rows flow up, one box at a time.

```mermaid
graph TB
    A["📖 Seq Scan: reads 541 pages"] -->|90,000 rows| B["📏 Sort: keeps the best 2"]
    B -->|2 rows| C["✂️ Limit: has enough"]
    C --> D["📦 2 rows to you"]
```

Notice: the Sort says `top-N heapsort, Memory: 17kB`. It did not sort 90,000 rows. It only kept the 2 best.

<details class="guess"><summary>🤔 Guess: <code>SELECT * FROM l24_orders LIMIT 1</code> on this 541-page table. How many pages does Postgres read? Press to check.</summary>

Only **2**. `EXPLAIN (ANALYZE, BUFFERS)` says `Buffers: shared hit=2`.

Rows are pulled up one at a time. When Limit has enough, it stops asking, and the scan below stops too. That is why LIMIT without a WHERE is fast.

</details>

> **Remember:** the executor pulls rows up the tree. A box that has enough stops asking.

<details class="more"><summary>📖 More detail: one row at a time, and spilling to disk</summary>

Each box asks the box below it for the next row. Some boxes pass rows on as they get them (Seq Scan, Limit). Some must see **all** the rows first (Sort). That is the start-up cost from card 4.

A sort needs memory. The limit is `work_mem` (4 MB by default). Sort all 100,000 rows:

```sql
EXPLAIN (ANALYZE, COSTS OFF)
SELECT id, total_cents
FROM l24_orders
ORDER BY total_cents DESC;
```

```text
Sort Method: quicksort
  Memory: 3983kB
```

Almost 4 MB. It just fits. Now give it less memory:

```sql
SET work_mem = '64kB';
```

```text
Sort Method: external merge
  Disk: 1824kB
```

Now Postgres writes temporary files to disk and merges them. This is much slower.

Each sort or hash step in a query can use `work_mem` on its own, so do not raise it for the whole server. Raise it only in the one session that needs it.

With `LIMIT 2`, the sort only needs the best 2 rows. It keeps a tiny heap: `top-N heapsort, Memory: 17kB`.

</details>

## 7. Memory first, disk second

The stove shelf is fast. The warehouse is slow. Postgres keeps recent pages on the shelf.

```mermaid
graph TB
    A["🔥 Executor needs a page"] --> B{"🥫 on the shelf?"}
    B -->|"yes: hit"| D["⚡ use it"]
    B -->|"no: read"| C["🚚 fetch 8 KB from disk"]
    C --> D
```

Postgres never reads one row from disk. It reads a whole **page** of 8 KB. Pages wait in a memory area called **shared buffers** (128 MB by default).

`EXPLAIN (ANALYZE, BUFFERS)` shows it. `hit` means the page was in memory. `read` means it was not.

<details class="guess"><summary>🤔 Guess: you run a query right after building its index. The first run says <code>shared hit=5 read=2</code>. What does the second run say? Press to check.</summary>

```
Buffers: shared hit=7
```

The same 7 pages. The 2 that were `read` are now in memory. A warm cache is why the second run is faster.

One catch: `read` does not always mean the physical disk. The operating system keeps its own cache, so a `read` can still be quick.

</details>

> **Remember:** `hit` is memory, `read` is not. A page is always 8 KB.

<details class="more"><summary>📖 More detail: what happens when the shelf is full</summary>

Shared buffers are 128 MB by default. That is 16,384 pages of 8 KB.

When a new page is needed and every buffer is in use, Postgres must throw one out. It uses a **clock sweep**. A "hand" walks around the buffers. Each time a page is used, its **usage count** goes up, to a small limit. The hand lowers the count as it passes, and takes the first buffer that is not in use and has a count of 0. If that page was changed, it is written out first.

Two helpers. A big sequential scan uses only a small ring of 256 KB, so one huge scan does not push everything else out. And the *background writer* writes changed pages early, in small steps.

Postgres is not the only cache. The operating system caches files too, so a page can be in both. The setting `effective_cache_size` (4 GB by default) only tells the planner how much cache to expect. It reserves nothing.

You can look inside with the `pg_buffercache` extension (test database only). After loading `l24_orders`:

```sql
SELECT c.relname,
       count(*) AS buffers
FROM pg_buffercache b
JOIN pg_class c
  ON b.relfilenode =
     pg_relation_filenode(
       c.oid)
WHERE c.relname LIKE 'l24%'
  AND b.reldatabase = (
    SELECT oid
    FROM pg_database
    WHERE datname =
      current_database())
GROUP BY 1
ORDER BY 2 DESC;
```

| relname | buffers |
|---|---|
| l24_orders | 544 |
| l24_orders_pkey | 276 |

541 of the 544 table buffers are table pages. The other 3 are small helper files. Most buffers had a usage count of 5, the highest I saw.

</details>

## 8. A write: the log goes first

Before the cook moves anything in the pantry, she writes it in the logbook. If the lights go out, she reads the book and finishes the job.

```mermaid
graph TB
    A["✏️ INSERT a row"] --> B["📒 1. note it in the log"]
    B --> C["🥫 2. change the page in memory"]
    C --> D["✅ 3. COMMIT: log is on disk"]
    D -.-> E["🗄️ 4. table file: later"]
```

The logbook is the **WAL** (write-ahead log). One small INSERT into this table (it has 2 indexes) wrote about 240 to 300 bytes of log in my test.

(In the code, the log note and the page change happen together. The rule that counts: the log reaches the disk before the page does.)

<details class="guess"><summary>🤔 Guess: the moment COMMIT finishes, what is already safe on disk: the table page, or the log? Press to check.</summary>

The **log**.

The table page may still be only in memory. It gets written later, in the background. If Postgres crashes, it replays the log and rebuilds the page.

So COMMIT waits for the log to reach the disk, not for the table. That wait is the price of being safe.

</details>

> **Remember:** log first, table later. COMMIT waits for the log.

<details class="more"><summary>📖 More detail: the log, checkpoints and the trade-off</summary>

A log record is a small description of a change. Its place in the log is the **LSN** (log sequence number), like `0/22DED50`. Every page remembers the LSN of its last change. The rule: a page may be written to disk only after the log up to that LSN is on disk. The docs say it this way: changes to data files must be written only after the WAL records describing them have been flushed.

After a crash, Postgres starts from the last **checkpoint** and replays the log (this is called REDO). A checkpoint writes all changed pages to disk. It happens every 5 minutes (`checkpoint_timeout`), or sooner when the log reaches `max_wal_size` (1 GB by default).

Why not write the table pages at COMMIT? One commit can change many pages in many files, all over the disk. The log is one file, written in order. Flushing only the log is much cheaper. The docs say so too.

The same log also makes backup and point-in-time recovery possible (the docs).

**The trade-off.** `synchronous_commit = off` makes COMMIT return before the log is flushed. A crash can lose the last few transactions, at most about 3 × `wal_writer_delay` (3 × 200 ms by default). It does **not** corrupt the database. `fsync = off` is different: it can corrupt the database. Never use it for data you care about.

</details>

## 9. An UPDATE writes a new row

You do not erase a paper form. You write a new one and stamp the old one "old".

```mermaid
graph TB
    A["📄 row 7 lives at (0,7)"] -->|UPDATE| B["✍️ a new copy is written"]
    B --> C["📄 new row 7 at (540,103)"]
    C --> D["🗑️ old copy: dead, cleaned later"]
```

Every row has an address: **(page, slot)**. It is called the `ctid`.

```sql
SELECT ctid, id, status
FROM l24_orders WHERE id = 7;
```

Then `UPDATE l24_orders SET status = 'CANCELLED' WHERE id = 7;` and ask again.

<details class="guess"><summary>🤔 Guess: after the UPDATE, is row 7 still at (0,7)? Press to check.</summary>

No. It is now at `(540,103)`, near the end of the table. (Yours may be a few slots different.)

The old copy stays, marked dead, until **VACUUM** cleans it. Other transactions that started earlier may still need to see it (lesson 16, not written yet).

Two costs follow. The table grows until VACUUM runs. And every index must learn the new address (lessons 25 and 26).

</details>

> **Remember:** an UPDATE is a new row plus a dead old row. The row moves.

<details class="more"><summary>📖 More detail: look at the row versions yourself</summary>

With the `pageinspect` extension (test database only) you can read the version fields of a row. This is row 7 of `l24_orders`, before and after the UPDATE:

```sql
SELECT lp, t_xmin, t_xmax,
       t_ctid
FROM heap_page_items(
  get_raw_page(
    'l24_orders', 0))
WHERE lp = 7;
```

| Version | xmin | xmax | ctid |
|---|---|---|---|
| before | 747 | 0 | (0,7) |
| old | 747 | 748 | (540,101) |
| new | 748 | 0 | (540,101) |

- **xmin:** the transaction that created this version.
- **xmax:** the transaction that deleted or replaced it. 0 means nobody did.
- **ctid:** the row's own address. For an old version it is the address of the newer one.

Transaction 748 is the UPDATE. A query that started before 748 committed still sees the old version. This is how readers and writers do not block each other (MVCC, lesson 16, not written yet). In this run the new row landed at (540,101). In the card it was (540,103). The last number changes from run to run.

**What happens to the old version?** On the next read of that page, Postgres does a cheap clean-up called *pruning*. It frees the old row's data, but keeps the 4-byte line pointer as a "dead" stub, because an index entry still points to it. Later, **VACUUM** removes the index entry and frees the stub. (By default VACUUM skips the index clean-up when there is very little to do. I used `VACUUM (INDEX_CLEANUP ON)` to see the stub freed.)

A row of this table takes 40 bytes: a 24-byte header (23 bytes and 1 byte of padding) and 16 bytes of data.

</details>

## 10. Watch it run, step by step

Now watch the trip. **[Open the query journey stepper](visuals/24-one-query-start-to-finish.html).** One query goes through the six stops, and you press Next to move it. Guess first.

<details><summary>Or read the steps as a table</summary>

The query from card 6:

| Step | Stop | What happens |
|---|---|---|
| 1 | connect | the postmaster starts a backend process for you |
| 2 | parse | the text becomes a tree (a typo fails here) |
| 3 | names | `l24_orders` and its columns are found (a wrong name fails here) |
| 4 | plan | scores are compared. Seq Scan, Sort, Limit wins |
| 5 | run | Seq Scan reads 541 pages and passes up 90,000 rows |
| 6 | memory | the pages come from shared buffers, or from disk |
| 7 | run | Sort keeps the best 2, Limit stops, 2 rows go back to you |

A write adds one stop between 5 and 6: the change is described in the log first.

</details>

## 11. Why it matters and what it costs

Interview words: *query lifecycle*, *cost-based optimizer*, *statistics*, *shared buffers*, *write-ahead log (WAL)*.

- **With the map,** a problem has an address. You ask "which stop?" before you guess.
- **Without it,** every slow query is a mystery.

| You see | Look at |
|---|---|
| syntax error | parser |
| does not exist | names |
| bad row guess | the notes |
| slow, then fast | memory |
| slow COMMIT | the log |
| too many clients | processes |

(A bad row guess is fixed with `ANALYZE`. Slow then fast means the cache was cold.)

**The costs:**

- The planner is a guess. Old notes give a bad plan.
- Each connection is a whole process.
- Each COMMIT waits for the log.
- Each UPDATE leaves a dead row behind.

## 12. Watch and play

Links checked on 2026-10-27. Each page was opened. For each video, the title and channel were confirmed through YouTube's oEmbed data. The video lengths were not checked.

- **Play with it:** [The query journey stepper](visuals/24-one-query-start-to-finish.html) in this folder. Guess first, then press Next.
- **Play with it:** [Dalibo explain](https://explain.dalibo.com/). Paste a plan from `EXPLAIN` and see it as a tree. Try the plan from card 6.
- **Video:** [Rafia Sabih: PostgreSQL Executor, executing your execution plan](https://www.youtube.com/watch?v=jFlVjmlicy4) (PGConf.EU 2024, from PostgreSQL Europe). A conference talk on how the executor runs a plan. It matches card 6. Watch it after the cards.
- **Video:** [Deeper Understanding of PostgreSQL Execution Plan: At Plan Time and Run Time](https://www.youtube.com/watch?v=Ls-uE1V31lE) from Postgres Conference. What happens at plan time and at run time (cards 4 to 6).
- **Read:** [The Path of a Query](https://www.postgresql.org/docs/current/query-path.html) in the PostgreSQL docs. One page. It is the official version of cards 2 to 6.
- **Read:** [InterDB chapter 3: Query Processing](https://www.interdb.jp/pg/pgsql03.html) by Hironobu Suzuki. A free book with drawings. Chapters [8 (buffer manager)](https://www.interdb.jp/pg/pgsql08.html) and [9 (WAL)](https://www.interdb.jp/pg/pgsql09.html) match cards 7 and 8.
- **Read:** [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html). The cost numbers of card 4 are explained here.

<details><summary>More links (optional)</summary>

- **Read:** [Write-Ahead Logging](https://www.postgresql.org/docs/current/wal-intro.html) in the docs. The official version of card 8.
- **Read:** [PostgreSQL 18 released](https://www.postgresql.org/about/news/postgresql-18-released-3142/). The part about asynchronous I/O is used in card 13.
- **Read (revision, dense):** [How Postgres works inside](postgres-internals-visual.md) in this folder. A long guide. It covers the same ground and more.

</details>

## 13. Practice

**A. Predict the plan.** Before you run it: `EXPLAIN SELECT * FROM l24_orders WHERE id = 5;`. Does it read every page? About how many rows?

<details class="guess"><summary>🤔 Press to see the answer</summary>

```
Index Scan using l24_orders_pkey
  (cost=0.29..8.31 rows=1)
  Index Cond: (id = 5)
```

(Shortened.) No. It uses the primary key index and expects 1 row. The cost is 8.31, against 1791 for reading every page.

</details>

**B. Name the stop.** Where does each problem come from?

1. `ERROR: relation "orderz" does not exist`
2. A query takes 80 ms the first time and 2 ms the second time.
3. `EXPLAIN` says `rows=1`, but 50,000 rows come back.
4. COMMIT is slow on a busy server.
5. `FATAL: sorry, too many clients already`

<details class="guess"><summary>🤔 Press to see the answers</summary>

1. The **name check** (card 3).
2. **Memory against disk** (card 7). The first run read pages from disk. The second found them in memory.
3. The **planner's notes** (card 5). Run `ANALYZE`.
4. The **log flush** (card 8).
5. **Connect** (card 2). Every connection is a process, and the limit (`max_connections`, 100 by default) is full.

</details>

**C. Write it yourself**

Open [`practice/24-one-query-start-to-finish.sql`](practice/24-one-query-start-to-finish.sql). It makes the `l24_orders` table and gives seven tasks with the exact expected results: which stop fails, the planner's guess before and after `ANALYZE`, the plan as a tree, the cost of two ways, the pages in memory, the bytes of log for one INSERT, and where a row goes after an UPDATE. Run the file once in psql, then write each query under its TODO.

<details><summary>One possible answer</summary>

```sql
-- Task 1: say which stop fails.
SELCT id FROM l24_orders;
SELECT idd FROM l24_orders;
SELECT 1 / 0;

-- Task 2
EXPLAIN SELECT * FROM l24_orders
WHERE status = 'PENDING';
ANALYZE l24_orders;
EXPLAIN SELECT * FROM l24_orders
WHERE status = 'PENDING';

-- Task 3
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF,
         TIMING OFF, SUMMARY OFF)
SELECT id, total_cents FROM l24_orders
WHERE status = 'PAID'
ORDER BY total_cents DESC LIMIT 2;

-- Task 4
CREATE INDEX l24_orders_total
  ON l24_orders (total_cents);
ANALYZE l24_orders;
EXPLAIN SELECT * FROM l24_orders
WHERE total_cents = 12345;
SET enable_indexscan = off;
SET enable_bitmapscan = off;
EXPLAIN SELECT * FROM l24_orders
WHERE total_cents = 12345;
RESET enable_indexscan;
RESET enable_bitmapscan;

-- Task 5
SELECT count(*) AS pages_in_memory
FROM pg_buffercache
WHERE relfilenode =
        pg_relation_filenode('l24_orders')
  AND relforknumber = 0;

-- Task 6
SELECT pg_current_wal_lsn() AS before \gset
INSERT INTO l24_orders
VALUES (100001, 'PAID', 5000);
SELECT pg_wal_lsn_diff(
  pg_current_wal_lsn(), :'before'
) AS wal_bytes;

-- Task 7
SELECT ctid, id, status
FROM l24_orders WHERE id = 7;
UPDATE l24_orders
SET status = 'CANCELLED' WHERE id = 7;
SELECT ctid, id, status
FROM l24_orders WHERE id = 7;
```

Task 4 turns off the two index ways so the planner has to show the cost of the Seq Scan. It is a tool for looking, never for fixing a real query.

</details>

## 14. Interview question

**Q:** "What happens inside Postgres when I run a SELECT? And what is different for an UPDATE?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** a query is slow or wrong, and you must know where to look. If you see the database as one black box, you can only guess.
2. **How it works:** the client connects, and the postmaster starts one backend process for it. The parser checks the grammar and builds a tree. The names are checked in the catalog. The planner gives each possible way a cost score from its statistics, and picks the lowest. The executor runs the plan as a tree, pulling rows up. It reads 8 KB pages from shared buffers, and from disk when a page is missing. An UPDATE adds two things. The change is written to the write-ahead log first, and COMMIT waits for that log to reach the disk. And the row is not changed in place: a new row version is written, and the old one is cleaned later by VACUUM.
3. **Tradeoff:** the planner works from a guess. Old statistics give a bad plan, and you fix it with `ANALYZE`. A process per connection is simple and safe, but it does not scale to thousands of connections, so you use a pool. Waiting for the log makes COMMIT safe, and it costs time on each commit.
4. **My example:** *This is an idea, not a fact. Replace it with a real story from DBO, Unloan, ZWS or Skyworx.* A page is slow. I run `EXPLAIN (ANALYZE, BUFFERS)` and look at the stops. If the estimate is far from the actual rows, I run `ANALYZE`. If the first run is slow and the second is fast, the cache was cold. If many serverless functions each open a connection, I put a pooler in front.

</details>

## 15. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain what happens when a query runs, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Name the stops in order, and say what a write adds. Then save the transcript into `my-learning/recordings/`, or write your best version below. Run `/explain-check postgres query journey` or ask `coach my explanation`.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 16. Review questions (day 1, 3, 7, 21)

1. Name the stops of a query in order. Which stop reads the rows?
2. Which stop gives `syntax error`? Which gives `column does not exist`? Which gives `division by zero`?
3. What does `cost=1791.00` mean? Is it milliseconds? How did Postgres get it for a 541-page table with 100,000 rows?
4. What is `ANALYZE` for? What happens to the plan if nobody runs it after a big load?
5. What do `shared hit` and `shared read` mean in `EXPLAIN (ANALYZE, BUFFERS)`?
6. At COMMIT, what is already on disk: the table page or the log? Why?
7. After an UPDATE, where is the row, and what happens to the old copy?

<details><summary>Answers</summary>

1. Connect, parse, plan, run, memory, disk. (The name check sits just after parse.) The executor, at the "run" stop, reads the rows.
2. The parser. The name check. The executor.
3. It is a made-up score, not time. The planner adds 541 pages × 1.00, 100,000 rows × 0.01 and 100,000 rows × 0.0025: 541 + 1,000 + 250 = 1,791.
4. It updates the planner's notes (row counts, common values). Without it the planner guesses (`rows=325` instead of about 10,000), and it can choose a bad plan.
5. `hit`: the page was in shared buffers (memory). `read`: it was not, so Postgres asked the OS (disk, or the OS cache).
6. The log. The log is flushed at COMMIT. The table page is written later. After a crash, Postgres replays the log.
7. It moved to a new address (a new page and slot). The old copy stays as a dead row until VACUUM cleans it.

</details>

## 17. Go deeper (optional)

None of this is needed for the cards above.

<details><summary>The helper processes</summary>

Besides one backend per connection, Postgres runs a few helpers of its own. The docs list them as `backend_type` values in `pg_stat_activity`:

- **checkpointer:** at set times it writes the changed pages in memory out to the table files.
- **background writer:** writes some changed pages out early, in small steps.
- **walwriter:** flushes the log to disk in the background.
- **autovacuum launcher and worker:** run VACUUM and ANALYZE for you.

</details>

<details><summary>Prepared statements and plan reuse</summary>

A prepared statement has a parameter, like `$1`. Postgres can make a plan for each value (a *custom plan*), or one plan for every value (a *generic plan*). The docs say the first five executions use custom plans. After that Postgres may switch to a generic one if it looks as cheap.

You can force it and see the difference:

```sql
PREPARE p(int) AS
  SELECT * FROM l24_orders
  WHERE id = $1;
EXPLAIN (COSTS OFF) EXECUTE p(5);
-- Index Cond: (id = 5)

SET plan_cache_mode =
  force_generic_plan;
EXPLAIN (COSTS OFF) EXECUTE p(5);
-- Index Cond: (id = $1)
```

Why it matters: a generic plan does not know the value. For a lopsided column (90% PAID, 10% PENDING) one plan may fit one value and not the other. Many ORMs use prepared statements, and so do poolers in some modes.

</details>

<details><summary>Parallel query</summary>

For a big table, the planner can start extra worker processes (a `Gather` node with `Parallel Seq Scan`). The 100,000-row table here is too small for that. In lessons 25 and 26 the tables have 1 million rows, so the practice files turn parallel workers off (`SET max_parallel_workers_per_gather = 0`) to keep the plans simple.

</details>

<details><summary>Postgres 18: asynchronous I/O</summary>

Until Postgres 17 a scan asks for one page, waits, then asks for the next. The Postgres 18 release notes (2025-09-25) describe a new asynchronous I/O system that can ask for several pages at once. They say it covers sequential scans, bitmap heap scans and VACUUM, with gains of up to 3x in some cases. The `io_method` setting chooses how. I could not run this here, because my test database is 17.5.

</details>

<details><summary>The first change to a page after a checkpoint</summary>

The setting `full_page_writes` is on by default. The first time a page changes after a checkpoint, Postgres writes the whole 8 KB page into the log, not only the small change. This protects against a half-written page after a crash. If your INSERT in task 6 writes about 8,000 bytes of log and not 300, that is why.

</details>

## Connected lessons

- [01. SQL basics and the order a query runs](01-sql-basics-and-query-order.md): the logical order. This lesson is the physical journey.
- [09. Indexes and B-trees](09-indexes-and-b-trees.md) and [11. Reading EXPLAIN](11-reading-explain.md): the long versions of cards 4 to 6.
- [25. An index, built and searched](25-an-index-built-and-searched.md): the next lesson. What the index in card 4 really is.
- [How Postgres works inside](postgres-internals-visual.md): the long guide with the same map.
