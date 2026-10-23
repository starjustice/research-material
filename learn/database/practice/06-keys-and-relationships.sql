-- Practice for lesson 06: Keys and relationships
-- Lesson: learn/database/06-keys-and-relationships.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec -T db psql -U practice practice < ../../practice/06-keys-and-relationships.sql
--   (-T lets psql read the file from your computer. The file is not inside the container.)
--   Option 2, open psql and paste this file in, one task at a time.
--     docker compose exec db psql -U practice practice
--
-- Tip: in psql, type \pset null NULL first. Then empty cells show the word NULL,
-- the same as the expected results below.
--
-- How to work
--   This is a design practice. YOU write the CREATE TABLE lines.
--   1. Run the setup part once. It makes one small products table.
--   2. For each task, write your SQL under the TODO line.
--   3. Then run the CHECK lines under it. Some of them SHOULD fail.
--      Compare what Postgres prints with the "Expected" comments.
--      If an insert that should fail is accepted, a key is missing in your design.
--   Error texts show the main words only. Your constraint names may differ.
--   The answers are in the lesson, in section 9C, inside "One possible answer".
--   Draw the tables and the arrows on paper first.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l06_practice_order_items CASCADE;
DROP TABLE IF EXISTS l06_practice_store_settings CASCADE;
DROP TABLE IF EXISTS l06_practice_orders CASCADE;
DROP TABLE IF EXISTS l06_practice_stores CASCADE;
DROP TABLE IF EXISTS l06_practice_products CASCADE;

