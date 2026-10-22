-- Practice for lesson 01: SQL basics and the order a query runs
-- Lesson: learn/database/01-sql-basics-and-query-order.md
--
-- How to run it:
--   1. Start the practice database (learn/database/examples/postgres-practice):
--        docker compose up -d
--   2. Run this whole file once to make the two small tables.
--      From the postgres-practice folder (the file is sent in through stdin,
--      because the container cannot see this folder):
--        docker compose exec -T db psql -U practice practice < ../../practice/01-sql-basics-and-query-order.sql
--      Or, if psql is installed on your machine, from the repo root:
--        psql postgres://practice:practice@localhost:5433/practice -f learn/database/practice/01-sql-basics-and-query-order.sql
--      Or open psql (docker compose exec db psql -U practice practice) and paste this file.
--   3. Write your query under each TODO and run it in psql.
--      Compare your result with the "Expected" comment.
--
-- Do each task before you open the answers in section 9 of the lesson.
-- Before you write a query, say the order Postgres will work in:
-- FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.

-- psql shows NULL as an empty cell. This line makes it print the word NULL.
\pset null NULL

-- ---------------------------------------------------------------------------
-- Setup: two tiny tables with fixed rows, so every answer is exact.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS l01_orders;
DROP TABLE IF EXISTS l01_stores;

CREATE TABLE l01_orders (
  id          int PRIMARY KEY,
  status      text NOT NULL,
  total_cents int NOT NULL,
  coupon      text            -- NULL means: no value here
);
INSERT INTO l01_orders (id, status, total_cents, coupon) VALUES
  (1, 'PAID',      5000,  NULL),
  (2, 'PENDING',   12000, 'NEW10'),
  (3, 'PAID',      8000,  NULL),
  (4, 'CANCELLED', 3000,  'NEW10'),
  (5, 'PAID',      20000, 'VIP'),
  (6, 'PAID',      15000, NULL);

CREATE TABLE l01_stores (
  id    int PRIMARY KEY,
  name  text NOT NULL,
  city  text NOT NULL,
  phone text                  -- NULL means: we do not know the phone number
);
INSERT INTO l01_stores (id, name, city, phone) VALUES
  (1, 'Maju Mart',  'Jakarta', '0811'),
  (2, 'Baru Shop',  'Bandung', NULL),
  (3, 'Jaya Store', 'Jakarta', NULL),
  (4, 'Sinar Mart', 'Medan',   '0812'),
  (5, 'Indah Shop', 'Jakarta', '0813');


-- ---------------------------------------------------------------------------
-- Task 1. SELECT, WHERE, ORDER BY, LIMIT
-- Show the 3 biggest PAID orders: id and total_cents, biggest first.
-- ---------------------------------------------------------------------------
-- TODO: write your query here

-- Expected:
--  id | total_cents
-- ----+-------------
--   5 |       20000
--   6 |       15000
--   3 |        8000
-- (3 rows)


-- ---------------------------------------------------------------------------
-- Task 2. Fix the new-name bug
-- This query fails with: ERROR:  column "total" does not exist
--
--   SELECT id, total_cents / 100 AS total
--   FROM l01_orders
--   WHERE total < 100
--   ORDER BY total;
--
-- Fix it so it runs. Keep the name "total" where it is allowed.
-- Then say in one sentence why WHERE cannot use it.
-- ---------------------------------------------------------------------------
-- TODO: write the fixed query here

-- Expected:
--  id | total
-- ----+-------
--   4 |    30
--   1 |    50
--   3 |    80
-- (3 rows)


-- ---------------------------------------------------------------------------
-- Task 3. Find the empty boxes
-- Show the stores with no phone number: id and name, by id.
-- ---------------------------------------------------------------------------
-- TODO: write your query here

-- Expected:
--  id |    name
-- ----+------------
--   2 | Baru Shop
--   3 | Jaya Store
-- (2 rows)


-- ---------------------------------------------------------------------------
-- Task 4. The NULL trap with <>
-- First run this and count the rows:
--
--   SELECT id, coupon FROM l01_orders WHERE coupon <> 'VIP' ORDER BY id;
--
-- It gives only 2 rows. Orders 1, 3 and 6 have no coupon, so they are
-- "not VIP" too, but they are missing. Change the WHERE so they come back.
-- ---------------------------------------------------------------------------
-- TODO: write the fixed query here

-- Expected:
--  id | coupon
-- ----+--------
--   1 | NULL
--   2 | NEW10
--   3 | NULL
--   4 | NEW10
--   6 | NULL
-- (5 rows)


-- ---------------------------------------------------------------------------
-- Task 5. Where does NULL go when you sort?
-- Show every store: id and phone. Stores with no phone come FIRST.
-- After that, sort by phone from small to big. Use id to break ties.
-- Hint: by default, NULL goes LAST when you sort from small to big.
-- ---------------------------------------------------------------------------
-- TODO: write your query here

-- Expected:
--  id | phone
-- ----+-------
--   2 | NULL
--   3 | NULL
--   1 | 0811
--   4 | 0812
--   5 | 0813
-- (5 rows)


-- ---------------------------------------------------------------------------
-- Task 6 (optional, uses the big seed table). The real plan
-- Run this on the big orders table:
--
--   EXPLAIN (COSTS OFF)
--   SELECT id, store_id, total_cents
--   FROM orders
--   WHERE status = 'PAID'
--   ORDER BY total_cents DESC
--   LIMIT 5;
--
-- Read the plan from the BOTTOM line up. Match each line to a part of
-- the logical order (FROM, WHERE, ORDER BY, LIMIT).
--
-- Expected shape (COSTS OFF hides the numbers, so you only see the shape):
--   Limit
--     ->  Sort
--           Sort Key: total_cents DESC
--           ->  Seq Scan on orders
--                 Filter: (status = 'PAID'::text)
-- ---------------------------------------------------------------------------
-- TODO: write down which line is FROM, which is WHERE, which is ORDER BY,
--       and which is LIMIT.
