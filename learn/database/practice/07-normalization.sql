-- Lesson 07 practice: normalization
-- Split one messy table into clean tables, then ask the same questions of both.
--
-- How to run:
--   Docker playground: from learn/database/examples/postgres-practice/ run
--     docker compose exec -T db psql -U practice practice < ../../practice/07-normalization.sql
--   (-T lets psql read the file from your computer.)
--   Or open psql with: docker compose exec db psql -U practice practice
--   and paste the file in, one task at a time.
--   No Docker: paste it into the PGlite REPL at https://pglite.dev/repl/ (real Postgres in the browser).
--
-- Work top to bottom. Write your SQL under each TODO. Check your result against "Expected".
-- A check query gives an error until you finish the task above it. That is normal.
-- The answers are in lesson 07, section 9 C, inside "One possible answer". Try first.
-- Every table here starts with l07_ so it never touches the practice tables.

-- ---------------------------------------------------------------------------
-- Setup: start clean every time you run the file
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l07_order_lines, l07_orders, l07_products, l07_stores, l07_flat;

-- The messy table: one row per product in an order.
-- The store name and city are repeated on every row of that store.
CREATE TABLE l07_flat (
  order_id         int  NOT NULL,
  order_date       date NOT NULL,
  store_name       text NOT NULL,
  store_city       text NOT NULL,
  product_name     text NOT NULL,
  unit_price_cents int  NOT NULL,   -- the price the store paid on that day
  qty              int  NOT NULL,
  PRIMARY KEY (order_id, product_name)
);

INSERT INTO l07_flat VALUES
  (101, '2026-09-01', 'Toko Maju', 'Jakarta', 'Kopi', 10000, 2),
  (101, '2026-09-01', 'Toko Maju', 'Jakarta', 'Teh',   8000, 1),
  (102, '2026-09-03', 'Toko Sari', 'Bandung', 'Kopi', 10000, 5),
  (103, '2026-09-05', 'Toko Maju', 'Jakarta', 'Gula', 15000, 3),
  (104, '2026-09-07', 'Toko Jaya', 'Medan',   'Teh',   9000, 4);

-- ---------------------------------------------------------------------------
-- Task 1: spot the duplicate
-- ---------------------------------------------------------------------------
-- 1a. For each store, show how many rows repeat its city.
--     Columns: store_name, store_city, rows. Order by store_name.
-- TODO

-- Expected:
--  store_name | store_city | rows
--  Toko Jaya  | Medan      | 1
--  Toko Maju  | Jakarta    | 3
--  Toko Sari  | Bandung    | 1

-- 1b. For each product, show every different price it has.
--     Columns: product_name, unit_price_cents. Order by both.
-- TODO

-- Expected:
--  product_name | unit_price_cents
--  Gula         | 15000
--  Kopi         | 10000
--  Teh          | 8000
--  Teh          | 9000
--
-- Question (answer in a comment): Teh has two prices. Is that a duplicate bug?

-- ---------------------------------------------------------------------------
-- Task 2: split the messy table into four clean tables
-- ---------------------------------------------------------------------------
-- Create these tables. Decide the types, keys and NOT NULLs yourself.
--   l07_stores      (id serial, name, city)            name is unique
--   l07_products    (id serial, name)                  name is unique
--   l07_orders      (id int, store_id, order_date)     store_id points at l07_stores
--   l07_order_lines (order_id, product_id, qty, unit_price_cents)
--                   the key is (order_id, product_id), both point at their tables
-- Then fill them from l07_flat with INSERT ... SELECT DISTINCT.
-- Hint: fill stores and products first. Orders need a store id. Lines need both ids.
-- TODO

-- Check 2a: run this. Expected: 3 | 3 | 4 | 5
SELECT (SELECT count(*) FROM l07_stores)      AS stores,
       (SELECT count(*) FROM l07_products)    AS products,
       (SELECT count(*) FROM l07_orders)      AS orders,
       (SELECT count(*) FROM l07_order_lines) AS lines;

-- Check 2b: join the clean tables back together and compare with the messy one.
-- Expected: 0 rows (nothing was lost and nothing was invented).
SELECT o.id, o.order_date, s.name, s.city, p.name, l.unit_price_cents, l.qty
FROM l07_order_lines l
JOIN l07_orders   o ON o.id = l.order_id
JOIN l07_stores   s ON s.id = o.store_id
JOIN l07_products p ON p.id = l.product_id
EXCEPT
SELECT order_id, order_date, store_name, store_city, product_name, unit_price_cents, qty
FROM l07_flat;

-- ---------------------------------------------------------------------------
-- Task 3: the same question on both designs
-- ---------------------------------------------------------------------------
-- How much did each store spend? (sum of qty * unit_price_cents)
-- 3a. Answer it from l07_flat.        Columns: store_name, spent_cents. Order by store_name.
-- TODO

-- 3b. Answer it from the clean tables. Columns: name, spent_cents. Order by name.
-- TODO

-- Expected for both:
--  Toko Jaya | 36000
--  Toko Maju | 73000
--  Toko Sari | 50000

-- ---------------------------------------------------------------------------
-- Task 4: the update problem
-- ---------------------------------------------------------------------------
-- Toko Maju moves to Surabaya.
-- 4a. Change the city in l07_flat.   Expected: UPDATE 3 (three rows had to change)
-- TODO

-- 4b. Change the city in l07_stores. Expected: UPDATE 1 (one fact, one row)
-- TODO

-- ---------------------------------------------------------------------------
-- Task 5: the insert problem
-- ---------------------------------------------------------------------------
-- A new store, Toko Baru in Semarang, joins today. It has no orders yet.
-- 5a. Add it to the clean tables.   Expected: INSERT 0 1
-- TODO

-- 5b. List every store with its number of orders, zero included.
--     Columns: name, order_count. Order by name.
-- TODO

-- Expected:
--  Toko Baru | 0
--  Toko Jaya | 1
--  Toko Maju | 2
--  Toko Sari | 1
--
-- Question (answer in a comment): why can l07_flat not hold Toko Baru?

-- ---------------------------------------------------------------------------
-- Task 6: copy on purpose, and the cost
-- ---------------------------------------------------------------------------
-- The store list page shows "number of orders" for every store, all day long.
-- You decide to save that number on the store row.
-- 6a. Add a column order_count int NOT NULL DEFAULT 0 to l07_stores.
--     Then fill it with ONE UPDATE that counts rows in l07_orders.
--     Expected: ALTER TABLE, then UPDATE 4 (every store, Toko Baru gets 0)
-- TODO

-- 6b. Write a check query: stores where the saved order_count is not the real count.
--     Columns: name, saved, real.
--     Expected now: 0 rows
-- TODO

-- 6c. Someone adds an order and forgets the saved count. Run this line as it is:
INSERT INTO l07_orders VALUES (105, (SELECT id FROM l07_stores WHERE name = 'Toko Sari'), '2026-09-09');
-- Now run your check query from 6b again.
-- Expected:
--  name      | saved | real
--  Toko Sari | 1     | 2
--
-- Question (answer in a comment): name two ways to stop this from happening.
