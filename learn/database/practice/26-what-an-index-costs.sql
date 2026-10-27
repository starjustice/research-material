-- Practice for lesson 26: What an index costs, and when Postgres ignores it
-- Lesson: learn/database/26-what-an-index-costs.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. The setup takes up to a minute (2 million rows).
--   Option 2, any Postgres. Use a test database.
--
-- How to work
--   1. Run the setup part once. It makes the tables and indexes.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Compare with the expected result. Then answer the question in a comment.
--   The answers are in the lesson, in card 12C, inside "One possible answer".
--
-- About the expected results (checked on PostgreSQL 17.5)
--   * Sizes can differ by a few percent on another build (for example 5888 kB can be 5904 kB).
--   * Counts like n_tup_hot_upd depend on how full the pages are. They match on a fresh table.
--   * The statistics counters are written in batches. pg_stat_force_next_flush() makes them
--     show up now (Postgres 15 and later).

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

-- Without parallel workers the plans match the lesson. A table this big may show Parallel Seq Scan.
SET max_parallel_workers_per_gather = 0;

DROP TABLE IF EXISTS l26_orders;
DROP TABLE IF EXISTS l26_hot100;
DROP TABLE IF EXISTS l26_hot100b;
DROP TABLE IF EXISTS l26_hot70;
DROP TABLE IF EXISTS l26_events;

-- 1 million orders: 900,000 PAID and 100,000 PENDING.
CREATE TABLE l26_orders (
  id     int PRIMARY KEY,
  email  text NOT NULL,
  status text NOT NULL,
  note   text NOT NULL
) WITH (autovacuum_enabled = false);

INSERT INTO l26_orders (id, email, status, note)
SELECT g,
       'user' || g || '@example.com',
       CASE WHEN g % 10 = 0 THEN 'PENDING' ELSE 'PAID' END,
       'note number ' || g
FROM generate_series(1, 1000000) AS g;

CREATE INDEX l26_orders_status ON l26_orders (status);
CREATE INDEX l26_orders_email  ON l26_orders (email);
ANALYZE l26_orders;

-- Three small tables for the update tests. 100,000 rows each, an index on email.
-- l26_hot100 and l26_hot100b keep pages full (fillfactor 100). l26_hot70 leaves 30% empty.
CREATE TABLE l26_hot100 (id int PRIMARY KEY, email text NOT NULL, note text NOT NULL)
  WITH (fillfactor = 100, autovacuum_enabled = false);
CREATE TABLE l26_hot100b (id int PRIMARY KEY, email text NOT NULL, note text NOT NULL)
  WITH (fillfactor = 100, autovacuum_enabled = false);
CREATE TABLE l26_hot70 (id int PRIMARY KEY, email text NOT NULL, note text NOT NULL)
  WITH (fillfactor = 70, autovacuum_enabled = false);

CREATE INDEX l26_hot100_email  ON l26_hot100 (email);
CREATE INDEX l26_hot100b_email ON l26_hot100b (email);
CREATE INDEX l26_hot70_email   ON l26_hot70 (email);

INSERT INTO l26_hot100  SELECT g, 'user' || g || '@example.com', 'v1' FROM generate_series(1, 100000) AS g;
INSERT INTO l26_hot100b SELECT g, 'user' || g || '@example.com', 'v1' FROM generate_series(1, 100000) AS g;
INSERT INTO l26_hot70   SELECT g, 'user' || g || '@example.com', 'v1' FROM generate_series(1, 100000) AS g;

-- 1 million events, one per second, stored in time order.
CREATE TABLE l26_events (id int, at timestamptz NOT NULL) WITH (autovacuum_enabled = false);
INSERT INTO l26_events (id, at)
SELECT g, timestamptz '2026-01-01 00:00:00+00' + g * interval '1 second'
FROM generate_series(1, 1000000) AS g;
CREATE INDEX l26_events_btree ON l26_events USING btree (at);
CREATE INDEX l26_events_brin  ON l26_events USING brin (at);

