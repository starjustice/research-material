-- Practice for lesson 02: Joins
-- Lesson: learn/database/02-joins.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/02-joins.sql
--   (-T lets psql read the file from your computer. The file is not inside the container.)
--   Option 2, open psql and paste this whole file in.
--     docker compose exec db psql -U practice practice
--
-- Tip: in psql, type \pset null NULL first. Then empty cells show the word NULL,
-- the same as the expected results below.
--
-- How to work
--   1. Run the setup part once. It makes two tiny tables with fixed rows.
--   2. For each task, write your query under the TODO line and run it.
--   3. Compare with the expected result. Row order matters only when the task says ORDER BY.
--   The answers are in the lesson, in section 9C, inside "One possible answer".
--   Try first. Draw the two tables on paper if you get stuck.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l02_practice_orders;
DROP TABLE IF EXISTS l02_practice_stores;

CREATE TABLE l02_practice_stores (
  id          int PRIMARY KEY,
  name        text NOT NULL,
  referred_by int               -- the id of the store that brought this store in
);

-- No foreign key on purpose, so one order can point to a store that does not exist.
CREATE TABLE l02_practice_orders (
  id          int PRIMARY KEY,
  store_id    int,
  status      text NOT NULL,
  total_cents int NOT NULL
);

INSERT INTO l02_practice_stores (id, name, referred_by) VALUES
  (1, 'Ana Mart',    NULL),
  (2, 'Budi Shop',   1),
  (3, 'Citra Store', 1),
  (4, 'Dewi Mart',   2),
  (5, 'Eka Shop',    NULL);

INSERT INTO l02_practice_orders (id, store_id, status, total_cents) VALUES
  (101, 1, 'PAID',      50000),
  (102, 1, 'PAID',      20000),
  (103, 2, 'PENDING',   30000),
  (104, 4, 'CANCELLED', 10000),
  (105, 4, 'PAID',      40000),
  (106, 9, 'PAID',      15000);   -- store 9 does not exist

-- Before you start, guess: which stores have no orders? Which order has no store?


-- ---------------------------------------------------------------------------
-- Task 1. Every order with its store name (only pairs that match)
-- ---------------------------------------------------------------------------
-- Show the store name, the order id and the status.
-- Orders without a real store must NOT appear. Stores without orders must NOT appear.
-- ORDER BY the order id.
--
-- Expected result (5 rows):
--    name      | order_id | status
--    Ana Mart  | 101      | PAID
--    Ana Mart  | 102      | PAID
--    Budi Shop | 103      | PENDING
--    Dewi Mart | 104      | CANCELLED
--    Dewi Mart | 105      | PAID
--
-- TODO: write your query below this line



-- ---------------------------------------------------------------------------
-- Task 2. Stores that have no orders at all
-- ---------------------------------------------------------------------------
-- Show only the store name. ORDER BY the store id.
-- Hint: keep every store, then keep only the rows where the order side is empty.
--
-- Expected result (2 rows):
--    name
--    Citra Store
--    Eka Shop
--
-- TODO: write your query below this line



-- ---------------------------------------------------------------------------
-- Task 3. Every store with its PAID orders (fix the trap)
-- ---------------------------------------------------------------------------
-- A teammate wrote this. It should list ALL 5 stores, but it lists only 2 stores.
--
--   SELECT s.name, o.id AS order_id
--   FROM l02_practice_stores s
--   LEFT JOIN l02_practice_orders o ON o.store_id = s.id
--   WHERE o.status = 'PAID'
--   ORDER BY s.id, o.id;
--
-- Fix it so every store appears. A store with no PAID order shows NULL.
--
-- Expected result (6 rows):
--    name        | order_id
--    Ana Mart    | 101
--    Ana Mart    | 102
--    Budi Shop   | NULL
--    Citra Store | NULL
--    Dewi Mart   | 105
--    Eka Shop    | NULL
--
-- TODO: write your query below this line



-- ---------------------------------------------------------------------------
-- Task 4. How many stores have at least one order? (one row becomes many)
-- ---------------------------------------------------------------------------
-- This query gives 5. That is wrong. Ana Mart and Dewi Mart are counted twice.
--
--   SELECT count(*)
--   FROM l02_practice_stores s
--   JOIN l02_practice_orders o ON o.store_id = s.id;
--
-- Change it so it counts each store once.
--
-- Expected result (1 row):
--    stores_with_orders
--    3
--
-- TODO: write your query below this line



-- ---------------------------------------------------------------------------
-- Task 5. Find the broken data on BOTH sides in one query
-- ---------------------------------------------------------------------------
-- Show stores without orders AND orders without a store, in one result.
-- Columns: the store name and the order id. ORDER BY the store id, then the order id.
-- Hint: keep every row from both tables, then keep only the rows with an empty side.
--
-- Expected result (3 rows):
--    name        | order_id
--    Citra Store | NULL
--    Eka Shop    | NULL
--    NULL        | 106
--
-- TODO: write your query below this line



-- ---------------------------------------------------------------------------
-- Task 6. Who brought each store in? (a table joined to itself)
-- ---------------------------------------------------------------------------
-- referred_by holds the id of another store in the SAME table.
-- Show every store and the NAME of the store that referred it.
-- Stores that nobody referred must still appear, with NULL. ORDER BY the store id.
-- Hint: use the stores table twice, with two short names, for example s and r.
--
-- Expected result (5 rows):
--    name        | referred_by_name
--    Ana Mart    | NULL
--    Budi Shop   | Ana Mart
--    Citra Store | Ana Mart
--    Dewi Mart   | Budi Shop
--    Eka Shop    | NULL
--
-- TODO: write your query below this line



-- ---------------------------------------------------------------------------
-- Bonus (big seed tables, no exact numbers): stores 901 to 1000 have no orders.
-- ---------------------------------------------------------------------------
-- Run these two in the Docker playground and compare the numbers.
--
--   SELECT count(*) FROM stores s JOIN orders o ON o.store_id = s.id;
--   SELECT count(*) FROM stores s LEFT JOIN orders o ON o.store_id = s.id;
--
-- Expected: the first gives 100000. The second gives 100100.
-- Why exactly 100 more? Say it out loud before you check the lesson.
