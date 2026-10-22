-- Practice for lesson 03: Grouping and aggregation
-- Lesson: learn/database/03-grouping-and-aggregation.md
--
-- How to run it:
--   1. Start the playground: cd learn/database/examples/postgres-practice && docker compose up -d
--   2. Run this whole file (it only makes the tiny tables, your answers are commented out):
--        docker compose exec -T db psql -U practice practice < ../../practice/03-grouping-and-aggregation.sql
--      Or open psql (docker compose exec db psql -U practice practice) and paste the SETUP part.
--   3. Write each answer under its TODO, run it in psql, and compare with "Expected".
--
-- The tiny tables are made fresh every time you run the SETUP, so the expected
-- results are exact. Task 6 uses the big seed tables, so only the plan SHAPE is given.
-- Solutions are hidden in the lesson, in section 9 "One possible answer". Try first.

-- ---------------------------------------------------------------------------
-- SETUP (same rows as in the lesson and the stepper)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS l03_points;
DROP TABLE IF EXISTS l03_orders;
DROP TABLE IF EXISTS l03_stores;

CREATE TABLE l03_stores (
  id   int PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE l03_orders (
  id       int PRIMARY KEY,
  store_id int NOT NULL REFERENCES l03_stores(id),
  status   text NOT NULL,      -- PAID | PENDING | CANCELLED
  total    int NOT NULL,       -- a small plain number to keep the sums easy
  coupon   text                -- NULL means no coupon was used
);

CREATE TABLE l03_points (
  id       int PRIMARY KEY,
  store_id int NOT NULL REFERENCES l03_stores(id),
  amount   int NOT NULL
);

INSERT INTO l03_stores VALUES
  (1, 'Ana',   'Jakarta'),
  (2, 'Budi',  'Jakarta'),
  (3, 'Citra', 'Bandung'),
  (4, 'Dewi',  'Medan');        -- Dewi has no orders and no points

INSERT INTO l03_orders VALUES
  (1, 1, 'PAID',      100, 'NEW10'),
  (2, 1, 'PAID',       50, NULL),
  (3, 2, 'PENDING',    70, NULL),
  (4, 1, 'CANCELLED',  30, 'NEW10'),
  (5, 3, 'PAID',      200, 'VIP'),
  (6, 2, 'PAID',       40, NULL),
  (7, 1, 'PAID',       20, NULL),
  (8, 2, 'PAID',       30, 'NEW10');

INSERT INTO l03_points VALUES
  (1, 1, 10),
  (2, 1, 20),
  (3, 2, 5),
  (4, 3, 50);

ANALYZE l03_stores, l03_orders, l03_points;

-- ---------------------------------------------------------------------------
-- TASK 1. How many orders are there for each status?
--   Show status and the count. Sort by status, A to Z.
--
-- Expected:
--    status   | orders
--  -----------+--------
--   CANCELLED |      1
--   PAID      |      6
--   PENDING   |      1
--  (3 rows)
-- ---------------------------------------------------------------------------
-- TODO



-- ---------------------------------------------------------------------------
-- TASK 2. Revenue per city, counting PAID orders only. Biggest revenue first.
--   You need l03_stores (for city) joined to l03_orders.
--
-- Expected:
--   city    | revenue
--  ---------+---------
--   Jakarta |     240
--   Bandung |     200
--  (2 rows)
-- ---------------------------------------------------------------------------
-- TODO



-- ---------------------------------------------------------------------------
-- TASK 3. Which stores have 3 or more orders (any status)?
--   Show store_id and the number of orders. Sort by store_id.
--   Think first: is "3 or more" a rule about one row, or about a bucket?
--
-- Expected:
--   store_id | orders
--  ----------+--------
--          1 |      4
--          2 |      3
--  (2 rows)
-- ---------------------------------------------------------------------------
-- TODO



-- ---------------------------------------------------------------------------
-- TASK 4. One row per store, with the number of PAID, PENDING and CANCELLED orders.
--   Use FILTER. Read the table only once.
--   Dewi has no orders, but she must still show up, with zeros.
--   Sort by store id.
--
-- Expected:
--   name  | paid | pending | cancelled
--  -------+------+---------+-----------
--   Ana   |    3 |       0 |         1
--   Budi  |    2 |       1 |         0
--   Citra |    1 |       0 |         0
--   Dewi  |    0 |       0 |         0
--  (4 rows)
-- ---------------------------------------------------------------------------
-- TODO



-- ---------------------------------------------------------------------------
-- TASK 5. Fix the double count.
--   This query gives Ana 400 and 120. The true answers are 200 and 30.
--
--     SELECT s.name, SUM(o.total) AS order_total, SUM(p.amount) AS points
--     FROM l03_stores s
--     JOIN l03_orders o ON o.store_id = s.id
--     JOIN l03_points p ON p.store_id = s.id
--     GROUP BY s.id, s.name
--     ORDER BY s.id;
--
--   Write a version that adds up each table first, then joins.
--   Every store must show up. Show 0 instead of NULL. Sort by store id.
--
-- Expected:
--   name  | order_total | points
--  -------+-------------+--------
--   Ana   |         200 |     30
--   Budi  |         140 |      5
--   Citra |         200 |     50
--   Dewi  |           0 |      0
--  (4 rows)
-- ---------------------------------------------------------------------------
-- TODO



-- ---------------------------------------------------------------------------
-- TASK 6. Find WHERE and HAVING inside a real plan (big seed tables).
--   Run this on the seeded "orders" table:
--
--     EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
--     SELECT store_id, COUNT(*) AS paid_orders, SUM(total_cents) AS revenue
--     FROM orders
--     WHERE status = 'PAID'
--     GROUP BY store_id
--     HAVING SUM(total_cents) >= 100000000;
--
--   Then answer: which plan line holds the WHERE rule, and which holds the HAVING rule?
--
-- Expected SHAPE (your numbers will differ, the seed is random):
--   HashAggregate                          <- makes the buckets
--     Group Key: store_id
--     Filter: (sum(total_cents) >= ...)    <- this is HAVING, on buckets
--     Rows Removed by Filter: 129          <- buckets thrown away (yours may be 100 to 150)
--     ->  Seq Scan on orders               <- reads every row
--           Filter: (status = 'PAID'::text)   <- this is WHERE, on rows
--           Rows Removed by Filter: 57017  <- rows thrown away (yours will be near 57,000)
--   Postgres 16 (the Docker playground) shows "actual rows=771" without ".00".
--   Postgres 18 also prints "Buffers" lines. Ignore them for this task.
-- ---------------------------------------------------------------------------
-- TODO (write your two answers as comments)