-- ---------------------------------------------------------------------------
-- Task 1. PAID against PENDING
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (COSTS OFF) on each:
--   a) SELECT * FROM l26_orders WHERE status = 'PAID';
--   b) SELECT * FROM l26_orders WHERE status = 'PENDING';
-- Expected a):
--   Seq Scan on l26_orders
--     Filter: (status = 'PAID'::text)
-- Expected b):
--   Bitmap Heap Scan on l26_orders
--     Recheck Cond: (status = 'PENDING'::text)
--     ->  Bitmap Index Scan on l26_orders_status
--           Index Cond: (status = 'PENDING'::text)
-- Answer in a comment: both queries have an index on status. Why is a) a Seq Scan?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 2. Fix the hidden column
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (COSTS OFF) on:
--   SELECT id FROM l26_orders WHERE lower(email) = 'user777777@example.com';
-- Expected:
--   Seq Scan on l26_orders
--     Filter: (lower(email) = 'user777777@example.com'::text)
-- Make an index that fixes it, named l26_orders_email_lower. Run the same EXPLAIN. Expected:
--   Bitmap Heap Scan on l26_orders
--     Recheck Cond: (lower(email) = 'user777777@example.com'::text)
--     ->  Bitmap Index Scan on l26_orders_email_lower
--           Index Cond: (lower(email) = 'user777777@example.com'::text)
-- Answer in a comment: why did the index on email not help?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 3. An UPDATE that is not HOT
-- ---------------------------------------------------------------------------
-- a) Show the sizes of l26_hot100, of l26_hot100_pkey and of l26_hot100_email, as
--    table_size, pkey_index and email_index.
--    Expected:
--      table_size | pkey_index | email_index
--      5888 kB    | 2208 kB    | 6928 kB
-- b) UPDATE l26_hot100 SET email = 'x' || email;   (100,000 rows. Only email changes.)
-- c) Show the sizes again. Expected:
--      table_size | pkey_index | email_index
--      11 MB      | 4408 kB    | 13 MB
-- Answer in a comment: the id did not change. Why did the primary key index double?
-- Which command makes the space reusable?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 4. HOT updates
-- ---------------------------------------------------------------------------
-- email has an index, note does not. Update only note, on both tables:
--   UPDATE l26_hot100b SET note = 'v2';
--   UPDATE l26_hot70   SET note = 'v2';
-- Then SELECT pg_stat_force_next_flush(); and show relname, n_tup_upd, n_tup_hot_upd from
-- pg_stat_user_tables for the two tables, sorted by relname. Expected:
--   relname     | n_tup_upd | n_tup_hot_upd
--   l26_hot100b |    100000 |             0
--   l26_hot70   |    100000 |         43173
-- Answer in a comment: why 0 for one and 43173 for the other?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 5. BRIN against B-tree
-- ---------------------------------------------------------------------------
-- Show the sizes of l26_events, l26_events_btree and l26_events_brin as table_size,
-- btree_size and brin_size. Expected:
--   table_size | btree_size | brin_size
--   42 MB      | 21 MB      | 24 kB
-- Answer in a comment: why does BRIN work well here? When would it work badly?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 6. Find the index nobody uses
-- ---------------------------------------------------------------------------
-- Run these three queries first, so the counters have something to count:
--   SELECT id FROM l26_orders WHERE id = 5;
--   SELECT id FROM l26_orders WHERE email = 'user5@example.com';
--   SELECT count(*) FROM l26_orders WHERE status = 'PENDING';
-- Then SELECT pg_stat_force_next_flush(); and list indexrelname and idx_scan for the indexes
-- of l26_orders (view pg_stat_user_indexes, column relname), sorted by idx_scan, then name.
-- Expected:
--   indexrelname           | idx_scan
--   l26_orders_email_lower |        0
--   l26_orders_email       |        1
--   l26_orders_pkey        |        1
--   l26_orders_status      |        1
-- (This needs Task 2 done, so the l26_orders_email_lower index exists.)
-- Answer in a comment: l26_orders_email_lower has idx_scan 0. Is it safe to drop? What do you check?

-- TODO
