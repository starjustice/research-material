-- Practice for lesson 17: Pagination
-- Lesson: learn/database/17-pagination.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time.
--   Option 2, any Postgres. Use a test database.
--
-- Tip: in psql, type \pset null NULL first.
--
-- How to work
--   1. Run the setup part once. It makes 200,000 posts and a small table of 95 posts.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Compare with the "Expected" comments. Times depend on your computer. The SHAPE of the plan is what counts.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3 with max_parallel_workers_per_gather = 0.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

SET max_parallel_workers_per_gather = 0;

DROP TABLE IF EXISTS l17_posts, l17_small CASCADE;

-- 200,000 posts. 10 posts share each second, so created_at alone is NOT unique.
CREATE TABLE l17_posts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL,
  title      text NOT NULL
);
INSERT INTO l17_posts (created_at, title)
SELECT timestamptz '2026-01-01 00:00:00+00' + ((g / 10) * interval '1 second'), 'Post ' || g
FROM generate_series(1, 200000) g;
ANALYZE l17_posts;

-- 95 posts, also 10 per second, for the tie-breaker task.
CREATE TABLE l17_small AS
SELECT g AS id, timestamptz '2026-01-01 00:00:00+00' + ((g / 10) * interval '1 second') AS created_at
FROM generate_series(1, 95) g;

-- ---------------------------------------------------------------------------
-- Task 1. Page 1 and page 5000, with no index
-- ---------------------------------------------------------------------------
-- Run these two. Page size is 20, newest post first.
--   EXPLAIN (ANALYZE, COSTS OFF)
--   SELECT id, created_at, title FROM l17_posts
--   ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0;
--
--   EXPLAIN (ANALYZE, COSTS OFF)
--   SELECT id, created_at, title FROM l17_posts
--   ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 99980;
--
-- My guess: how many rows does the Sort step read in each case?
-- Expected shape: Seq Scan on all 200000 rows, then a Sort, in both. Page 1 uses
--   "top-N heapsort" (keeps only 20 rows). Page 5000 has to sort 100000 rows
--   ("external merge" on disk, or "quicksort" in memory), so it is slower.

-- ---------------------------------------------------------------------------
-- Task 2. Write it yourself: the index
-- ---------------------------------------------------------------------------
-- Create the index that matches ORDER BY created_at DESC, id DESC. Then run ANALYZE l17_posts;
-- and the two EXPLAINs of task 1 again.
--
-- TODO 2: write the CREATE INDEX here
--
-- CHECK 2
-- Expected: both plans use "Index Scan using ..." and no Sort.
--   Page 1: about 0.04 ms.
--   Page 5000: the Index Scan line says rows=100000 (it reads 100000 index entries and throws away
--   99980 of them). It takes about 10 ms. The deeper the page, the more work.

-- ---------------------------------------------------------------------------
-- Task 3. Write it yourself: keyset pagination
-- ---------------------------------------------------------------------------
-- First get the "cursor": the last row of page 4999 (the row at offset 99979). Run:
--   SELECT created_at, id FROM l17_posts
--   ORDER BY created_at DESC, id DESC OFFSET 99979 LIMIT 1 \gset c_
-- psql now has two variables: :'c_created_at' and :c_id.
--
-- Write the query for the next page (20 rows) WITHOUT using OFFSET. Use the two variables.
--
-- TODO 3: write the query here
--
-- CHECK 3a: put EXPLAIN (ANALYZE, COSTS OFF) in front of your query.
-- Expected: an Index Scan with  Index Cond: (ROW(created_at, id) < ROW('...', 100021))  and rows=20.
--   About 0.04 ms, the same as page 1.
--
-- CHECK 3b: are your 20 rows the same as the OFFSET 99980 page?
--   SELECT (SELECT array_agg(id) FROM (SELECT id FROM l17_posts
--                                      ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 99980) a)
--        = (SELECT array_agg(id) FROM ( <your query here> ) b) AS same_rows;
-- Expected: same_rows = t

-- ---------------------------------------------------------------------------
-- Task 4. The tie-breaker
-- ---------------------------------------------------------------------------
-- l17_small has 95 posts, 10 per second. The first page (20 rows, newest first) ends at id 76.
-- Run the next page two ways. The cursor is: created_at = '2026-01-01 00:00:07+00', id = 76.
--   (a) with created_at only:
--       SELECT id FROM l17_small WHERE created_at < '2026-01-01 00:00:07+00'
--       ORDER BY created_at DESC, id DESC LIMIT 20;
--   (b) with both columns:
--       SELECT id FROM l17_small WHERE (created_at, id) < ('2026-01-01 00:00:07+00', 76)
--       ORDER BY created_at DESC, id DESC LIMIT 20;
--
-- My guess: which one skips posts? Which ids?
-- Expected: (a) starts at 69, so ids 75, 74, 73, 72, 71, 70 are never shown. They have the same
--           second as id 76, and "created_at <" throws away the whole second.
--           (b) starts at 75 and nothing is lost.

-- ---------------------------------------------------------------------------
-- Task 5. Write it yourself: is there a next page?
-- ---------------------------------------------------------------------------
-- A page of 20 rows needs to tell the app if a next page exists, without a count(*).
-- Write the keyset query of task 3, but ask for ONE row more than the page size.
--
-- TODO 5: write the query here
--
-- CHECK 5: Expected: 21 rows. If you get 21, there is a next page: show 20 and keep the 20th row as the cursor.
--   Try the cursor of the very last page too. The cursor for the last 5 rows:
--     SELECT created_at, id FROM l17_posts ORDER BY created_at ASC, id ASC OFFSET 4 LIMIT 1 \gset e_
--   Run your query with :'e_created_at' and :e_id. Expected: 4 rows, so no next page.

-- ---------------------------------------------------------------------------
-- Task 6 (optional). What a "page 5000 of 10000" label costs
-- ---------------------------------------------------------------------------
--   EXPLAIN (ANALYZE, COSTS OFF) SELECT count(*) FROM l17_posts;
-- Expected: a Seq Scan on all 200000 rows (about 10 to 25 ms; 14 ms in my run). Postgres has no
--   ready-made row count. On 1 million rows it was 73 ms in my test, and it grows with the table.
--
-- Clean up afterwards:
--   DROP TABLE l17_posts, l17_small;
