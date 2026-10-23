-- Practice for lesson 09: Indexes and B-trees
-- Lesson: learn/database/09-indexes-and-b-trees.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/09-indexes-and-b-trees.sql
--   (-T lets psql read the file from your computer. The file is not inside the container.)
--   Option 2, open psql and paste this file in, one task at a time.
--     docker compose exec db psql -U practice practice
--
-- How to work
--   1. Run the setup part once. It makes two small tables with fixed rows,
--      so your counts and sizes match the expected results exactly.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Compare with the expected result. Then answer the question in a comment.
--   The answers are in the lesson, in section 9C, inside "One possible answer".
--
-- About the expected plans
--   * Postgres 16 (the Docker playground) prints rows=100 where Postgres 18 prints rows=100.00.
--     Postgres 18 also prints a line "Index Searches: 1" under index nodes.
--   * Write BUFFERS yourself. Postgres 18 adds it for you, Postgres 16 does not.
--   * Ignore the "Planning:" lines and the "Memory:" numbers. They change from machine to machine.
--   * "Buffers: shared hit=319" can say "read=319" if the pages were not in memory yet.
--     The total is the same: the table has 319 pages.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l09_orders;
DROP TABLE IF EXISTS l09_stores;

CREATE TABLE l09_stores (
  id   int PRIMARY KEY,
  name text NOT NULL
);

-- autovacuum_enabled = false stops Postgres from changing the table in the
-- background, so the page counts stay the same on every run.
CREATE TABLE l09_orders (
  id          int PRIMARY KEY,
  store_id    int NOT NULL REFERENCES l09_stores (id),   -- a foreign key: no index comes with it
  status      text NOT NULL,
  total_cents int NOT NULL
) WITH (autovacuum_enabled = false);

-- 500 stores.
INSERT INTO l09_stores (id, name)
SELECT g, 'Store ' || g FROM generate_series(1, 500) AS g;

-- 50,000 orders, exactly 100 per store.
-- Status: PENDING 1 in 7, PAID 3 in 7, SHIPPED, DELIVERED and CANCELLED 1 in 7 each.
-- total_cents is different on every row, so "the biggest 3" has no ties.
INSERT INTO l09_orders (id, store_id, status, total_cents)
SELECT g,
       1 + g % 500,
       (ARRAY['PENDING','PAID','PAID','PAID','SHIPPED','DELIVERED','CANCELLED'])[1 + g % 7],
       1000 + (g * 7919) % 1000003
FROM generate_series(1, 50000) AS g;

ANALYZE l09_stores;
ANALYZE l09_orders;

-- ---------------------------------------------------------------------------
-- Task 1. List the indexes of l09_orders
-- ---------------------------------------------------------------------------
-- Query pg_indexes for the table l09_orders. Show only the index name, sorted by name.
-- Then answer in a comment: is the foreign key column store_id indexed?
--
-- Expected result (1 row):
--   indexname
--   l09_orders_pkey

-- TODO


-- ---------------------------------------------------------------------------
-- Task 2. Count store 42's orders, and read the plan before any index
-- ---------------------------------------------------------------------------
-- a) Count the orders of store 42.
--    Expected: 100
-- b) Run EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS, SUMMARY OFF) on:
--      SELECT * FROM l09_orders WHERE store_id = 42;
--    Then answer: how many rows did Postgres read? How many pages?
--
-- Expected plan (Postgres 18):
--   Seq Scan on l09_orders (actual rows=100.00 loops=1)
--     Filter: (store_id = 42)
--     Rows Removed by Filter: 49900
--     Buffers: shared hit=319

-- TODO


-- ---------------------------------------------------------------------------
-- Task 3. Make the index, then read the plan again
-- ---------------------------------------------------------------------------
-- Create an index on l09_orders (store_id), named l09_orders_store_id_idx.
-- Run the EXPLAIN from task 2 again.
--
-- Expected plan (Postgres 18):
--   Bitmap Heap Scan on l09_orders (actual rows=100.00 loops=1)
--     Recheck Cond: (store_id = 42)
--     Heap Blocks: exact=100
--     Buffers: shared hit=100 read=2
--     ->  Bitmap Index Scan on l09_orders_store_id_idx (actual rows=100.00 loops=1)
--           Index Cond: (store_id = 42)
--           Index Searches: 1
--           Buffers: shared read=2
--
-- Answer: the index part read only 2 pages. The table part read 100 pages,
-- one for each order of store 42. That is 102 pages, not 319.

-- TODO


-- ---------------------------------------------------------------------------
-- Task 4. How big are the table and the index?
-- ---------------------------------------------------------------------------
-- Use pg_size_pretty(pg_relation_size(...)) to show the size of l09_orders and
-- of l09_orders_store_id_idx, as two columns called table_size and index_size.
--
-- Expected result (1 row):
--   table_size | index_size
--   2552 kB    | 352 kB

-- TODO


-- ---------------------------------------------------------------------------
-- Task 5. Make the Sort under a LIMIT go away
-- ---------------------------------------------------------------------------
-- The query: the 3 biggest orders.
--   SELECT id, total_cents FROM l09_orders ORDER BY total_cents DESC LIMIT 3;
-- a) Run it with EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF).
--    Expected plan before:
--      Limit (actual rows=3.00 loops=1)
--        ->  Sort (actual rows=3.00 loops=1)
--              Sort Key: total_cents DESC
--              Sort Method: top-N heapsort  Memory: ...
--              ->  Seq Scan on l09_orders (actual rows=50000.00 loops=1)
-- b) Create one index, named l09_orders_total_cents_idx, so Postgres can read the
--    leaves from the end, already in order.
--    Expected plan after:
--      Limit (actual rows=3.00 loops=1)
--        ->  Index Scan Backward using l09_orders_total_cents_idx on l09_orders (actual rows=3.00 loops=1)
--              Index Searches: 1
-- c) The result is the same before and after:
--      id    | total_cents
--      23993 | 1001000
--      47986 | 1000997
--      18563 | 1000959

-- TODO


-- ---------------------------------------------------------------------------
-- Task 6. Find a filter where the index is NOT used
-- ---------------------------------------------------------------------------
-- Create an index on l09_orders (status), named l09_orders_status_idx.
-- Then run EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF) on:
--   SELECT * FROM l09_orders WHERE status IN ('PAID', 'SHIPPED');
-- Answer: which scan did Postgres pick, and why not the index?
--
-- Expected plan (Postgres 18):
--   Seq Scan on l09_orders (actual rows=28572.00 loops=1)
--     Filter: (status = ANY ('{PAID,SHIPPED}'::text[]))
--     Rows Removed by Filter: 21428
--
-- Answer: 28,572 of 50,000 rows match (4 in 7). Almost every table page holds a
-- match, so reading the table in order is cheaper than jumping around with the index.

-- TODO


-- ---------------------------------------------------------------------------
-- Clean up (optional)
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS l09_orders;
-- DROP TABLE IF EXISTS l09_stores;
