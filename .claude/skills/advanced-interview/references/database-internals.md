# Database Internals — "how does this DB actually work?"

Anchored on PostgreSQL (the candidate's stack), with the contrasts that international interviews ask for: MySQL/InnoDB, LSM stores (Cassandra, RocksDB, ScyllaDB), DynamoDB, Redis, Elasticsearch.

Each block: **the question ladder**, then the **model answer** the interviewer is listening for.

---

## 1. Indexes — the flagship "how does it work" topic

**L1** "Have you used indexes?"
**L2** "What does Postgres physically build when you run `CREATE INDEX`?"
**L3** "Why a B+tree? Why not a hash table, or a plain binary search tree?"
**L4** "Your index exists and the query is still slow. Give me four different reasons why."
**L5** "500M rows, 90% reads, queries filter on `tenant_id` + `created_at` and sort by `created_at`. Design the indexes. What do the writes now cost?"

**Model answer:**

- A default Postgres index is a **B+tree** (Lehman–Yao variant, allowing concurrent access without locking the whole tree). Keys live in internal nodes for routing; **all the actual values sit in leaf nodes, which are linked to their siblings** — that sideways link is what makes range scans (`BETWEEN`, `ORDER BY`, `>`) fast.
- **Why B+tree and not a binary tree:** the unit of disk I/O is a page (8KB in Postgres), not a byte. A binary tree of 500M rows is ~29 levels deep = up to 29 random reads. A B+tree with a few hundred keys per page has a **fanout of hundreds**, so it's 3–4 levels deep — 3–4 page reads, and the top levels are always hot in cache. The data structure is shaped by the storage medium. That sentence is what L3 is testing.
- **Why not a hash index:** O(1) for `=`, but useless for ranges, sorting, prefix matching, or `ORDER BY ... LIMIT`. Postgres has hash indexes; they're rarely the right call.
- **Why the index can be ignored:** (a) the filter isn't a prefix of a composite index — `INDEX (a, b)` can't serve a query filtering only on `b`; (b) the query touches too much of the table, so a **sequential scan is genuinely cheaper** than random I/O per row (roughly past ~5–10% selectivity); (c) a function or type cast on the column (`WHERE lower(email) = …` needs an expression index); (d) **stale statistics** — the planner's row estimate is wrong, so it costs the plan wrong; (e) the values aren't selective (indexing a boolean).
- **Cost of every index:** slower `INSERT`/`UPDATE`/`DELETE` (every index must be maintained), more disk, more WAL, more vacuum work. Unused indexes are pure tax — `pg_stat_user_indexes.idx_scan = 0` finds them.

**Composite index rule:** equality columns first, then the range/sort column — `(tenant_id, created_at)` serves `WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20` with no sort step at all. Reversing it doesn't.

**Covering / index-only scan:** if every column the query needs is in the index (`INCLUDE (...)`), Postgres can answer from the index alone — **but only if the visibility map says the pages are all-visible**, otherwise it still goes to the heap to check row visibility. That visibility-map detail is a strong L4 signal.

**Postgres index types worth knowing:** `btree` (default, ordered), `hash` (equality only), **`GIN`** (inverted index — `jsonb`, arrays, full-text; fast reads, slow writes), **`GiST`** (generalized tree — geometry, ranges, nearest-neighbour), **`BRIN`** (block-range min/max — tiny index for huge naturally-ordered tables like append-only time series), `SP-GiST`. For embeddings, `pgvector` adds **HNSW** (graph-based, fast and accurate, higher build cost) and **IVFFlat** (cluster-based, needs training on real data).

---

## 2. MVCC — why your `UPDATE` doesn't block my `SELECT`

**L2** "Two transactions touch the same row. Who blocks whom?"
**L3** "How does Postgres show each transaction a different version of the same row?"
**L4** "The table has 10k rows but a `SELECT count(*)` takes 8 seconds. Explain."

**Model answer:**

- Postgres never updates a row in place. An `UPDATE` writes a **new row version (tuple)** and marks the old one dead. Every tuple carries `xmin` (the transaction that created it) and `xmax` (the one that deleted it). A transaction sees a tuple if `xmin` is committed and visible to its snapshot and `xmax` isn't. **Readers never block writers, writers never block readers.** Only writer-vs-writer on the same row blocks.
- The cost is **bloat**: dead tuples stay in the heap until **VACUUM** reclaims them. A table churned hard with autovacuum falling behind can hold 10k live rows in gigabytes of pages — and a count or seq scan reads all those pages. That's the 8-second answer.
- **`VACUUM` reclaims space for reuse; `VACUUM FULL` rewrites the table and returns space to the OS but takes an `ACCESS EXCLUSIVE` lock** — never casually on a live table.
- **Transaction ID wraparound:** the visibility comparison uses a 32-bit counter, so old rows must be *frozen* before the counter laps. Autovacuum does this; if it can't keep up (long-running transactions, disabled autovacuum), Postgres will eventually refuse writes to protect data. A genuinely senior war-story topic.
- **Contrast — InnoDB (MySQL):** also MVCC, but old versions live in an **undo log** and the clustered primary-key index holds the row data itself. So in InnoDB, secondary indexes store the *primary key*, not a row pointer — every secondary lookup is two traversals. That contrast is a great L3 question.

---

## 3. WAL — how a crash doesn't lose your commit

**L3** "You `COMMIT`, the machine loses power one millisecond later. Is the data there? Why?"

- Every change is written to the **Write-Ahead Log first**, and the commit isn't acknowledged until that WAL record is `fsync`ed to disk. The actual data pages can still be dirty in shared buffers — they're flushed later at a **checkpoint**. On restart, Postgres replays WAL from the last checkpoint. Durability comes from the log, not from the table files.
- **Why this is fast:** WAL writes are *sequential* appends; random page writes are deferred and batched. Sequential I/O is the whole trick.
- **Knobs and their honest tradeoff:** `synchronous_commit = off` makes commits much faster and risks losing the last fraction of a second on a crash — safe for analytics ingest, wrong for payments. `full_page_writes` protects against torn pages at the cost of WAL volume.
- **WAL is also the replication stream** — a physical replica just replays it. **Logical decoding** turns it into a row-level change stream, which is how CDC tools (Debezium) and Postgres logical replication work — the mechanism behind "how would you sync Postgres to Elasticsearch?"

---

## 4. The query planner and join algorithms

**L3** "`EXPLAIN` shows a hash join. Why did it pick that over a nested loop?"
**L4** "Estimated rows: 12. Actual rows: 2,400,000. What is that telling you, and what do you do?"

**The three joins — know when each wins:**

| Join | How it works | Best when | Falls apart when |
|---|---|---|---|
| **Nested loop** | For each outer row, look up matches (ideally via index) | Outer side is small, inner side is indexed | Outer side is big → O(n·m) |
| **Hash join** | Build a hash table from the smaller side, probe with the larger | Equality joins, one side fits in `work_mem` | Doesn't fit → spills to disk in batches; no use for `<`/`>` |
| **Merge join** | Sort both sides, walk them in lockstep | Both inputs already sorted (e.g. by index order) | Paying for two sorts you didn't need |

- The planner is **cost-based**: it estimates rows from statistics gathered by `ANALYZE` (most-common-values list, histogram, `n_distinct`, correlation) and picks the cheapest plan under `random_page_cost` / `seq_page_cost` assumptions.
- **Estimate vs actual divergence is the single most useful thing in `EXPLAIN (ANALYZE, BUFFERS)`.** A 200,000× underestimate means the planner chose a nested loop for what turned out to be millions of rows. Causes: stale stats (`ANALYZE`), correlated columns the planner assumes are independent (fix: `CREATE STATISTICS`), or a filter it can't estimate (an opaque function).
- `BUFFERS` shows shared hits vs reads — how much came from cache vs disk. Candidates who ask for `BUFFERS` unprompted are the real thing.

---

## 5. Isolation levels and the anomalies

**L3** "Postgres defaults to READ COMMITTED. What can still go wrong, and give me the exact sequence."

| Level | Prevents | Still allows |
|---|---|---|
| Read uncommitted | (Postgres treats as read committed) | — |
| **Read committed** (PG default) | Dirty reads | Non-repeatable reads, phantoms, lost updates via read-modify-write |
| **Repeatable read** (= snapshot isolation in PG) | Dirty, non-repeatable, phantoms | **Write skew** |
| **Serializable** (PG: SSI) | Everything | Nothing — but transactions get aborted with a serialization error and **your app must retry** |

- The classic **lost update**: two requests read `balance = 100`, both compute `100 - 10`, both write `90`. Two withdrawals, one deduction. Fixes: `UPDATE accounts SET balance = balance - 10` (atomic in the DB), `SELECT ... FOR UPDATE` (row lock), optimistic concurrency with a `version` column, or SERIALIZABLE + retry.
- **Write skew** (why REPEATABLE READ isn't enough): two doctors both on call, each transaction checks "is at least one other doctor on call?", sees yes on its own snapshot, and both go off call. Neither wrote the same row, so snapshot isolation allows it. Postgres SERIALIZABLE (SSI, via predicate locks) catches it.
- **MySQL contrast:** InnoDB defaults to REPEATABLE READ and uses **gap locks** to block phantoms — which is also why MySQL deadlocks look different from Postgres ones.
- **Deadlocks:** Postgres detects cycles and kills one transaction (`deadlock_timeout`, default 1s). Prevention is boring and effective: **always acquire locks in a consistent order.**

---

## 6. Connections, pooling, and why Postgres falls over at 500 clients

**L4** "Your Node app scales to 20 instances, pool size 20 each. What happens to Postgres?"

- Postgres is **process-per-connection** — each one costs memory and scheduler time, and `work_mem` is per operation *per connection*. 400 connections isn't 400× throughput; past roughly (cores × 2–4) active connections, throughput drops from contention.
- **PgBouncer** in **transaction pooling** mode multiplexes thousands of client connections onto a few dozen server ones. The catch, and the real L4 answer: in transaction mode you lose session state — prepared statements, `SET` session vars, advisory locks, and `LISTEN/NOTIFY` break or behave surprisingly.
- Serverless makes this sharper: every lambda invocation wanting its own connection is the classic outage. Fixes: a pooler in front, or an HTTP-based data proxy.

---

## 7. B-tree vs LSM tree — the storage-engine question

**L3** "Cassandra, RocksDB and ScyllaDB use LSM trees. Postgres uses B+trees. What's the actual difference, and when would you pick each?"

| | **B+tree (Postgres, InnoDB)** | **LSM tree (Cassandra, RocksDB, Scylla)** |
|---|---|---|
| Write path | Find the page, modify in place, WAL | Append to in-memory memtable → flush to immutable **SSTable** → background **compaction** merges them |
| Write cost | Random I/O, write amplification from page updates | **Sequential writes — much higher write throughput** |
| Read cost | Predictable: 3–4 page reads | May check several SSTables; **Bloom filters** skip the ones that can't contain the key |
| Pain | Write throughput ceiling, index maintenance | **Compaction** steals I/O and causes latency spikes; space amplification; tombstones |
| Pick it when | Reads and range queries dominate; you want strong secondary indexes and joins | Write-heavy ingest (events, metrics, time series) at very large scale |

The insight the interviewer wants: **both are the same tradeoff triangle — read amplification, write amplification, space amplification. You pick which one to pay.**

---

## 8. Partitioning, sharding, and the key you can't change

**L5** "500M rows and growing 20M/month. Walk me through your options, in the order you'd actually try them."

The honest order — a candidate who jumps straight to sharding is a red flag:
1. **Index and query fixes.** Most "we need to shard" problems are a missing composite index.
2. **Archive cold data.** Do you need 5 years hot?
3. **Read replicas** for read scaling — cheap, but now you have replication lag and read-your-own-writes bugs (fix: route the user's reads to the primary for a few seconds after a write).
4. **Declarative partitioning** (range by month, hash by tenant). Real win: **partition pruning** skips whole partitions, and dropping an old partition is instant vs. a `DELETE` that bloats the table. Caveat: every unique constraint must include the partition key.
5. **Sharding** (Citus, or app-level). Now: cross-shard joins hurt, transactions across shards need 2PC or sagas, and **rebalancing is a project**.

**Choosing a shard/partition key** — the question most candidates fumble. It must spread load *and* keep the common query on one shard. Sharding a multi-tenant app by `tenant_id` is usually right, except one whale tenant becomes a **hot shard**. DynamoDB makes this explicit: the partition key is hashed to place the item, throughput is per-partition, and a hot key throttles regardless of your total provisioned capacity — hence composite keys with a suffix, or write sharding.

---

## 9. The other stores — one paragraph of mechanism each

- **Redis:** single-threaded command execution (so every command is atomic, and one `KEYS *` on 10M keys blocks *everyone* — use `SCAN`); I/O threading exists for network, not command execution. Persistence: **RDB** snapshots (fast restart, can lose minutes) vs **AOF** append log (`fsync everysec` is the usual compromise). Expiry is lazy-on-access plus a sampling loop, so expired keys still occupy memory for a while. Eviction policies (`allkeys-lru`, `volatile-ttl`) matter when it's a cache; **`noeviction` + full memory = write errors**, which is what people hit in production.
- **Elasticsearch/Lucene:** an **inverted index** — term → posting list of documents. Segments are immutable; a "delete" is a tombstone until merge. It's **near**-real-time: a document is searchable after a refresh (1s by default), not after the write returns. Relevance is BM25 unless you say otherwise.
- **DynamoDB:** partition key → hash → partition; sort key gives ordering within it. Single-table design exists because there are no joins — you model the access patterns first and the schema second, which is the exact inverse of the relational habit.
- **Kafka:** not a queue — a **partitioned, append-only log** with retention. Ordering is guaranteed *per partition*, so the partition key decides ordering and parallelism. Consumers track **offsets**; nothing is destroyed on read, which is why replay is possible. Throughput comes from sequential disk + page cache + zero-copy sends, not from magic.

---

## Rapid-fire L3 probes

- "Why is `OFFSET 100000` slow when the index is perfect?" (rows are still scanned and discarded → keyset pagination)
- "`SELECT count(*)` in Postgres vs MySQL MyISAM — why the difference?" (MVCC: no single true count; visibility is per-snapshot)
- "You add `LIMIT 10` and the query gets *slower*. How?" (planner switches to an index scan expecting to stop early, then has to scan far to find 10 matches)
- "What's a covering index and when does it not help?" (visibility map)
- "`UUID` v4 as a primary key — what does it cost?" (random insert position → index page splits and poor locality; time-ordered UUIDv7/ULID fixes it)
- "`TEXT` column of 50KB — where does it live?" (TOAST: compressed and moved out of line past ~2KB, fetched only when selected)
- "Explain `SELECT FOR UPDATE SKIP LOCKED`." (the clean way to build a job queue on Postgres without a broker)
- "Soft delete (`deleted_at`) — what breaks at scale?" (every query needs the filter, unique constraints need partial indexes, and the table never shrinks)
- "Read replica lag is 5s and a user doesn't see their own comment. Fix it." (sticky reads to primary, monotonic reads, or a write-through cache)
