-- Practice for lesson 11: Reading EXPLAIN
-- Lesson: learn/database/11-reading-explain.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/11-reading-explain.sql
--   (-T lets psql read the file from your computer. The file is not inside the container.)
--   Option 2, open psql and paste this file in, one task at a time.
--     docker compose exec db psql -U practice practice
--
-- How to work
--   1. Run the setup part once. It makes two small tables with fixed rows,
--      so your row counts match the expected results exactly.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Compare with the expected result. Then answer the question in a comment.
--   The answers are in the lesson, in section 9C, inside "One possible answer".
--
-- About the expected plans
--   * They use EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF)
--     so no times or costs are printed, only the shape and the real row counts.
--   * Postgres 16 (the Docker playground) prints rows=200 where Postgres 18 prints rows=200.00.
--     Postgres 18 also prints an extra line "Index Searches: 1" under index nodes.
--   * Ignore "Memory:" numbers. They change from machine to machine.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l11_orders;
DROP TABLE IF EXISTS l11_stores;

CREATE TABLE l11_stores (
  id   int PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

-- autovacuum_enabled = false stops Postgres from refreshing the statistics
-- by itself in the background. Then task 2 shows the same wrong guess for you.
CREATE TABLE l11_orders (
  id          int PRIMARY KEY,
  store_id    int NOT NULL REFERENCES l11_stores (id),
  status      text NOT NULL,
  total_cents int NOT NULL,
  created_at  timestamptz NOT NULL
) WITH (autovacuum_enabled = false);

-- 150 stores, 30 in each of 5 cities.
INSERT INTO l11_stores (id, name, city)
SELECT g, 'Store ' || g, (ARRAY['Jakarta','Surabaya','Bandung','Medan','Semarang'])[1 + g % 5]
FROM generate_series(1, 150) AS g;

-- 30,000 orders, exactly 200 per store, one order per minute from 2026-01-01.
INSERT INTO l11_orders (id, store_id, status, total_cents, created_at)
SELECT g,
       1 + g % 150,
       (ARRAY['PAID','PAID','PAID','PENDING','CANCELLED'])[1 + g % 5],
       1000 + (g * 37) % 9000,
       timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute'
FROM generate_series(1, 30000) AS g;

ANALYZE l11_stores;
ANALYZE l11_orders;

-- ---------------------------------------------------------------------------
-- Task 1. Read a Seq Scan and find the clue
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF) on:
--   SELECT * FROM l11_orders WHERE store_id = 7;
-- Then answer: how many rows did Postgres read in total? Which line is the clue
-- that an index is missing?
--
-- Expected plan (Postgres 18):
--   Seq Scan on l11_orders (actual rows=200.00 loops=1)
--     Filter: (store_id = 7)
--     Rows Removed by Filter: 29800

-- TODO


-- ---------------------------------------------------------------------------
-- Task 2. Make the guess wrong, then fix it
-- ---------------------------------------------------------------------------
-- a) Change 10,000 orders to a status the statistics have never seen:
--      UPDATE l11_orders SET status = 'REFUNDED' WHERE id <= 10000;
-- b) Run EXPLAIN (ANALYZE, TIMING OFF, BUFFERS OFF, SUMMARY OFF) on:
--      SELECT count(*) FROM l11_orders WHERE status = 'REFUNDED';
--    (COSTS stays on here, because the guess is printed in the cost brackets.)
--    Expected: the Seq Scan line shows the guess rows=1 in the first brackets
--    and actual rows=10000.00 in the second brackets.
-- c) Run the one command that refreshes the statistics of l11_orders.
-- d) Run the EXPLAIN from b) again.
--    Expected: the guess in the Seq Scan line is now about rows=10000.
--    The count itself is 10000 every time.

-- TODO


-- ---------------------------------------------------------------------------
-- Task 3. Read a Hash Join
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF) on:
--   SELECT s.city, count(*)
--   FROM l11_orders o JOIN l11_stores s ON s.id = o.store_id
--   WHERE s.city = 'Medan'
--   GROUP BY s.city;
-- Then answer: which node runs first? Which table goes into the Hash?
-- How many rows come out of the Hash Join?
--
-- Expected result of the query itself:
--   city  | count
--   Medan | 6000
-- Expected plan shape (Postgres 18):
--   GroupAggregate (actual rows=1.00 loops=1)
--     ->  Hash Join (actual rows=6000.00 loops=1)
--           Hash Cond: (o.store_id = s.id)
--           ->  Seq Scan on l11_orders o (actual rows=30000.00 loops=1)
--           ->  Hash (actual rows=30.00 loops=1)
--                 Buckets: 1024  Batches: 1  Memory Usage: ...
--                 ->  Seq Scan on l11_stores s (actual rows=30.00 loops=1)
--                       Filter: (city = 'Medan'::text)
--                       Rows Removed by Filter: 120

-- TODO


-- ---------------------------------------------------------------------------
-- Task 4. Make the Seq Scan from task 1 go away
-- ---------------------------------------------------------------------------
-- Create one index, named l11_orders_store_id_idx. Then run the EXPLAIN from task 1 again.
-- Expected plan (Postgres 18):
--   Bitmap Heap Scan on l11_orders (actual rows=200.00 loops=1)
--     Recheck Cond: (store_id = 7)
--     Heap Blocks: exact=200
--     ->  Bitmap Index Scan on l11_orders_store_id_idx (actual rows=200.00 loops=1)
--           Index Cond: (store_id = 7)
-- (A plain "Index Scan using l11_orders_store_id_idx" is also a correct result.
--  What matters: the line "Rows Removed by Filter" is gone.)

-- TODO


-- ---------------------------------------------------------------------------
-- Task 5. Make the Sort under a LIMIT go away
-- ---------------------------------------------------------------------------
-- The query: the 3 newest orders.
--   SELECT id, total_cents FROM l11_orders ORDER BY created_at DESC LIMIT 3;
-- a) Run it with EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF).
--    Expected plan before:
--      Limit (actual rows=3.00 loops=1)
--        ->  Sort (actual rows=3.00 loops=1)
--              Sort Key: created_at DESC
--              Sort Method: top-N heapsort  Memory: ...
--              ->  Seq Scan on l11_orders (actual rows=30000.00 loops=1)
-- b) Create one index, named l11_orders_created_at_idx, so that Postgres can read
--    the rows already in order.
--    Expected plan after:
--      Limit (actual rows=3.00 loops=1)
--        ->  Index Scan Backward using l11_orders_created_at_idx on l11_orders (actual rows=3.00 loops=1)
-- c) The query result is the same before and after:
--      id    | total_cents
--      30000 | 4000
--      29999 | 3963
--      29998 | 3926

-- TODO


-- ---------------------------------------------------------------------------
-- Clean up (optional)
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS l11_orders;
-- DROP TABLE IF EXISTS l11_stores;
