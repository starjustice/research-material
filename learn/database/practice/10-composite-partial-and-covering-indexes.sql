-- Practice for lesson 10: composite, partial and covering indexes
-- Lesson: learn/database/10-composite-partial-and-covering-indexes.md
--
-- How to run it (Docker playground, PostgreSQL 16):
--   cd learn/database/examples/postgres-practice
--   docker compose up -d
--   docker compose cp ../../practice/10-composite-partial-and-covering-indexes.sql db:/tmp/l10.sql
--   docker compose exec db psql -U practice practice -f /tmp/l10.sql
-- Or open psql (docker compose exec db psql -U practice practice) and paste the file
-- one task at a time. That is the best way: write your answer under each TODO, run it,
-- and compare with the "Expected" comment.
--
-- The answers are hidden in the lesson, in section 9 C, "One possible answer".
--
-- Why "SET enable_seqscan = off"? These tables are tiny (one page each).
-- For a tiny table Postgres reads the whole table, because that is cheaper
-- than using any index (lesson section 7). Switching sequential scans off
-- for practice lets you SEE which index Postgres would pick. Never do this
-- in a real app. Task 5 switches it back on.
--
-- On Postgres 16 the plans print "rows=3" instead of "rows=3.00" and have
-- no "Index Searches" line. The plan shapes are the same.

-- ---------------------------------------------------------------------------
-- Setup: two tiny tables with fixed rows (the same 13 orders as the lesson)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS l10_orders;
DROP TABLE IF EXISTS l10_stores;

CREATE TABLE l10_orders (
  id          int PRIMARY KEY,
  store_id    int  NOT NULL,
  status      text NOT NULL,
  total_cents int  NOT NULL,
  created_at  date NOT NULL
);
INSERT INTO l10_orders VALUES
  (1, 7, 'PAID', 5000, '2026-10-01'),
  (2, 9, 'PENDING', 1200, '2026-10-01'),
  (3, 7, 'PENDING', 800, '2026-10-03'),
  (4, 8, 'PAID', 2500, '2026-10-03'),
  (5, 9, 'PAID', 4000, '2026-10-04'),
  (6, 7, 'SHIPPED', 3000, '2026-10-05'),
  (7, 8, 'PENDING', 1500, '2026-10-06'),
  (8, 7, 'PAID', 900, '2026-10-07'),
  (9, 9, 'CANCELLED', 700, '2026-10-08'),
  (10, 7, 'PAID', 6000, '2026-10-09'),
  (11, 8, 'PAID', 2000, '2026-10-10'),
  (12, 7, 'PENDING', 1100, '2026-10-11'),
  (13, 7, 'PAID', 3500, '2026-10-12');

CREATE TABLE l10_stores (
  id   int PRIMARY KEY,
  name text NOT NULL
);
INSERT INTO l10_stores VALUES
  (1, 'Kopi Kita'), (2, 'Toko Maju'), (3, 'Warung Sari'), (4, 'Kopi Senja'), (5, 'Apotek Sehat');

-- Two indexes that already exist, used in task 4:
CREATE INDEX l10_stores_name_idx ON l10_stores (name);
CREATE INDEX l10_orders_created_idx ON l10_orders (created_at);
ANALYZE l10_orders;
ANALYZE l10_stores;

SET enable_seqscan = off;

-- ---------------------------------------------------------------------------
-- Task 1. Pick the column order
-- ---------------------------------------------------------------------------
-- The admin screen runs this query all day:
--
--   SELECT id, created_at FROM l10_orders
--   WHERE store_id = 7 AND created_at >= '2026-10-05'
--   ORDER BY created_at;
--
-- TODO: create ONE index named l10_task1_idx with two columns, in the order
-- that lets Postgres jump to store 7 and then read the dates in order.
-- Rule: equality column first, then the range or sort column.
--
-- Then run the query, and run this check:
--   SELECT pg_get_indexdef('l10_task1_idx'::regclass);
--
-- Expected query result (5 rows):
--   id | created_at
--    6 | 2026-10-05
--    8 | 2026-10-07
--   10 | 2026-10-09
--   12 | 2026-10-11
--   13 | 2026-10-12
-- Expected check result:
--   CREATE INDEX l10_task1_idx ON public.l10_orders USING btree (store_id, created_at)
-- Expected plan shape (put EXPLAIN in front of the query):
--   Index Scan using l10_task1_idx on l10_orders
--     Index Cond: ((store_id = 7) AND (created_at >= '2026-10-05'::date))
--   and NO Sort node.



