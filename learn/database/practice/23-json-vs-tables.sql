-- Lesson 23: SQL vs NoSQL and Redis. The same 200,000 orders as tables and as one JSON document each, on your own Postgres.
-- Lesson: learn/database/23-sql-vs-nosql-and-redis.md
--
-- Run it in a scratch database, not in a database you care about:
--   createdb l23_practice
--   psql -d l23_practice -f practice/23-json-vs-tables.sql
-- It makes tables whose names start with l23_ (200,000 orders, 600,000 items). Takes about 15 seconds.
-- The numbers in the "Expected" comments came from PostgreSQL 18.3 on one laptop. Your times will differ. The shape will not.
--
-- Before you run it, write down your guesses:
--   1. Get one order with its items by id. Tables (a join) or one document. Which is faster, and is it a big difference?
--   2. Total quantity sold for each product, over ALL orders. Tables or documents. How many times slower?
--   3. Count the orders of customer 872. Documents with a GIN index, or the plain table with an index. Which is faster?
--   4. Save a document with the typo "stauts". What happens? And the same typo as a table column value 'PAYD'?

SET max_parallel_workers_per_gather = 0;
DROP TABLE IF EXISTS l23_items, l23_orders, l23_docs CASCADE;

-- Version 1: tables, with rules.
CREATE TABLE l23_orders (
  id int PRIMARY KEY, customer_id int NOT NULL,
  status text NOT NULL CHECK (status IN ('NEW', 'PAID', 'SHIPPED')),
  created_at timestamptz NOT NULL);
CREATE TABLE l23_items (
  id serial PRIMARY KEY, order_id int NOT NULL REFERENCES l23_orders (id),
  product text NOT NULL, qty int NOT NULL, price_cents int NOT NULL);

INSERT INTO l23_orders
SELECT g, (random() * 5000)::int, (ARRAY['NEW', 'PAID', 'SHIPPED'])[1 + g % 3], timestamptz '2026-01-01' + g * interval '1 minute'
FROM generate_series(1, 200000) g;
INSERT INTO l23_items (order_id, product, qty, price_cents)
SELECT o.id, 'product-' || (1 + (o.id * k) % 50), 1 + (o.id + k) % 4, 500 + ((o.id * k) % 50) * 100
FROM l23_orders o, generate_series(1, 3) k;
CREATE INDEX ON l23_items (order_id);
CREATE INDEX ON l23_orders (customer_id);

-- Version 2: one JSON document for each order (what a document database would keep).
CREATE TABLE l23_docs (id int PRIMARY KEY, doc jsonb NOT NULL);
INSERT INTO l23_docs
SELECT o.id, jsonb_build_object('customer_id', o.customer_id, 'status', o.status, 'created_at', o.created_at,
  'items', (SELECT jsonb_agg(jsonb_build_object('product', i.product, 'qty', i.qty, 'price_cents', i.price_cents))
            FROM l23_items i WHERE i.order_id = o.id))
FROM l23_orders o;
CREATE INDEX l23_docs_gin ON l23_docs USING gin (doc jsonb_path_ops);
ANALYZE l23_orders; ANALYZE l23_items; ANALYZE l23_docs;

SELECT doc FROM l23_docs WHERE id = 7;
-- Expected: {"items": [{"qty": 1, "product": "product-8", "price_cents": 1200}, ... 3 items], "status": "PAID", "customer_id": ..., "created_at": ...}

SELECT pg_size_pretty(pg_total_relation_size('l23_orders') + pg_total_relation_size('l23_items')) AS tables,
       pg_size_pretty(pg_relation_size('l23_docs')) AS docs, pg_size_pretty(pg_relation_size('l23_docs_gin')) AS gin_index;
-- Expected (mine): tables 73 MB, docs 78 MB, gin_index 16 MB.

-- Part 1. One order with its items.
EXPLAIN (ANALYZE, COSTS OFF) SELECT o.*, i.* FROM l23_orders o JOIN l23_items i ON i.order_id = o.id WHERE o.id = 777;
EXPLAIN (ANALYZE, COSTS OFF) SELECT doc FROM l23_docs WHERE id = 777;
-- Expected: both far under 1 ms. My medians of 9 runs: tables 0.068 ms, document 0.038 ms. Nearly the same: the document just needs no join.

-- Part 2. A question across ALL orders: total quantity for each product.
EXPLAIN (ANALYZE, COSTS OFF) SELECT product, sum(qty) FROM l23_items GROUP BY 1;
EXPLAIN (ANALYZE, COSTS OFF)
SELECT i ->> 'product', sum((i ->> 'qty')::int) FROM l23_docs, jsonb_array_elements(doc -> 'items') i GROUP BY 1;
-- Expected: the documents are slower. My medians: tables 100 ms, documents 338 ms (3.4 times).

-- Part 3. All orders of one customer.
EXPLAIN (ANALYZE, COSTS OFF) SELECT count(*) FROM l23_orders WHERE customer_id = 872;
EXPLAIN (ANALYZE, COSTS OFF) SELECT count(*) FROM l23_docs WHERE doc @> '{"customer_id": 872}';
-- Expected: both use an index, both well under 1 ms, about the same. My medians of 9 runs: table 0.078 ms, document 0.155 ms.
-- One single run gave 0.151 ms and 0.075 ms (the other way round): at this size it is noise. Do not rank them.

-- Part 4. Rules. A document accepts anything. A table says no.
INSERT INTO l23_docs VALUES (900001, '{"customer_id": 1, "stauts": "PAID", "items": []}');
SELECT id, doc ->> 'status' AS status FROM l23_docs WHERE id = 900001;
-- Expected: the insert works. status is empty (NULL): the typo "stauts" was accepted, and nobody noticed.
INSERT INTO l23_docs VALUES (900002, '{"customer_id": 1, "status": "PAYD", "items": []}');
-- Expected: works too.
INSERT INTO l23_orders VALUES (900003, 1, 'PAYD', now());
-- Expected: ERROR  new row for relation "l23_orders" violates check constraint "l23_orders_status_check"
INSERT INTO l23_items (order_id, product, qty, price_cents) VALUES (999999999, 'p', 1, 100);
-- Expected: ERROR  insert or update on table "l23_items" violates foreign key constraint "l23_items_order_id_fkey"
SELECT count(*) AS docs_with_status_payd FROM l23_docs WHERE doc ->> 'status' = 'PAYD';
-- Expected: 1. The bad value is now in your data. To get the same safety on documents you must write the checks in your app.

-- Clean up when you are done:
-- DROP TABLE l23_items, l23_orders, l23_docs CASCADE;
