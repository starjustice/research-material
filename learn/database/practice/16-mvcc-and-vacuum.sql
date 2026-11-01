-- Practice for lesson 16: MVCC and VACUUM
-- Lesson: learn/database/16-mvcc-and-vacuum.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. Do not run it with "psql -f":
--   you want to read each result before you go on.
--   Option 2, any Postgres. Use a test database. Task 5 needs a second psql window.
--
-- Tip: in psql, type \pset null NULL first.
--
-- How to work
--   For each task, first write your guess under "My guess". Then run it and compare.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3.
--   * Numbers like transaction ids (xmin) and sizes can differ on your machine. The SHAPE is what counts.
--   * The setup needs two extensions that ship with Postgres (the Docker image has them):
--     pageinspect (look inside a page) and pgstattuple (count dead rows exactly).

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE EXTENSION IF NOT EXISTS pgstattuple;

DROP TABLE IF EXISTS l16_demo, l16_big CASCADE;

-- Autovacuum is switched off for these two tables, so nothing cleans them behind your back.
CREATE TABLE l16_demo (id int PRIMARY KEY, name text) WITH (autovacuum_enabled = off);
INSERT INTO l16_demo VALUES (1, 'Ana'), (2, 'Budi');

-- ---------------------------------------------------------------------------
-- Task 1. A row has a new address after an UPDATE
-- ---------------------------------------------------------------------------
-- Run this, then the UPDATE, then run the SELECT again.
--
--   SELECT ctid, xmin, xmax, * FROM l16_demo ORDER BY id;
--   UPDATE l16_demo SET name = 'Ana B' WHERE id = 1;
--   SELECT ctid, xmin, xmax, * FROM l16_demo ORDER BY id;
--
-- My guess: what changes for Ana's row? What does not change for Budi's row?
-- Expected shape (your xmin numbers will differ):
--   before:  Ana  (0,1)  xmin 1057   |  Budi (0,2)  xmin 1057
--   after:   Ana  (0,3)  xmin 1059   |  Budi (0,2)  xmin 1057
--   Ana's row got a NEW ctid (a new address) and a NEW xmin. Budi's row did not move.

-- ---------------------------------------------------------------------------
-- Task 2. The old version is still on the page
-- ---------------------------------------------------------------------------
--   SELECT lp, t_xmin, t_xmax, t_ctid
--   FROM heap_page_items(get_raw_page('l16_demo', 0));
--
-- My guess: how many row versions are on the page? Which one has t_xmax set?
-- Expected: 3 lines. The old version of Ana (lp 1) has t_xmax set (the id of the UPDATE)
--   and its t_ctid points at the new version (0,3). Budi (lp 2) and the new Ana (lp 3) have t_xmax = 0.
--
-- Now delete Budi, and look again:
--   DELETE FROM l16_demo WHERE id = 2;
--   (run the heap_page_items query again)
-- Expected: Budi's version (lp 2) now has t_xmax set too. The row is not gone. It is marked.
--
-- Then clean up and look a third time:
--   VACUUM l16_demo;
--   (run the heap_page_items query again)
-- Expected: lp 1 and lp 2 no longer hold a row (t_xmin and t_xmax are NULL). lp 3 is the only row.

-- ---------------------------------------------------------------------------
-- Task 3. The table that doubled
-- ---------------------------------------------------------------------------
CREATE TABLE l16_big (id int PRIMARY KEY, note text, n int) WITH (autovacuum_enabled = off);
INSERT INTO l16_big SELECT g, 'row ' || g, 0 FROM generate_series(1, 100000) g;