-- ---------------------------------------------------------------------------
-- Task 2. Index only the hot slice (a partial index)
-- ---------------------------------------------------------------------------
-- A worker asks every few seconds for the two oldest PENDING orders:
--
--   SELECT id, created_at FROM l10_orders
--   WHERE status = 'PENDING'
--   ORDER BY created_at
--   LIMIT 2;
--
-- TODO: create an index named l10_task2_idx on created_at that holds ONLY
-- the PENDING rows. Then run the query and this check:
--   SELECT pg_get_expr(indpred, indrelid) FROM pg_index
--   WHERE indexrelid = 'l10_task2_idx'::regclass;
--
-- Expected query result:
--   id | created_at
--    2 | 2026-10-01
--    3 | 2026-10-03
-- Expected check result:
--   (status = 'PENDING'::text)
-- Expected plan shape:
--   Limit
--     ->  Index Scan using l10_task2_idx on l10_orders
--   with no Index Cond line and NO Sort node.



-- ---------------------------------------------------------------------------
-- Task 3. Answer from the index alone (an index-only scan)
-- ---------------------------------------------------------------------------
--   SELECT created_at, total_cents FROM l10_orders
--   WHERE store_id = 9
--   ORDER BY created_at DESC;
--
-- TODO: create an index named l10_task3_idx so Postgres never visits the
-- table for this query. Hint: the total is not used to search, only to return.
-- Then run   VACUUM l10_orders;   (it marks the table pages as clean),
-- then EXPLAIN (ANALYZE, COSTS OFF) the query.
--
-- Expected query result:
--   created_at | total_cents
--   2026-10-08 |         700
--   2026-10-04 |        4000
--   2026-10-01 |        1200
-- Expected plan shape:
--   Index Only Scan using l10_task3_idx on l10_orders
--     Index Cond: (store_id = 9)
--     Heap Fetches: 0



-- ---------------------------------------------------------------------------
-- Task 4. Find why an index is not used
-- ---------------------------------------------------------------------------
-- Each query below has an index that looks right, but EXPLAIN shows
-- "Disabled: true" on a Seq Scan (Postgres 18) or a Seq Scan anyway
-- (Postgres 16), because no index can serve it.
--
-- 4a. There is an index on name. Run EXPLAIN on:
--       SELECT id, name FROM l10_stores WHERE lower(name) = 'kopi kita';
--     TODO: add an index named l10_task4_idx so this exact query can use it.
--     Do not change the query.
--     Expected result:   1 | Kopi Kita
--     Expected plan:     Index Scan using l10_task4_idx on l10_stores
--
-- 4b. There is an index on created_at. Run EXPLAIN on:
--       SELECT id, store_id FROM l10_orders WHERE created_at::text = '2026-10-03';
--     TODO: rewrite the WHERE (keep the same meaning) so Postgres can use
--     l10_orders_created_idx. Do not add an index.
--     Expected result (ORDER BY id):   3 | 7   and   4 | 8
--     Expected plan:     Index Scan using l10_orders_created_idx on l10_orders
--
-- 4c. TODO: write in a comment why NO normal index can help this query:
--       SELECT id, name FROM l10_stores WHERE name LIKE '%Kita';
--     Expected result:   1 | Kopi Kita
--     Expected answer:   one sentence, compare it with the lesson.



-- ---------------------------------------------------------------------------
-- Task 5. The index Postgres ignores on purpose
-- ---------------------------------------------------------------------------
RESET enable_seqscan;
-- TODO: run EXPLAIN on your query from 4a again, now with seq scans allowed.
-- Expected plan shape:
--   Seq Scan on l10_stores
--     Filter: (lower(name) = 'kopi kita'::text)
-- TODO: write in a comment why Postgres skips your good index here.



-- Clean up when you are done (optional):
-- DROP TABLE l10_orders; DROP TABLE l10_stores;
