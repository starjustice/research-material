# Database: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews · **Stack:** PostgreSQL, Prisma, Hasura

This page is a short map of the 27 database lessons. It tells you which ones to read first, and gives you the answer to say out loud. If a lesson feels hard, read the line here first, then open the lesson.

**How to read the stars.** This ranking is my judgement of how often interviewers ask each topic, so treat it as a guide, not a rule.

- ★★★ Almost every interview asks this. Learn these first.
- ★★ Often asked in senior rounds. Learn these second.
- ★ Asked when the interviewer wants depth. Learn these last.

## ★★★ Learn these first

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [01 SQL order](01-sql-basics-and-query-order.md) | A query runs in this order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT. A step can only use what the steps before it made. | An alias works in ORDER BY but not in WHERE. `NULL` needs `IS NULL`, not `= NULL`. |
| [02 Joins](02-joins.md) | INNER keeps only matching pairs. LEFT keeps every left row, and the empty right side is NULL. | `LEFT JOIN ... WHERE right.status = 'X'` quietly turns into an INNER JOIN. Put the test in `ON`. |
| [03 Grouping](03-grouping-and-aggregation.md) | WHERE removes rows before grouping. HAVING removes groups after the totals. | Joining two "many" tables multiplies rows, so totals come out too big. |
| [06 Keys](06-keys-and-relationships.md) | A primary key names one row. A foreign key must point to a real row. Many to many needs a middle table. | Say what happens on delete: refuse (default), CASCADE, or SET NULL. |
| [07 Normalization](07-normalization.md) | One fact, one place. Copy data only on purpose, and decide who keeps the copy right. | Do not just say "1NF, 2NF, 3NF". Give the problem: a fact saved twice will one day disagree with itself. |
| [09 Indexes](09-indexes-and-b-trees.md) | An index is a sorted list of one column with the address of each row. It turns "read the whole table" into "read a few pages". | It also helps ORDER BY and ranges, not only `=`. And it is not free. |
| [10 Composite indexes](10-composite-partial-and-covering-indexes.md) | Put `=` columns first, then the sort or range column. An index on (a, b) helps a query on `a`, not a query on only `b`. | Two single indexes are not the same as one composite index. |
| [11 EXPLAIN](11-reading-explain.md) | Read the plan from the inside out. Find the node that throws away many rows or takes most of the time. Fix that, then measure again. | Compare "guessed rows" with "actual rows". A big gap means old stats, so run `ANALYZE`. |
| [12 N+1](12-n-plus-1-queries-and-orms.md) | Count the trips to the database, not the speed of one query. Fix: one query for the list, one for all children, then group in code (DataLoader). | Make the DataLoader once per request. A shared one can leak data between users. |
| [13 ACID](13-transactions-and-acid.md) | A transaction makes several writes into one: all happen or none. Say each letter with one example. | A transaction does not fix a race by itself. That is lesson 14. |
| [14 Isolation](14-isolation-levels.md) | Postgres default is READ COMMITTED. A lost update is read, compute in code, write back. Fix it with `UPDATE ... SET n = n + 1` or a lock. | Write skew only stops with SERIALIZABLE. Be ready to retry. |
| [17 Pagination](17-pagination.md) | OFFSET reads and throws away every skipped row, so it gets slower on later pages. Use keyset ("after this row") for big feeds. | The sort must be unique. Add the primary key last. |

