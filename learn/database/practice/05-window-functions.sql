-- Practice for lesson 05: Window functions
-- Lesson: learn/database/05-window-functions.md
--
-- How to run:
--   Docker playground (from learn/database/examples/postgres-practice):
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/05-window-functions.sql
--   or open psql and paste the setup part, then write each query yourself:
--     docker compose exec db psql -U practice practice
--   (docker compose exec ... -f /path only works if the file is inside the container.
--    The "< file" form above sends the file from your computer.)
--
-- How to use it:
--   1. Run the SETUP part once. It makes two tiny tables with fixed rows.
--   2. For each task, write your query under "-- TODO".
--   3. Compare your result with "Expected result". Row order matters only when the task says so.
--   Answers are in the lesson, section 9, "One possible answer". Try first.
--
-- Checked on 2026-10-16 with PostgreSQL 18.3. The results are the same on PostgreSQL 16.

-- ===========================================================================
-- SETUP (safe to run again: it drops and makes the tables)
-- ===========================================================================
DROP TABLE IF EXISTS l05_orders;
DROP TABLE IF EXISTS l05_points;

CREATE TABLE l05_orders (
  id         int PRIMARY KEY,
  store_id   int NOT NULL,
  total      int NOT NULL,
  created_at date NOT NULL
);
INSERT INTO l05_orders VALUES
  (1, 10, 120, '2026-09-01'),
  (2, 10,  80, '2026-09-03'),
  (3, 10, 120, '2026-09-05'),
  (4, 20,  60, '2026-09-02'),
  (5, 20,  90, '2026-09-04'),
  (6, 10, 200, '2026-09-07'),
  (7, 30,  50, '2026-09-06');

CREATE TABLE l05_points (
  id         int PRIMARY KEY,
  store_id   int NOT NULL,
  amount     int NOT NULL,   -- plus = earned, minus = used
  created_at date NOT NULL
);
INSERT INTO l05_points VALUES
  (1, 10,  40, '2026-09-01'),
  (2, 10,  60, '2026-09-02'),
  (3, 10, -30, '2026-09-03'),
  (4, 10,  10, '2026-09-04'),
  (5, 20,  25, '2026-09-01'),
  (6, 20,  -5, '2026-09-02');

-- ===========================================================================
-- TASK 1. Number each order inside its store, oldest first.
-- Show store_id, id, created_at and a column order_no.
-- The first order of each store is 1, the second is 2, and so on.
-- Sort the result by store_id, then order_no.
-- ===========================================================================
-- TODO

-- Expected result (7 rows, in this order):
--  store_id | id | created_at | order_no
--  10       | 1  | 2026-09-01 | 1
--  10       | 2  | 2026-09-03 | 2
--  10       | 3  | 2026-09-05 | 3
--  10       | 6  | 2026-09-07 | 4
--  20       | 4  | 2026-09-02 | 1
--  20       | 5  | 2026-09-04 | 2
--  30       | 7  | 2026-09-06 | 1

-- ===========================================================================
-- TASK 2. Rank the orders inside each store by total, biggest first.
-- Show store_id, id, total, a column rnk with RANK and a column dense with DENSE_RANK.
-- Store 10 has a tie: two orders of 120.
-- Sort by store_id, then total DESC, then id.
-- ===========================================================================
-- TODO

-- Expected result (7 rows, in this order):
--  store_id | id | total | rnk | dense
--  10       | 6  | 200   | 1   | 1
--  10       | 1  | 120   | 2   | 2
--  10       | 3  | 120   | 2   | 2
--  10       | 2  | 80    | 4   | 3
--  20       | 5  | 90    | 1   | 1
--  20       | 4  | 60    | 2   | 2
--  30       | 7  | 50    | 1   | 1

-- ===========================================================================
-- TASK 3. Points balance after each change, per store (a running total).
-- Show store_id, id, amount and a column balance.
-- Sort by store_id, then created_at.
-- ===========================================================================
-- TODO

-- Expected result (6 rows, in this order):
--  store_id | id | amount | balance
--  10       | 1  | 40     | 40
--  10       | 2  | 60     | 100
--  10       | 3  | -30    | 70
--  10       | 4  | 10     | 80
--  20       | 5  | 25     | 25
--  20       | 6  | -5     | 20

-- ===========================================================================
-- TASK 4. Compare each order with the store's order before it (by date).
-- Show store_id, id, total, previous_total and change (total minus previous_total).
-- Sort by store_id, then created_at.
-- ===========================================================================
-- TODO

-- Expected result (7 rows, in this order). An empty cell is NULL:
--  store_id | id | total | previous_total | change
--  10       | 1  | 120   |                |
--  10       | 2  | 80    | 120            | -40
--  10       | 3  | 120   | 80             | 40
--  10       | 6  | 200   | 120            | 80
--  20       | 4  | 60    |                |
--  20       | 5  | 90    | 60             | 30
--  30       | 7  | 50    |                |

-- ===========================================================================
-- TASK 5. The 2 newest orders of each store ("top N per group", N = 2).
-- Show store_id, id, created_at.
-- Store 30 has only one order. It must still show up.
-- Sort by store_id, then created_at DESC.
-- ===========================================================================
-- TODO

-- Expected result (5 rows, in this order):
--  store_id | id | created_at
--  10       | 6  | 2026-09-07
--  10       | 3  | 2026-09-05
--  20       | 5  | 2026-09-04
--  20       | 4  | 2026-09-02
--  30       | 7  | 2026-09-06

-- ===========================================================================
-- TASK 6. Fix the bug. This query should return the biggest order of each store.
-- Run it first and read the error. Then fix it without changing the idea.
-- ===========================================================================
-- SELECT store_id, id, total
-- FROM l05_orders
-- WHERE ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total DESC, id) = 1;
--
-- The error it gives:
--   ERROR:  window functions are not allowed in WHERE
--
-- TODO (your fixed query)

-- Expected result (3 rows, sorted by store_id):
--  store_id | id | total
--  10       | 6  | 200
--  20       | 5  | 90
--  30       | 7  | 50

-- ===========================================================================
-- TASK 7 (optional, uses the big seed table "orders").
-- Write "top 3 orders per store by total_cents" on the real orders table,
-- then put EXPLAIN ANALYZE in front of it.
-- ===========================================================================
-- TODO

-- Expected plan SHAPE (your numbers will differ, the seed uses random()):
--   WindowAgg                      <- writes row_number, stops each store after 3
--     Run Condition: (row_number() OVER (...) <= 3)
--     ->  Sort                     <- sorts by store_id, total_cents DESC
--           ->  Seq Scan on orders <- reads all ~100,000 orders
-- About 2,700 rows come out (900 stores with orders, 3 each).
-- PostgreSQL 18 also prints a "Window:" line and a "Storage:" line. PostgreSQL 16 does not.
