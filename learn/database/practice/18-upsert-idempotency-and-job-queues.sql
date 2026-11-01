-- Practice for lesson 18: Upsert, idempotency and job queues
-- Lesson: learn/database/18-upsert-idempotency-and-job-queues.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. Tasks 5 and 6 need TWO psql windows (A and B).
--   Option 2, any Postgres. Use a test database.
--
-- Tip: in psql, type \pset null NULL first.
--
-- How to work
--   For each task, first write your guess under "My guess". Then write your SQL under the TODO
--   line and run it. Compare with the "Expected" comments.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3. Error texts show the main words only.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the tables first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l18_users, l18_prices, l18_events, l18_wallet, l18_jobs CASCADE;

CREATE TABLE l18_users (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL,
  name       text NOT NULL,
  visits     int  NOT NULL DEFAULT 1
);

CREATE TABLE l18_prices (sku text PRIMARY KEY, price int NOT NULL, updated_at timestamptz NOT NULL);
INSERT INTO l18_prices VALUES ('rice', 100, '2026-11-01 10:00:00+00');

CREATE TABLE l18_events (event_id text PRIMARY KEY, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE l18_wallet (user_id int PRIMARY KEY, balance int NOT NULL);
INSERT INTO l18_wallet VALUES (1, 0);

CREATE TABLE l18_jobs (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, status text NOT NULL DEFAULT 'pending', worker text);
INSERT INTO l18_jobs (status) SELECT 'pending' FROM generate_series(1, 5);

-- ---------------------------------------------------------------------------
-- Task 1. DO NOTHING needs a unique rule
-- ---------------------------------------------------------------------------
-- Run this first:
--   INSERT INTO l18_users (email, name) VALUES ('ana@example.com', 'Ana')
--   ON CONFLICT (email) DO NOTHING;
-- Expected: ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
--
-- TODO 1: add the rule that makes it work (one statement). Then run the INSERT again, and a second
--         time with the same email.
--
-- CHECK 1
--   First run: INSERT 0 1.   Second run: INSERT 0 0 (no error, no new row).
--   SELECT id, email, name, visits FROM l18_users;     Expected: one row, Ana.

-- ---------------------------------------------------------------------------
-- Task 2. Insert or update, and tell which one happened
-- ---------------------------------------------------------------------------
-- Write ONE statement that: inserts ('ana@example.com', 'Ana B'), and if the email exists,
-- sets name to the new name and adds 1 to visits. Return id, name, visits and a column
-- called inserted that is true only when a new row was made (hint: xmax = 0).
--
-- TODO 2: write the statement
--
-- CHECK 2: Expected one row:  name = Ana B, visits = 2, inserted = f.
--   Then run it with ('budi@example.com', 'Budi'): inserted = t, visits = 1.
--   Notice Budi's id. It is not 2. Why? (Failed and skipped inserts still use up identity numbers.)

-- ---------------------------------------------------------------------------
-- Task 3. Only update if the new data is newer
-- ---------------------------------------------------------------------------
-- l18_prices has rice at 100, updated 2026-11-01 10:00 UTC.
-- Write an upsert for ('rice', 90, '2026-11-01 09:00:00+00') that changes the price ONLY if the new
-- updated_at is later than the stored one. Run it. Then run the same for ('rice', 120, '2026-11-01 11:00:00+00').
--
-- TODO 3: write the upsert
--
-- CHECK 3
--   First (09:00): INSERT 0 0, the price stays 100.
--   Second (11:00): INSERT 0 1, the price becomes 120.

-- ---------------------------------------------------------------------------
-- Task 4. A webhook delivered twice
-- ---------------------------------------------------------------------------
-- The event evt_1 means "add 100 to the wallet of user 1". It arrives twice. Make sure the wallet gets 100 once.
-- Use ONE transaction: first record the event id (l18_events) with DO NOTHING, and only if that
-- INSERT made a row (INSERT 0 1), run the UPDATE of the wallet and COMMIT. If it says INSERT 0 0,
-- type ROLLBACK instead.
--
-- TODO 4: write the transaction, and run it twice
--
-- CHECK 4
--   First run:  INSERT 0 1, UPDATE 1, COMMIT.     Second run: INSERT 0 0, then you ROLLBACK.
--   SELECT balance FROM l18_wallet;     Expected: 100 (not 200).

-- ---------------------------------------------------------------------------
-- Task 5. Two windows: the race
-- ---------------------------------------------------------------------------
-- Part a, check first, then insert. (Use a new email.)
--   A: BEGIN;
--   B: BEGIN;
--   A: SELECT 1 FROM l18_users WHERE email = 'cara@example.com';     (no rows)
--   B: SELECT 1 FROM l18_users WHERE email = 'cara@example.com';     (no rows)
--   A: INSERT INTO l18_users (email, name) VALUES ('cara@example.com', 'Cara A');
--   B: INSERT INTO l18_users (email, name) VALUES ('cara@example.com', 'Cara B');     (B waits)
--   A: COMMIT;
-- My guess: what does B get?
-- Expected: ERROR:  duplicate key value violates unique constraint "..."   (the name of your rule)
--   B: ROLLBACK;
--
-- Part b, the same, but both INSERTs end with ON CONFLICT (email) DO NOTHING (use 'dan@example.com').
-- Expected: B waits for A, then B says INSERT 0 0. No error. One row. The name is the one from A.
--   (Run COMMIT in both windows at the end.)

-- ---------------------------------------------------------------------------
-- Task 6. A job queue with SKIP LOCKED (two windows)
-- ---------------------------------------------------------------------------
-- l18_jobs has 5 pending jobs. Each worker takes the next pending job nobody else holds.
--   A: BEGIN;
--   A: <your query>      (returns job 1)
--   B: BEGIN;
--   B: <your query>      (returns job 2, and does not wait)
--   A: UPDATE l18_jobs SET status = 'done', worker = 'A' WHERE id = 1;
--   A: COMMIT;
--   B: UPDATE l18_jobs SET status = 'done', worker = 'B' WHERE id = 2;
--   B: COMMIT;
--
-- TODO 6: write the query that takes ONE pending job, the lowest id, and skips jobs that
--         another transaction has locked.
--
-- CHECK 6
--   SELECT id, status, worker FROM l18_jobs ORDER BY id;
--   Expected: jobs 1 and 2 are done (A and B), jobs 3, 4 and 5 are pending.
--   Then try without the skip clause: B's query waits until A commits.
--
-- Optional: A takes job 1 and then you kill A's connection (close the window). B's next query returns
--   job 1 again, because A's transaction was rolled back.
--
-- Clean up afterwards:
--   DROP TABLE l18_users, l18_prices, l18_events, l18_wallet, l18_jobs;
