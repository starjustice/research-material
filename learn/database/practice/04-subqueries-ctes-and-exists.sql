-- Practice for lesson 04: Subqueries, CTEs and EXISTS
-- Lesson: learn/database/04-subqueries-ctes-and-exists.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/04-subqueries-ctes-and-exists.sql
--   (-T lets psql read the file from your computer. The file is not inside the container.)
--   Option 2, open psql and paste this whole file in.
--     docker compose exec db psql -U practice practice
--
-- Tip: in psql, type \pset null NULL first. Then empty cells show the word NULL.
--
-- How to work
--   1. Run the setup part once. It makes three tiny tables with fixed rows.
--   2. For each task, write your query under the TODO line and run it.
--   3. Compare with the expected result. Row order matters only when the task says ORDER BY.
--   The answers are in the lesson, in section 9C, inside "One possible answer".
--   Try first. Draw the stores and their orders on paper if you get stuck.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l04_blocked;
DROP TABLE IF EXISTS l04_orders;
DROP TABLE IF EXISTS l04_stores;

CREATE TABLE l04_stores (
  id          int PRIMARY KEY,
  name        text NOT NULL,
  city        text NOT NULL,
  referred_by int               -- the id of the store that brought this store in
);

CREATE TABLE l04_orders (
  id       int PRIMARY KEY,
  store_id int NOT NULL,
  status   text NOT NULL,
  total    int NOT NULL
);

-- A list of blocked stores, loaded from a spreadsheet. One line was empty.
CREATE TABLE l04_blocked (
  store_id int
);

INSERT INTO l04_stores (id, name, city, referred_by) VALUES
  (1, 'Toko Maju',  'Jakarta', NULL),
  (2, 'Toko Jaya',  'Bandung', 1),
  (3, 'Toko Sinar', 'Jakarta', 1),
  (4, 'Toko Baru',  'Medan',   3),
  (5, 'Toko Indah', 'Bandung', 3),
  (6, 'Toko Lama',  'Medan',   NULL);

INSERT INTO l04_orders (id, store_id, status, total) VALUES
  (1, 1, 'PAID',      120),
  (2, 1, 'PAID',       80),
  (3, 2, 'PENDING',    50),
  (4, 3, 'PAID',      300),
  (5, 3, 'CANCELLED',  40),
  (6, 4, 'PAID',       60),
  (7, 4, 'PAID',       30),
  (8, 5, 'CANCELLED',  90);

INSERT INTO l04_blocked (store_id) VALUES (2), (NULL);   -- the NULL is the empty line

-- Before you start, guess: which store has no orders at all?


-- ---------------------------------------------------------------------------
-- Task 1. A subquery that returns one value, and one that returns a list
-- ---------------------------------------------------------------------------
-- 1a. Show the id and total of every order whose total is above the average total.
--     Use a subquery for the average. Do not type the number yourself.
--     ORDER BY id.
--
-- Expected result (2 rows):
--    id | total
--    1  | 120
--    4  | 300
--
-- (The average is 770 / 8 = 96.25.)

-- TODO 1a


-- 1b. Show the names of stores that have at least one CANCELLED order.
--     Use IN with a subquery. ORDER BY the store id.
--
-- Expected result (2 rows):
--    name
--    Toko Sinar
--    Toko Indah

-- TODO 1b


-- ---------------------------------------------------------------------------
-- Task 2. A correlated subquery: one count per store
-- ---------------------------------------------------------------------------
-- Show every store name and its number of PAID orders, as a column called paid_orders.
-- Use a subquery in the SELECT list that uses the outer store id.
-- Stores with no PAID orders must show 0. ORDER BY the store id.
--
-- Expected result (6 rows):
--    name       | paid_orders
--    Toko Maju  | 2
--    Toko Jaya  | 0
--    Toko Sinar | 1
--    Toko Baru  | 2
--    Toko Indah | 0
--    Toko Lama  | 0
--
-- Then answer in a comment: how many times did the inner query run?

