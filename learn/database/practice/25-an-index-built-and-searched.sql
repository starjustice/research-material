-- Practice for lesson 25: An index, built and searched
-- Lesson: learn/database/25-an-index-built-and-searched.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. The setup takes a few seconds (1 million rows).
--   Option 2, any Postgres where you may run CREATE EXTENSION (pageinspect needs a superuser).
--   Use a test database only.
--
-- How to work
--   1. Run the setup part once. It makes a tiny table and a table with 1 million rows.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Compare with the expected result. Then answer the question in a comment.
--   The answers are in the lesson, in card 11C, inside "One possible answer".
--
-- About the expected results (checked on PostgreSQL 17.5)
--   * Postgres 18 prints "actual rows=1.00" where 17 prints "actual rows=1", and adds
--     "Index Searches: 1" under index nodes. The shape of the plan is the same.
--   * Ignore the "Planning:" lines. They change from machine to machine.
--   * "Buffers: shared hit=4" can say "read=1 hit=3" if a page was not in memory yet.
--     The total is the same.
--   * Sizes and page counts can differ by a few percent on another build.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE EXTENSION IF NOT EXISTS pg_visibility;

-- Without parallel workers the plans match the lesson. A table this big may show Parallel Seq Scan.
SET max_parallel_workers_per_gather = 0;

DROP TABLE IF EXISTS l25_people;
DROP TABLE IF EXISTS l25_big;
DROP TABLE IF EXISTS l25_split;

-- A tiny table. All 6 rows fit in page 0.
CREATE TABLE l25_people (
  id   int PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
) WITH (autovacuum_enabled = false);

INSERT INTO l25_people (id, name, city) VALUES
  (1, 'Ayu',   'Medan'),
  (2, 'Budi',  'Bali'),
  (3, 'Citra', 'Medan'),
  (4, 'Dewi',  'Jakarta'),
  (5, 'Eko',   'Bali'),
  (6, 'Fajar', 'Medan');

-- A table with 1 million rows. autovacuum_enabled = false keeps the numbers still.
CREATE TABLE l25_big (
  id     int PRIMARY KEY,
  email  text NOT NULL,
  status text NOT NULL,
  note   text NOT NULL
) WITH (autovacuum_enabled = false);

INSERT INTO l25_big (id, email, status, note)
SELECT g,
       'user' || g || '@example.com',
       CASE WHEN g % 10 = 0 THEN 'PENDING' ELSE 'PAID' END,
       'note number ' || g
FROM generate_series(1, 1000000) AS g;

ANALYZE l25_big;

-- ---------------------------------------------------------------------------
-- Task 1. Addresses
-- ---------------------------------------------------------------------------
-- Show ctid, id and name of all people, sorted by id.
-- Expected (6 rows):
--   ctid  | id | name
--   (0,1) |  1 | Ayu
--   (0,2) |  2 | Budi
--   (0,3) |  3 | Citra
--   (0,4) |  4 | Dewi
--   (0,5) |  5 | Eko
--   (0,6) |  6 | Fajar
-- Answer in a comment: which pages hold the people from Medan?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 2. Look inside a leaf
-- ---------------------------------------------------------------------------
-- The primary key index is named l25_people_pkey. Page 1 is its only leaf.
-- Use bt_page_items to show itemoffset and ctid (as points_to), sorted by itemoffset.
-- Expected (6 rows): itemoffset 1 to 6, points_to (0,1) to (0,6).
-- Answer in a comment: does the leaf hold the name 'Citra', or only a key and an address?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 3. How deep is the tree?
-- ---------------------------------------------------------------------------
-- a) Show the level of l25_big_pkey with bt_metap.   Expected: 2
-- b) Show relname and relpages for l25_big and l25_big_pkey (from pg_class), sorted by relname.
--    Expected:
--      relname      | relpages
--      l25_big      |    10301
--      l25_big_pkey |     2745
-- Answer in a comment: why is a tree for 1 million rows only 3 levels?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 4. Count the pages of two lookups
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) on each:
--   a) SELECT * FROM l25_big WHERE id = 777777;
--   b) SELECT * FROM l25_big WHERE email = 'user777777@example.com';
--
-- Expected a):
--   Index Scan using l25_big_pkey on l25_big (actual rows=1 loops=1)
--     Index Cond: (id = 777777)
--     Buffers: shared hit=4
-- Expected b):
--   Seq Scan on l25_big (actual rows=1 loops=1)
--     Filter: (email = 'user777777@example.com'::text)
--     Rows Removed by Filter: 999999
--     Buffers: shared hit=10301
-- Answer in a comment: which 4 pages did a) read?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 5. An index-only scan, before and after VACUUM
-- ---------------------------------------------------------------------------
-- Run EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) on:
--   SELECT id FROM l25_big WHERE id BETWEEN 1000 AND 2000;
-- Expected:
--   Index Only Scan using l25_big_pkey on l25_big (actual rows=1001 loops=1)
--     Index Cond: ((id >= 1000) AND (id <= 2000))
--     Heap Fetches: 1001
--     Buffers: shared hit=16
-- Then run VACUUM l25_big; and the same EXPLAIN. Expected:
--     Heap Fetches: 0
--     Buffers: shared hit=7
-- Answer in a comment: why did the first run visit the table 1001 times?

-- TODO


-- ---------------------------------------------------------------------------
-- Task 6. Build an index on a live table
-- ---------------------------------------------------------------------------
-- a) Make an index on l25_big (email) without blocking writes. Name it l25_big_email.
-- b) Show its size with pg_size_pretty(pg_relation_size(...)).  Expected: about 39 MB
-- c) List any broken index: SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--    Expected: 0 rows
-- d) Run the email lookup from Task 4 b) again. Expected:
--      Index Scan using l25_big_email on l25_big (actual rows=1 loops=1)
--        Index Cond: (email = 'user777777@example.com'::text)
--        Buffers: shared hit=4
--    (The first run can say "hit=3 read=1". Run it twice.)
-- Answer in a comment: what would a plain CREATE INDEX have done to INSERTs meanwhile?

-- TODO