## ★★ Learn these second

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [04 Subqueries](04-subqueries-ctes-and-exists.md) | "Has one" is EXISTS. "Has none" is NOT EXISTS. | `NOT IN` returns nothing if the list holds a NULL. Use NOT EXISTS. |
| [05 Window functions](05-window-functions.md) | GROUP BY squashes rows. A window function keeps every row and adds a column. Use it for top N per group and running totals. | ROW_NUMBER never repeats. RANK repeats and skips. DENSE_RANK repeats and does not skip. |
| [08 Constraints](08-constraints-and-data-types.md) | Your app has bugs, so Postgres should refuse bad data itself. | Money goes in integer cents or `numeric`, never `float`. Use `timestamptz`. |
| [15 Locks](15-locks-and-deadlocks.md) | A deadlock is a circle of waiting. Lock rows in one fixed order and keep transactions short. Postgres cancels one, so your code must retry. | Know `FOR UPDATE`, `NOWAIT` and `SKIP LOCKED`. |
| [16 MVCC](16-mvcc-and-vacuum.md) | An UPDATE writes a new row version and leaves the old one as a dead row. VACUUM cleans dead rows. Readers do not block writers. | Never turn autovacuum off. |
| [18 Idempotency](18-upsert-idempotency-and-job-queues.md) | Assume every event can arrive twice. Let a unique rule decide who goes first: `INSERT ... ON CONFLICT`. | Checking "does it exist?" in code first is a race. |
| [19 Migrations](19-zero-downtime-migrations.md) | Use `CREATE INDEX CONCURRENTLY`, add rules as `NOT VALID` then validate, set a short `lock_timeout`, and change big tables in small batches. | One big UPDATE on millions of rows blocks the site. |
| [20 Connection pool](20-connection-pooling.md) | A connection is a slow, heavy process. Keep a few and reuse them. Total = app instances × pool size, and it must stay under `max_connections`. | Serverless can open too many connections. Use a pooler. |
| [21 Replicas](21-replication-and-read-replicas.md) | A replica is read only and a little behind. After a write, read from the primary or wait for the replica to catch up. | This is the "I saved it but I cannot see it" bug (read-your-writes). |
| [22 Partition and shard](22-partitioning-and-sharding.md) | Partitioning splits one table inside one database. Sharding splits data across several databases. Try indexes, then replicas, then partitioning, and shard last. | Partitioning only helps queries that name the partition column. |
| [23 SQL vs NoSQL](23-sql-vs-nosql-and-redis.md) | The default is Postgres, with `jsonb` for the parts that change shape. Add another store only when a clear problem needs it. | Name the family (key-value, document, ...), not just "NoSQL". |

## ★ Depth, for senior rounds

| Lesson | The one idea |
|---|---|
| [24 One query, start to finish](24-one-query-start-to-finish.md) | Six stops: connect, parse, plan, run, memory, disk. The planner picks the lowest score, and the score is a guess. |
| [25 An index, built and searched](25-an-index-built-and-searched.md) | A B-tree is short and wide. One million rows is only about 3 levels, so a search reads about 4 pages. |
| [26 What an index costs](26-what-an-index-costs.md) | Every index is written on every INSERT. Postgres skips an index when most rows match. A HOT update avoids touching indexes. |
| [27 ORMs compared](27-orms-and-query-tools-compared.md) | The more the tool hides, the less you type and the less you see. Pick Prisma, Drizzle, Kysely or raw SQL by how much SQL you want to control. |

## The 5 questions most likely to come up

1. "A query is slow. What do you do?" Run EXPLAIN ANALYZE, find the costly node, check for a missing or wrong index, check stats. (11, 9, 10)
2. "How does an index work, and why not index everything?" (9, 26)
3. "What are the isolation levels? What is a lost update?" (14)
4. "Our GraphQL list page is slow but every query is fast." That is N+1. (12)
5. "OFFSET is slow on a big table. What now?" Keyset pagination. (17)

## Practice from the lessons

- Each lesson has a quiz in `learn/database/quiz/`. Start with the ★★★ lessons.
- For the SQL itself, do the [advanced SQL workbook](advanced-sql-workbook.md).
- For senior questions with long answers, use [senior database interview questions](senior-database-interview-questions.md).

## Honest notes

- The lessons are the source. This page only compresses their "Remember" lines. If this page and a lesson disagree, the lesson is right.
- Check your own project facts before you say them in an interview. Only claim what you really built.