-- Use this query after every step. It counts live and dead rows exactly.
--   SELECT pg_size_pretty(pg_relation_size('l16_big')) AS table_size,
--          tuple_count AS live, dead_tuple_count AS dead,
--          round(free_space / 1024.0 / 1024, 1) AS free_mb
--   FROM pgstattuple('l16_big');
--
-- Steps (run the query after each one):
--   a) nothing yet
--   b) UPDATE l16_big SET n = n + 1;
--   c) UPDATE l16_big SET n = n + 1;
--   d) VACUUM l16_big;
--   e) UPDATE l16_big SET n = n + 1;
--   f) VACUUM FULL l16_big;
--
-- My guess: what is the table size after each step?
-- Expected (sizes can differ by a few percent):
--   a)  5088 kB   live 100000  dead 0       free 0.0
--   b) 10176 kB   live 100000  dead 100000  free 0.0
--   c)    15 MB   live 100000  dead 100000  free 4.6
--   d)    15 MB   live 100000  dead 0       free 9.9      <- VACUUM does NOT shrink the file
--   e)    15 MB   live 100000  dead 100000  free 5.0      <- but the free space is reused
--   f)  5088 kB   live 100000  dead 0       free 0.0      <- VACUUM FULL rewrites the table

-- ---------------------------------------------------------------------------
-- Task 4. Write it yourself: a dead row monitor
-- ---------------------------------------------------------------------------
-- Redo steps a) and b) of task 3 on a fresh l16_big (or run: UPDATE l16_big SET n = n + 1;).
-- Then, in ONE query on pg_stat_user_tables, show for the table l16_big:
--   relname, n_live_tup, n_dead_tup, the percent of dead rows (dead_pct, one decimal), last_autovacuum.
-- The counters are written in batches. Run SELECT pg_stat_force_next_flush(); first.
--
-- TODO 4: write the query here
--
-- CHECK 4
-- Expected:
--  relname | n_live_tup | n_dead_tup | dead_pct | last_autovacuum
-- ---------+------------+------------+----------+-----------------
--  l16_big |     100000 |     100000 |     50.0 | NULL
-- (1 row)

-- ---------------------------------------------------------------------------
-- Task 5. Write it yourself: the long transaction that stops the cleanup
-- ---------------------------------------------------------------------------
-- You need two windows, A and B. Start from a fresh l16_big with 100000 rows and no dead rows
-- (VACUUM FULL l16_big; works).
--   A: BEGIN ISOLATION LEVEL REPEATABLE READ;
--   A: SELECT count(*) FROM l16_big;
--   B: UPDATE l16_big SET n = n + 1;
--   B: VACUUM (VERBOSE) l16_big;
-- My guess: how many dead rows does VACUUM remove? Look for the line that starts with "tuples:".
-- Expected: "tuples: 0 removed, 200000 remain, 100000 are dead but not yet removable"
--   (A still might need the old versions.)
--   B: SELECT pid, state, backend_xmin FROM pg_stat_activity WHERE state = 'idle in transaction';
-- Expected: A's session, state "idle in transaction", with a backend_xmin (it holds the cleanup back).
--   A: COMMIT;
--   B: VACUUM (VERBOSE) l16_big;
-- Expected: "tuples: 100000 removed, 100000 remain, 0 are dead but not yet removable"
--
-- TODO 5: write the query that finds the sessions that keep old rows alive. It lists the sessions
--         that have a backend_xmin or a backend_xid, the oldest first (use age(...)).
--
-- CHECK 5: while A is still open, your query lists A first (state 'idle in transaction').

-- ---------------------------------------------------------------------------
-- Task 6. A table that needs more cleaning than the others
-- ---------------------------------------------------------------------------
-- By default, autovacuum cleans a table when its dead rows pass
--   50 + 0.2 * (number of rows).
-- For 100000 rows that is 20050 dead rows. Make it clean this table at 1% instead, and show the setting.
--
-- TODO 6: write the ALTER TABLE, then a SELECT on pg_class that shows reloptions.
--
-- CHECK 6
-- Expected:  {autovacuum_enabled=off,autovacuum_vacuum_scale_factor=0.01}
--   (autovacuum_enabled=off comes from the setup of task 3. Switch it on: ALTER TABLE l16_big SET (autovacuum_enabled = on);)
-- Then undo it:  ALTER TABLE l16_big RESET (autovacuum_vacuum_scale_factor);
--
-- Clean up afterwards:
--   DROP TABLE l16_demo, l16_big;
