-- Lesson 22: Partitioning and sharding. One table split into 12 drawers (one per month), on your own Postgres.
-- Lesson: learn/database/22-partitioning-and-sharding.md
--
-- Run it in a scratch database, not in a database you care about:
--   createdb l22_practice
--   psql -d l22_practice -f practice/22-partitioning.sql
-- It makes tables whose names start with l22_ and 1.2 million rows. Takes about 10 seconds.
-- The numbers in the "Expected" comments came from PostgreSQL 18.3 on one laptop. Your times will differ. The shape will not.
--
-- Before you run it, write down your guesses:
--   1. A query for one month. How many drawers does Postgres open?
--   2. A query for one user (no date in WHERE). How many drawers does it open?
--   3. Remove one month of data. DELETE on the plain table, or DETACH and DROP on the partitioned table. Which is faster?
--   4. What error do you get for a PRIMARY KEY (id) on the partitioned table?
--   5. What error do you get for a row dated in a month that has no drawer?

SET max_parallel_workers_per_gather = 0;

DROP TABLE IF EXISTS l22_plain, l22_events CASCADE;

-- The plain table: one big table.
CREATE TABLE l22_plain (
  id bigint GENERATED ALWAYS AS IDENTITY, user_id int NOT NULL, created_at timestamptz NOT NULL, payload text);

-- The partitioned table: still one table to your queries, but stored in drawers.
CREATE TABLE l22_events (
  id bigint GENERATED ALWAYS AS IDENTITY, user_id int NOT NULL, created_at timestamptz NOT NULL, payload text
) PARTITION BY RANGE (created_at);

DO $$ BEGIN
  FOR m IN 1..12 LOOP
    EXECUTE format('CREATE TABLE l22_events_2026_%s PARTITION OF l22_events FOR VALUES FROM (%L) TO (%L)',
      lpad(m::text, 2, '0'), make_date(2026, m, 1), make_date(2026, m, 1) + interval '1 month');
  END LOOP;
END $$;

INSERT INTO l22_plain (user_id, created_at, payload)
SELECT (random() * 10000)::int, timestamptz '2026-01-01' + (g % 365) * interval '1 day' + (g % 86400) * interval '1 second', md5(g::text)
FROM generate_series(1, 1200000) g;
INSERT INTO l22_events (user_id, created_at, payload) SELECT user_id, created_at, payload FROM l22_plain;

CREATE INDEX ON l22_plain (created_at);
CREATE INDEX ON l22_events (created_at);
CREATE INDEX ON l22_plain (user_id);
CREATE INDEX ON l22_events (user_id);
ANALYZE l22_plain;
ANALYZE l22_events;

-- Part 1. Which drawer holds each row?
SELECT tableoid::regclass AS drawer, count(*) FROM l22_events GROUP BY 1 ORDER BY 1;
-- Expected: 12 drawers, l22_events_2026_01 to _12, each with 92,064 to 101,928 rows (1,200,000 in all).

-- Part 2. One month. Count the "Scan on" lines.
EXPLAIN (ANALYZE, COSTS OFF) SELECT count(*) FROM l22_events WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01';
-- Expected: ONE scan, on l22_events_2026_03. The other 11 drawers are not in the plan at all (pruned).
-- Same query on l22_plain: Bitmap Index Scan on the one big index.
-- My medians of 9 runs: plain 18.1 ms, partitioned 10.8 ms.

-- Part 3. One user, no date in WHERE. Postgres cannot know which drawer.
EXPLAIN (ANALYZE, COSTS OFF) SELECT count(*) FROM l22_events WHERE user_id = 77;
-- Expected: 12 index scans (one per drawer), 24 "Scan on" lines with the heap scans. Planning Time is bigger.
-- My medians of 9 runs: plain 0.18 ms (planning 0.24 ms), partitioned 0.44 ms (planning 1.71 ms).

-- Part 4. Remove one month of data.
\timing on
DELETE FROM l22_plain WHERE created_at < '2026-02-01';
-- Expected: DELETE 101927. It took 80 ms on one run and 480 ms on another (it varies a lot). The file does NOT get smaller (107 MB).
ALTER TABLE l22_events DETACH PARTITION l22_events_2026_01;
DROP TABLE l22_events_2026_01;
-- Expected: about 2 to 4 ms for each, on both runs. The space is given back at once.
\timing off
SELECT pg_stat_force_next_flush();
SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'l22_plain';
-- Expected: n_dead_tup is about 101,927 (the deleted rows wait for VACUUM). The partitioned table has no dead rows from this.

-- Part 5. Three mistakes. Each one gives an error.
ALTER TABLE l22_events ADD PRIMARY KEY (id);
-- Expected: ERROR  unique constraint on partitioned table must include all partitioning columns
--           DETAIL PRIMARY KEY constraint on table "l22_events" lacks column "created_at" which is part of the partition key.
INSERT INTO l22_events (user_id, created_at, payload) VALUES (1, '2027-03-05', 'x');
-- Expected: ERROR  no partition of relation "l22_events" found for row
CREATE UNIQUE INDEX ON l22_events (payload);
-- Expected: the same "must include all partitioning columns" error.

-- The fixes.
ALTER TABLE l22_events ADD PRIMARY KEY (id, created_at);            -- the key now includes the partition column. Works.
CREATE TABLE l22_events_other PARTITION OF l22_events DEFAULT;      -- a drawer for everything that has no drawer
INSERT INTO l22_events (user_id, created_at, payload) VALUES (1, '2027-03-05', 'x');
SELECT tableoid::regclass, count(*) FROM l22_events WHERE created_at >= '2027-01-01' GROUP BY 1;
-- Expected: l22_events_other | 1

-- Part 6. Hash and list partitions.
DROP TABLE IF EXISTS l22_h CASCADE;
CREATE TABLE l22_h (id bigint, user_id int NOT NULL, payload text) PARTITION BY HASH (user_id);
CREATE TABLE l22_h_0 PARTITION OF l22_h FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE l22_h_1 PARTITION OF l22_h FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE l22_h_2 PARTITION OF l22_h FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE l22_h_3 PARTITION OF l22_h FOR VALUES WITH (MODULUS 4, REMAINDER 3);
INSERT INTO l22_h SELECT g, (random() * 100000)::int, 'x' FROM generate_series(1, 400000) g;
SELECT tableoid::regclass AS part, count(*) FROM l22_h GROUP BY 1 ORDER BY 1;
-- Expected: four drawers with about 100,000 rows each (mine: 100547, 99942, 99829, 99682).
EXPLAIN (COSTS OFF) SELECT * FROM l22_h WHERE user_id = 42;
-- Expected: one scan, on one drawer (mine: l22_h_2).

-- Clean up when you are done:
-- DROP TABLE l22_plain, l22_events, l22_h CASCADE;