-- TODO 2


-- ---------------------------------------------------------------------------
-- Task 3. "Has one" and "has none"
-- ---------------------------------------------------------------------------
-- 3a. Stores that have at least one PAID order with a total of 100 or more.
--     Use EXISTS. ORDER BY the store id.
--
-- Expected result (2 rows):
--    name
--    Toko Maju
--    Toko Sinar

-- TODO 3a


-- 3b. Stores with no orders at all. Use NOT EXISTS. ORDER BY the store id.
--
-- Expected result (1 row):
--    name
--    Toko Lama

-- TODO 3b


-- ---------------------------------------------------------------------------
-- Task 4. The NOT IN trap
-- ---------------------------------------------------------------------------
-- A teammate wrote this to list every store that is NOT blocked.
-- Run it first.

SELECT name FROM l04_stores
WHERE id NOT IN (SELECT store_id FROM l04_blocked)
ORDER BY id;

-- It returns (0 rows). Only Toko Jaya is blocked, so 5 stores should appear.
--
-- 4a. In a comment, say why it returns 0 rows. Use the word "unknown".
-- 4b. Rewrite it with NOT EXISTS. ORDER BY the store id.
--
-- Expected result (5 rows):
--    name
--    Toko Maju
--    Toko Sinar
--    Toko Baru
--    Toko Indah
--    Toko Lama

-- TODO 4a (a comment)

-- TODO 4b


-- ---------------------------------------------------------------------------
-- Task 5. A CTE in two named steps
-- ---------------------------------------------------------------------------
-- Write one query with WITH and two steps:
--   step "paid": the sum of PAID order totals per store_id, as paid_total
--   step "big":  only the rows of "paid" where paid_total is 100 or more
-- Then join "big" to l04_stores to show the name and paid_total. ORDER BY the store id.
--
-- Expected result (2 rows):
--    name       | paid_total
--    Toko Maju  | 200
--    Toko Sinar | 300
--
-- (Toko Baru has 60 + 30 = 90 PAID, so it is not big.)

-- TODO 5


-- ---------------------------------------------------------------------------
-- Task 6. See the loops on the big practice tables (plan shape, not exact numbers)
-- ---------------------------------------------------------------------------
-- This task uses the seed tables stores and orders, not the l04_ tables.
-- Write a query that shows every store in Bandung with its number of orders,
-- using a correlated subquery in the SELECT list. Put this in front of it:
--   EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
--
-- Expected shape:
--    Seq Scan on stores s (actual rows=200 loops=1)
--      Filter: (city = 'Bandung'::text)
--      Rows Removed by Filter: 800
--      SubPlan 1
--        ->  Aggregate (actual rows=1 loops=200)
--              ->  Seq Scan on orders o (actual rows=about 100 loops=200)
--                    Filter: (store_id = s.id)
--                    Rows Removed by Filter: about 99900
--
-- The rows=about 100 and Rows Removed numbers change with the random seed.
-- loops=200 does not change: there are exactly 200 stores in Bandung.
-- On Postgres 18 you also see "Buffers:" lines and numbers like 200.00.
--
-- Answer in a comment: what does loops=200 tell you? About how many order rows
-- did Postgres read in total?

-- TODO 6


-- ---------------------------------------------------------------------------
-- Bonus. A recursive CTE (from the Go deeper box in the lesson)
-- ---------------------------------------------------------------------------
-- List every store that Toko Maju (id 1) brought in, directly or through another store.
-- Show the name and the depth: 1 for stores Toko Maju brought in itself,
-- 2 for stores those stores brought in. ORDER BY depth, then id.
--
-- Expected result (4 rows):
--    name       | depth
--    Toko Jaya  | 1
--    Toko Sinar | 1
--    Toko Baru  | 2
--    Toko Indah | 2

-- TODO bonus
