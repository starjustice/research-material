-- Practice for lesson 12: N+1 queries and ORMs
-- Lesson: learn/database/12-n-plus-1-queries-and-orms.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/12-n-plus-1-queries-and-orms.sql
--   (-T lets psql read the file from your computer. The file is not inside the container.)
--   Option 2, open psql and paste this whole file in.
--     docker compose exec db psql -U practice practice
--
-- Tip: in psql, type \pset null NULL first. Then empty cells show the word NULL,
-- the same as the expected results below.
--
-- How to work
--   1. Run the setup part once. It makes three tiny tables with fixed rows.
--   2. For each task, write your query under the TODO line and run it.
--   3. Compare with the expected result.
--   The answers are in the lesson, in section 9C, inside "One possible answer".
--   Try first.
--
-- There is also a JavaScript part: learn/database/practice/12-n-plus-1-dataloader.js

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l12_points;
DROP TABLE IF EXISTS l12_orders;
DROP TABLE IF EXISTS l12_stores;

CREATE TABLE l12_stores (
  id   int PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE l12_orders (
  id          int PRIMARY KEY,
  store_id    int NOT NULL REFERENCES l12_stores(id),
  total_cents int NOT NULL
);

CREATE TABLE l12_points (
  id       int PRIMARY KEY,
  store_id int NOT NULL REFERENCES l12_stores(id),
  amount   int NOT NULL
);

INSERT INTO l12_stores VALUES
  (1, 'Alpha',   'Jakarta'),
  (2, 'Bravo',   'Bandung'),
  (3, 'Cempaka', 'Medan'),
  (4, 'Delta',   'Surabaya'),
  (5, 'Elang',   'Jakarta');     -- Elang has no orders

INSERT INTO l12_orders VALUES
  (1, 1, 500), (2, 1, 700), (3, 2, 300), (4, 1, 200),
  (5, 3, 900), (6, 2, 400), (7, 4, 1000), (8, 3, 100);

INSERT INTO l12_points VALUES
  (1, 1, 10), (2, 1, 20), (3, 2, 5);

-- ---------------------------------------------------------------------------
-- Task 1. Count the trips.
-- An app shows a page with all 5 stores and their orders. It does this:
--   stores = SELECT id, name FROM l12_stores ORDER BY id;
--   for each store: SELECT id, total_cents FROM l12_orders WHERE store_id = <that id>;
-- a) How many queries does this page send? Write your number here: ___
-- b) Write the query the loop sends for store 3, sorted by id.
-- TODO
--
-- Expected for b):
--  id | total_cents
-- ----+-------------
--   5 |         900
--   8 |         100
-- (2 rows)
-- (The answer for a) is in the lesson.)

-- ---------------------------------------------------------------------------
-- Task 2. One batch with IN.
-- Get the orders of all 5 stores in ONE query. Use IN with the 5 store ids.
-- Show id, store_id, total_cents. Sort by store_id, then id.
-- TODO
--
-- Expected:
--  id | store_id | total_cents
-- ----+----------+-------------
--   1 |        1 |         500
--   2 |        1 |         700
--   4 |        1 |         200
--   3 |        2 |         300
--   6 |        2 |         400
--   5 |        3 |         900
--   8 |        3 |         100
--   7 |        4 |        1000
-- (8 rows)
-- Question: store 5 is not in the result. What must your app code do for store 5?

-- ---------------------------------------------------------------------------
-- Task 3. The same batch with = ANY.
-- Write the same query, but use  store_id = ANY(ARRAY[...])  instead of IN.
-- (In app code you send the whole list as ONE parameter: = ANY($1).)
-- TODO
--
-- Expected: exactly the same 8 rows as task 2.

-- ---------------------------------------------------------------------------
-- Task 4. One JOIN.
-- Get every store with its orders in ONE query. Stores without orders must stay.
-- Show store_id, name, order_id, total_cents. Sort by store id, then order id.
-- TODO
--
-- Expected:
--  store_id |  name   | order_id | total_cents
-- ----------+---------+----------+-------------
--         1 | Alpha   |        1 |         500
--         1 | Alpha   |        2 |         700
--         1 | Alpha   |        4 |         200
--         2 | Bravo   |        3 |         300
--         2 | Bravo   |        6 |         400
--         3 | Cempaka |        5 |         900
--         3 | Cempaka |        8 |         100
--         4 | Delta   |        7 |        1000
--         5 | Elang   |     NULL |        NULL
-- (9 rows)
-- Notice: the store name comes back once per order. Alpha comes back 3 times.

-- ---------------------------------------------------------------------------
-- Task 5. One row per store, orders packed as a list (the shape Prisma "join" and Hasura use).
-- Show id, name, and a column "orders" that holds a JSON list of {id, total_cents},
-- sorted by order id. A store with no orders gets []. Sort by store id.
-- Hint: jsonb_agg, jsonb_build_object, COALESCE, and LEFT JOIN LATERAL or GROUP BY.
-- TODO
--
-- Expected:
--  id |  name   | orders
-- ----+---------+------------------------------------------------------------------------------------------------
--   1 | Alpha   | [{"id": 1, "total_cents": 500}, {"id": 2, "total_cents": 700}, {"id": 4, "total_cents": 200}]
--   2 | Bravo   | [{"id": 3, "total_cents": 300}, {"id": 6, "total_cents": 400}]
--   3 | Cempaka | [{"id": 5, "total_cents": 900}, {"id": 8, "total_cents": 100}]
--   4 | Delta   | [{"id": 7, "total_cents": 1000}]
--   5 | Elang   | []
-- (5 rows)

-- ---------------------------------------------------------------------------
-- Task 6. The opposite mistake: one join that grows too big.
-- Someone wanted "fewer queries" and wrote this. Run it first:
--
--   SELECT s.id, s.name, COUNT(*) AS rows_after_join, SUM(o.total_cents) AS order_total_wrong
--   FROM l12_stores s
--   JOIN l12_orders o ON o.store_id = s.id
--   LEFT JOIN l12_points p ON p.store_id = s.id
--   GROUP BY s.id, s.name
--   ORDER BY s.id;
--
-- You get:
--  id |  name   | rows_after_join | order_total_wrong
-- ----+---------+-----------------+-------------------
--   1 | Alpha   |               6 |              2800
--   2 | Bravo   |               2 |               700
--   3 | Cempaka |               2 |              1000
--   4 | Delta   |               1 |              1000
-- (4 rows)
--
-- a) Alpha's real order total is 500 + 700 + 200 = 1400. Why does it say 2800?
-- b) Write a query that gives the right order total AND the points total for every store.
--    A store with no orders shows NULL for order_total. A store with no points shows 0.
-- TODO
--
-- Expected for b):
--  id |  name   | order_total | points
-- ----+---------+-------------+--------
--   1 | Alpha   |        1400 |     30
--   2 | Bravo   |         700 |      5
--   3 | Cempaka |        1000 |      0
--   4 | Delta   |        1000 |      0
--   5 | Elang   |        NULL |      0
-- (5 rows)