CREATE TABLE l06_practice_products (
  id   int PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO l06_practice_products (id, name) VALUES
  (1, 'Rice 5kg'),
  (2, 'Cooking oil'),
  (3, 'Sugar');

-- ---------------------------------------------------------------------------
-- Task 1. Stores and orders (one to many)
-- ---------------------------------------------------------------------------
-- Make two tables.
--   l06_practice_stores: columns id and name.
--     Postgres must make the id itself (1, 2, 3, ...).
--     Nobody may type their own id. Use an identity column, not serial.
--     name must not be empty.
--   l06_practice_orders: columns id (int), store_id (int), total_cents (int).
--     id is the primary key. You type it yourself.
--     store_id must point to a real store and must never be empty.
--     Deleting a store that still has orders must FAIL.

-- TODO 1: write the two CREATE TABLE statements here


-- CHECK 1 (run after your TODO)
INSERT INTO l06_practice_stores (name) VALUES ('Ana Mart'), ('Budi Shop');
-- Expected: INSERT 0 2. Ana Mart gets id 1, Budi Shop gets id 2.

INSERT INTO l06_practice_stores (id, name) VALUES (7, 'Typed id');
-- Expected: ERROR: cannot insert a non-DEFAULT value into column "id"

INSERT INTO l06_practice_orders (id, store_id, total_cents) VALUES
  (101, 1, 50000),
  (102, 1, 20000),
  (103, 2, 30000);
-- Expected: INSERT 0 3

INSERT INTO l06_practice_orders (id, store_id, total_cents) VALUES (104, 9, 1000);
-- Expected: ERROR: ... violates foreign key constraint ...
--           DETAIL: Key (store_id)=(9) is not present in table "l06_practice_stores".

INSERT INTO l06_practice_orders (id, store_id, total_cents) VALUES (105, NULL, 1000);
-- Expected: ERROR: null value in column "store_id" ... violates not-null constraint

INSERT INTO l06_practice_orders (id, store_id, total_cents) VALUES (101, 2, 1000);
-- Expected: ERROR: duplicate key value violates unique constraint ...
--           DETAIL: Key (id)=(101) already exists.

DELETE FROM l06_practice_stores WHERE id = 2;
-- Expected: ERROR: update or delete on table "l06_practice_stores" violates ... foreign key constraint ...
--           DETAIL: Key (id)=(2) is ... referenced from table "l06_practice_orders".

SELECT id, store_id, total_cents FROM l06_practice_orders ORDER BY id;
-- Expected:
--  id  | store_id | total_cents
-- -----+----------+-------------
--  101 |        1 |       50000
--  102 |        1 |       20000
--  103 |        2 |       30000
-- (3 rows)

-- ---------------------------------------------------------------------------
-- Task 2. Orders and products (many to many)
-- ---------------------------------------------------------------------------
-- One order has many products. One product is in many orders.
-- Make the middle table l06_practice_order_items with columns
-- order_id (int), product_id (int), qty (int, not empty).
--   The same product may appear only ONCE in one order.
--   Deleting an order must also delete its lines.
--   Deleting a product that is used in an order must FAIL.

-- TODO 2: write the CREATE TABLE statement here


-- CHECK 2
INSERT INTO l06_practice_order_items (order_id, product_id, qty) VALUES
  (101, 1, 2),
  (101, 2, 1),
  (103, 1, 5);
-- Expected: INSERT 0 3

INSERT INTO l06_practice_order_items (order_id, product_id, qty) VALUES (101, 1, 9);
-- Expected: ERROR: duplicate key value violates unique constraint ...
--           DETAIL: Key (order_id, product_id)=(101, 1) already exists.

INSERT INTO l06_practice_order_items (order_id, product_id, qty) VALUES (102, 99, 1);
-- Expected: ERROR: ... violates foreign key constraint ...
--           DETAIL: Key (product_id)=(99) is not present in table "l06_practice_products".

DELETE FROM l06_practice_products WHERE id = 2;
-- Expected: ERROR: update or delete on table "l06_practice_products" violates ... foreign key constraint ...
--           DETAIL: Key (id)=(2) is ... referenced from table "l06_practice_order_items".

DELETE FROM l06_practice_orders WHERE id = 101;
-- Expected: DELETE 1   (and its two lines are gone too)

SELECT order_id, product_id, qty FROM l06_practice_order_items ORDER BY order_id, product_id;
-- Expected:
--  order_id | product_id | qty
-- ----------+------------+-----
--       103 |          1 |   5
-- (1 row)

-- ---------------------------------------------------------------------------
-- Task 3. Store settings (one to one)
-- ---------------------------------------------------------------------------
-- Each store has at most ONE settings row with a bank_account (text, not empty).
-- Make l06_practice_store_settings with columns store_id and bank_account.
--   store_id must point to a real store.
--   A store must not get two settings rows.
--   Deleting a store must also delete its settings row.

-- TODO 3: write the CREATE TABLE statement here


-- CHECK 3
INSERT INTO l06_practice_store_settings (store_id, bank_account) VALUES (1, 'BCA 111');
-- Expected: INSERT 0 1

INSERT INTO l06_practice_store_settings (store_id, bank_account) VALUES (1, 'BNI 222');
-- Expected: ERROR: duplicate key value violates unique constraint ...
--           DETAIL: Key (store_id)=(1) already exists.

INSERT INTO l06_practice_store_settings (store_id, bank_account) VALUES (9, 'BRI 333');
-- Expected: ERROR: ... violates foreign key constraint ...
--           DETAIL: Key (store_id)=(9) is not present in table "l06_practice_stores".

INSERT INTO l06_practice_stores (name) VALUES ('Citra Store');
-- Expected: INSERT 0 1. Citra Store gets id 3.

INSERT INTO l06_practice_store_settings (store_id, bank_account) VALUES (3, 'Mandiri 444');
-- Expected: INSERT 0 1

DELETE FROM l06_practice_stores WHERE id = 3;
-- Expected: DELETE 1   (Citra has no orders, so the delete is allowed)

SELECT store_id, bank_account FROM l06_practice_store_settings ORDER BY store_id;
-- Expected:
--  store_id | bank_account
-- ----------+--------------
--         1 | BCA 111
-- (1 row)

-- ---------------------------------------------------------------------------
-- Task 4. Who brought this store in (SET NULL)
-- ---------------------------------------------------------------------------
-- Add a column referred_by to l06_practice_stores.
--   It points to another store in the SAME table.
--   It may be empty (some stores came in alone).
--   When the referring store is deleted, the column becomes empty.
--   The store that was referred must NOT be deleted.

-- TODO 4: write the ALTER TABLE statement here


-- CHECK 4
INSERT INTO l06_practice_stores (name, referred_by) VALUES ('Dewi Mart', 1);
-- Expected: INSERT 0 1. Dewi Mart gets id 4 (id 3 is used up, Postgres never gives it again).

INSERT INTO l06_practice_stores (name, referred_by) VALUES ('Eka Shop', 4);
-- Expected: INSERT 0 1. Eka Shop gets id 5.

INSERT INTO l06_practice_stores (name, referred_by) VALUES ('Fajar Shop', 42);
-- Expected: ERROR: ... violates foreign key constraint ...
--           DETAIL: Key (referred_by)=(42) is not present in table "l06_practice_stores".

DELETE FROM l06_practice_stores WHERE id = 4;
-- Expected: DELETE 1

SELECT id, name, referred_by FROM l06_practice_stores ORDER BY id;
-- Expected:
--  id |   name    | referred_by
-- ----+-----------+-------------
--   1 | Ana Mart  |        NULL
--   2 | Budi Shop |        NULL
--   5 | Eka Shop  |        NULL
-- (3 rows)

-- ---------------------------------------------------------------------------
-- Task 5. The missing indexes
-- ---------------------------------------------------------------------------
-- Postgres does NOT make an index for a foreign key column.
-- This CHECK lists every foreign key in your practice tables, and says
-- whether some index starts with that column.

-- CHECK 5a (run it BEFORE your TODO)
SELECT c.conrelid::regclass::text AS table_name,
       a.attname                  AS fk_column,
       EXISTS (SELECT 1 FROM pg_index i
               WHERE i.indrelid = c.conrelid
                 AND i.indkey[0] = c.conkey[1]) AS has_index
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'f'
  AND c.conrelid::regclass::text LIKE 'l06_practice%'
ORDER BY 1, 2;
-- Expected (if you used a primary key in tasks 2 and 3, as the lesson does):
--          table_name          |  fk_column  | has_index
-- -----------------------------+-------------+-----------
--  l06_practice_order_items    | order_id    | t
--  l06_practice_order_items    | product_id  | f
--  l06_practice_orders         | store_id    | f
--  l06_practice_store_settings | store_id    | t
--  l06_practice_stores         | referred_by | f
-- (5 rows)
-- Before you go on, say out loud: why does order_id say t, but product_id says f?

-- TODO 5: create the missing indexes, so every row above says t


-- CHECK 5b: run the CHECK 5a query again.
-- Expected: the same 5 rows, and every has_index is t.

-- ---------------------------------------------------------------------------
-- Task 6 (optional). Feel the missing index on the big seed tables
-- ---------------------------------------------------------------------------
-- The seed tables have 100,000 orders and 200,000 point transactions.
-- orders.store_id and point_transactions.store_id have NO index.
-- Store 950 has no orders. Run this. BEGIN and ROLLBACK undo the delete.
--
--   BEGIN;
--   EXPLAIN (ANALYZE, COSTS OFF) DELETE FROM stores WHERE id = 950;
--   ROLLBACK;
--
-- Look at the two lines that start with "Trigger for constraint".
-- That is the time Postgres spent checking orders and point_transactions.
--
-- TODO 6: create an index on orders (store_id) and on point_transactions (store_id).
-- Then run the same BEGIN / EXPLAIN / ROLLBACK again.
--
-- Expected shape (your numbers will differ):
--   before: each Trigger line takes several milliseconds or more, because
--           Postgres reads every row of the other table
--   after:  each Trigger line takes well under 1 millisecond
--
-- Clean up afterwards, so other exercises start from the same place:
--   DROP INDEX IF EXISTS <your index names>;
