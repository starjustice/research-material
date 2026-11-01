-- Practice for lesson 19: Zero-downtime migrations
-- Lesson: learn/database/19-zero-downtime-migrations.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. Do not run it with "psql -f":
--   some tasks have statements that must fail, and you want to read each result.
--   Option 2, any Postgres. Use a test database.
--
-- Tip: in psql, type \pset null NULL and \timing on first.
--
-- How to work
--   For each task, first write your guess under "My guess". Then write your SQL under the TODO
--   line and run it. Compare with the "Expected" comments.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3. The table here has 200,000 rows, ten times smaller than the
-- 2 million rows in the lesson, so the times are about ten times smaller too. The SHAPE is what counts.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l19_orders, l19_stores CASCADE;

CREATE TABLE l19_stores (id int PRIMARY KEY, name text);
INSERT INTO l19_stores SELECT g, 'store ' || g FROM generate_series(1, 1000) g;

CREATE TABLE l19_orders (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id   int NOT NULL,
  qty        int NOT NULL,
  name       varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO l19_orders (store_id, qty, name)
SELECT (g % 1000) + 1, (g % 5) + 1, 'order ' || g FROM generate_series(1, 200000) g;
ANALYZE l19_orders;

-- ---------------------------------------------------------------------------
-- Task 1. Which ALTER TABLE rewrites the whole table?
-- ---------------------------------------------------------------------------
-- A rewrite gives the table a NEW file. You can see it: pg_relation_filenode() changes.
-- For each of the four changes below, run:
--     SELECT pg_relation_filenode('l19_orders') AS before \gset
--     <the ALTER TABLE>
--     SELECT pg_relation_filenode('l19_orders') = :before AS same_file;
--   (a) ALTER TABLE l19_orders ADD COLUMN status text NOT NULL DEFAULT 'new';
--   (b) ALTER TABLE l19_orders ADD COLUMN token double precision DEFAULT random();
--   (c) ALTER TABLE l19_orders ALTER COLUMN name TYPE varchar(300);
--   (d) ALTER TABLE l19_orders ALTER COLUMN qty TYPE bigint;
-- My guess: which of (a) to (d) show same_file = f (a rewrite)?
-- Expected: (a) t, (b) f, (c) t, (d) f.
--   (a) a constant default is stored in the catalog, no row is touched (Postgres 11 and later).
--   (b) random() is different for every row, so every row must be written.
--   (c) widening a varchar needs no change in the rows.
--   (d) int and bigint have different sizes, so every row is rewritten.
--   With 200,000 rows (b) and (d) take about 0.3 to 0.5 seconds. With 2 million, 4 seconds.

-- ---------------------------------------------------------------------------
-- Task 2. Write it yourself: NOT NULL without a long lock
-- ---------------------------------------------------------------------------
-- The column name allows NULL, and no row has NULL in it. Make it NOT NULL in three steps:
--   1. add a CHECK (name IS NOT NULL) rule named l19_name_nn that does NOT check the old rows,
--   2. check the old rows (this uses a weaker lock),
--   3. SET NOT NULL, then drop the CHECK rule.
-- Run step 2 inside BEGIN ... ROLLBACK, and look at the lock mode in between:
--     SELECT mode FROM pg_locks
--     WHERE relation = 'l19_orders'::regclass AND pid = pg_backend_pid() AND locktype = 'relation';
--
-- TODO 2: write the statements
--
-- CHECK 2
-- Expected lock during step 2: ShareUpdateExclusiveLock (reads AND writes go on).
--   Compare: run  BEGIN; ALTER TABLE l19_orders ALTER COLUMN name SET NOT NULL;  on a column that
--   has no CHECK rule yet, and look at the locks: AccessExclusiveLock (everything waits). ROLLBACK.
--   Step 3 takes a fraction of a millisecond, because Postgres trusts the validated CHECK rule.

-- ---------------------------------------------------------------------------
-- Task 3. Write it yourself: a foreign key without a long lock
-- ---------------------------------------------------------------------------
-- Add a foreign key from l19_orders.store_id to l19_stores.id, in two steps, so that the
-- long part (checking all rows) does not block writes.
--
-- TODO 3: write the two statements
--
-- CHECK 3
--   After step 1 (instant):  SELECT convalidated FROM pg_constraint WHERE conname = '<your name>';  Expected: f
--   After step 2:            Expected: t
--   Lock during step 2 (run it in BEGIN ... ROLLBACK like task 2): ShareUpdateExclusiveLock on l19_orders.

-- ---------------------------------------------------------------------------
-- Task 4. Write it yourself: an index on a live table
-- ---------------------------------------------------------------------------
-- Create an index on l19_orders (store_id) so that INSERT, UPDATE and DELETE do not wait for it.
--
-- TODO 4: write the statement
--
-- CHECK 4a: run it inside BEGIN ... ROLLBACK.
-- Expected: ERROR:  CREATE INDEX CONCURRENTLY cannot run inside a transaction block
--
-- CHECK 4b: make a build fail and find the broken index.
--   CREATE TABLE l19_dups AS SELECT g AS id, g % 10 AS v FROM generate_series(1, 1000) g;
--   CREATE UNIQUE INDEX CONCURRENTLY l19_dups_v ON l19_dups (v);
--   Expected: ERROR:  could not create unique index "l19_dups_v"  (duplicates in v)
--   The index is still there, but INVALID. Write a query that lists every invalid index:
--
-- TODO 4b: write the query (hint: pg_index, column indisvalid)
--
--   Expected: one row, l19_dups_v. Then drop it:  DROP INDEX l19_dups_v;  DROP TABLE l19_dups;

-- ---------------------------------------------------------------------------
-- Task 5. Write it yourself: fill a new column in batches
-- ---------------------------------------------------------------------------
-- Add a column title (text, no default, so it is instant). Then copy name into it, in batches of
-- 10,000 rows, with a COMMIT after each batch, so that no batch holds locks for long.
-- Hint: a DO block can COMMIT inside a loop (Postgres 11 and later), but only outside BEGIN.
--
-- TODO 5: write the ALTER TABLE and the DO block
--
-- CHECK 5
--   SELECT count(*) AS missing FROM l19_orders WHERE title IS NULL;     Expected: 0
--   Try it inside BEGIN: Expected: ERROR:  invalid transaction termination

-- ---------------------------------------------------------------------------
-- Task 6 (optional, two windows). A migration that gives up politely
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   A: SELECT count(*) FROM l19_orders WHERE id < 10;        (leave the transaction open)
--   B: SET lock_timeout = '200ms';
--   B: ALTER TABLE l19_orders ADD COLUMN l19_extra int;
-- My guess: how long does B wait?
-- Expected: B waits 200 ms, then ERROR:  canceling statement due to lock timeout.
--   In window C, a plain SELECT on l19_orders does not wait more than 200 ms.
--   A: COMMIT;
--   B: run the ALTER TABLE again: it works at once.
--
-- Clean up afterwards:
--   DROP TABLE l19_orders, l19_stores;
