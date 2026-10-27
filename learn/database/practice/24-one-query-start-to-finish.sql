-- Practice for lesson 24: One query, from start to finish
-- Lesson: learn/database/24-one-query-start-to-finish.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. (Task 6 needs psql, because it uses \gset.)
--   Option 2, any Postgres where you may run CREATE EXTENSION (pg_buffercache is in contrib).
--
-- How to work
--   1. Run the setup part once. It makes one table with fixed rows.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Compare with the expected result. Then answer the question in a comment.
--   The answers are in the lesson, in card 13C, inside "One possible answer".
--
-- About the expected results (checked on PostgreSQL 17.5)
--   * Postgres 18 prints "actual rows=2.00" where 17 prints "actual rows=2", and adds more lines.
--     The shape of the plan is the same.
--   * Ignore the "Planning:" lines and the "Memory:" numbers. They change from machine to machine.
--   * "Buffers: shared hit=541" can say "read=541" if the pages were not in memory yet.
--   * ANALYZE reads a random sample, so "rows=9807" moves a little on every run.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the table first)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_buffercache;

DROP TABLE IF EXISTS l24_orders;

-- autovacuum_enabled = false stops Postgres from running ANALYZE in the background,
-- so Task 2 can show the planner's guess before it has any notes.
CREATE TABLE l24_orders (
  id          int PRIMARY KEY,
  status      text NOT NULL,
  total_cents int NOT NULL
) WITH (autovacuum_enabled = false);

-- 100,000 orders. Exactly 10,000 are PENDING (every 10th), the rest are PAID.
-- total_cents is a fixed pattern, so you get the same numbers as the lesson.
INSERT INTO l24_orders (id, status, total_cents)
SELECT g,
       CASE WHEN g % 10 = 0 THEN 'PENDING' ELSE 'PAID' END,
       1000 + (g * 7919) % 19001
FROM generate_series(1, 100000) AS g;

-- ---------------------------------------------------------------------------
-- Task 1. Which stop fails?
-- ---------------------------------------------------------------------------
-- Run each statement on its own. Each one fails. For each, write which stop failed:
-- the parser, the name check, or the executor.
--   a) SELCT id FROM l24_orders;
--   b) SELECT idd FROM l24_orders;
--   c) SELECT 1 / 0;
--
-- Expected messages:
--   a) ERROR:  syntax error at or near "SELCT"
--   b) ERROR:  column "idd" does not exist
--   c) ERROR:  division by zero

-- TODO


-- ---------------------------------------------------------------------------
-- Task 2. The planner's guess, before and after ANALYZE
-- ---------------------------------------------------------------------------
-- a) Count the PENDING orders. Expected: 10000
-- b) Run EXPLAIN (no ANALYZE) on:
--      SELECT * FROM l24_orders WHERE status = 'PENDING';
--    Nobody has run ANALYZE yet. Expected (the rows number can differ a little):
--      Seq Scan on l24_orders  (cost=0.00..1352.50 rows=325 width=40)
--        Filter: (status = 'PENDING'::text)
-- c) Run ANALYZE l24_orders; then the same EXPLAIN. Expected (rows is about 10000, and moves):
--      Seq Scan on l24_orders  (cost=0.00..1791.00 rows=9807 width=13)
--        Filter: (status = 'PENDING'::text)
-- Answer in a comment: how far was the first guess from the truth? Why did it get better?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 3. The plan as a tree
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) on:
--   SELECT id, total_cents FROM l24_orders
--   WHERE status = 'PAID' ORDER BY total_cents DESC LIMIT 2;
--
-- Expected plan (Postgres 17):
--   Limit (actual rows=2 loops=1)
--     Buffers: shared hit=541
--     ->  Sort (actual rows=2 loops=1)
--           Sort Key: total_cents DESC
--           Sort Method: top-N heapsort  Memory: 17kB
--           Buffers: shared hit=541
--           ->  Seq Scan on l24_orders (actual rows=90000 loops=1)
--                 Filter: (status = 'PAID'::text)
--                 Rows Removed by Filter: 10000
--                 Buffers: shared hit=541
--
-- Answer in a comment: how many rows did the Seq Scan pass up? Which box runs first?
-- Then run EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF)
-- on SELECT * FROM l24_orders LIMIT 1;
-- Expected: Buffers: shared hit=2. Why only 2 pages?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 4. The cost of two ways
-- ---------------------------------------------------------------------------
-- Make an index on total_cents, named l24_orders_total, and run ANALYZE l24_orders.
-- Then run EXPLAIN on:
--   SELECT * FROM l24_orders WHERE total_cents = 12345;
-- Expected:
--   Bitmap Heap Scan on l24_orders  (cost=4.33..22.95 rows=5 width=13)
--     Recheck Cond: (total_cents = 12345)
--     ->  Bitmap Index Scan on l24_orders_total  (cost=0.00..4.33 rows=5 width=0)
--           Index Cond: (total_cents = 12345)
--
-- Now turn off the two index ways, so the planner shows the other score:
--   SET enable_indexscan = off;  SET enable_bitmapscan = off;
-- Run the same EXPLAIN. Expected:
--   Seq Scan on l24_orders  (cost=0.00..1791.00 rows=5 width=13)
--     Filter: (total_cents = 12345)
-- Then RESET both settings (this is a way to look, never a way to fix a real query).
-- Answer in a comment: where does 1791.00 come from?
--   Hint: 541 pages * 1.00 + 100000 rows * 0.01 + 100000 rows * 0.0025.

-- TODO


-- ---------------------------------------------------------------------------
-- Task 5. How many pages of the table are in memory?
-- ---------------------------------------------------------------------------
-- Count the rows of pg_buffercache that belong to l24_orders (use
-- pg_relation_filenode('l24_orders')) and are in the main fork (relforknumber = 0).
-- Expected (the table has 541 pages, and they were just read):
--   pages_in_memory
--   541
--
-- Answer in a comment: what does the number mean in the "memory first, disk second" card?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 6. How much log does one INSERT write?
-- ---------------------------------------------------------------------------
-- In psql, save the log position, insert one row, then subtract:
--   SELECT pg_current_wal_lsn() AS before \gset
--   INSERT INTO l24_orders VALUES (100001, 'PAID', 5000);
--   SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'before') AS wal_bytes;
--
-- Expected: a few hundred bytes. I got 296, then 240 for a second insert.
-- If you see about 8,000 or more, that is a full-page image: the first change to a page
-- after a checkpoint writes the whole 8 KB page (full_page_writes). Run it again.
--
-- Answer in a comment: why does COMMIT wait for the log and not for the table page?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 7 (extra). Where did the row go?
-- ---------------------------------------------------------------------------
-- a) SELECT ctid, id, status FROM l24_orders WHERE id = 7;
--    Expected: (0,7)
-- b) UPDATE l24_orders SET status = 'CANCELLED' WHERE id = 7;
-- c) Ask again. Expected: a new address near the end of the table, like (540,103).
--    The last slot number can differ a little.
-- Answer in a comment: what happened to the old copy, and who cleans it?

-- TODO
