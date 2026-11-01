-- Practice for lesson 14: Isolation levels
-- Lesson: learn/database/14-isolation-levels.md
--
-- How to run it
--   You need TWO psql windows on the same database. Call them A and B.
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice      (run this in both windows)
--   Option 2, any Postgres. Use a test database.
--   Run the setup in window A only. Then follow the numbered lines: "A:" means type it in
--   window A, "B:" means type it in window B. Keep the order. The order is the whole point.
--
-- Tip: in psql, type \pset null NULL first.
--
-- How to work
--   For each task, first write your guess under "My guess". Then run it and compare.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3 (and the default level, READ COMMITTED).
-- If a window shows "current transaction is aborted", type ROLLBACK; and go on.

-- ---------------------------------------------------------------------------
-- Setup (window A only; safe to run again)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l14_accounts, l14_orders, l14_doctors CASCADE;

CREATE TABLE l14_accounts (id int PRIMARY KEY, owner text NOT NULL, balance int NOT NULL);
INSERT INTO l14_accounts VALUES (1, 'Ana', 400), (2, 'Budi', 400);

CREATE TABLE l14_orders (id int PRIMARY KEY, status text NOT NULL);
INSERT INTO l14_orders VALUES (1, 'PENDING'), (2, 'PENDING'), (3, 'PAID');

CREATE TABLE l14_doctors (name text PRIMARY KEY, on_call boolean NOT NULL);
INSERT INTO l14_doctors VALUES ('Dewi', true), ('Eka', true);

-- ---------------------------------------------------------------------------
-- Task 1. The same read, twice
-- ---------------------------------------------------------------------------
-- Part a, the default level.
--   B: BEGIN;
--   B: SELECT balance FROM l14_accounts WHERE id = 1;
--   A: UPDATE l14_accounts SET balance = 300 WHERE id = 1;      (no BEGIN: it is saved at once)
--   B: SELECT balance FROM l14_accounts WHERE id = 1;
--   B: COMMIT;
-- My guess: the two reads in B give ______ and ______.
-- Expected: 400, then 300.
--
-- Part b, the same, but B starts with BEGIN ISOLATION LEVEL REPEATABLE READ;
-- First set the balance back: A: UPDATE l14_accounts SET balance = 400 WHERE id = 1;
-- My guess: the two reads in B give ______ and ______.
-- Expected: 400, then 400.

-- ---------------------------------------------------------------------------
-- Task 2. New rows appear
-- ---------------------------------------------------------------------------
-- Part a, the default level.
--   B: BEGIN;
--   B: SELECT count(*) FROM l14_orders WHERE status = 'PENDING';
--   A: INSERT INTO l14_orders VALUES (4, 'PENDING');
--   B: SELECT count(*) FROM l14_orders WHERE status = 'PENDING';
--   B: COMMIT;
-- Expected: 2, then 3.
--
-- Part b, B starts with BEGIN ISOLATION LEVEL REPEATABLE READ;
-- First: A: DELETE FROM l14_orders WHERE id = 4;
-- Expected: 2, then 2. (Run A's INSERT again with id 4 in the middle.)

-- ---------------------------------------------------------------------------
-- Task 3. Two writers, REPEATABLE READ
-- ---------------------------------------------------------------------------
--   B: BEGIN ISOLATION LEVEL REPEATABLE READ;
--   B: SELECT balance FROM l14_accounts WHERE id = 1;           (400)
--   A: UPDATE l14_accounts SET balance = balance + 50 WHERE id = 1;     (saved at once)
--   B: UPDATE l14_accounts SET balance = 450 WHERE id = 1;      (B added 50 to the 400 it read)
-- My guess: what happens in B?
-- Expected: ERROR:  could not serialize access due to concurrent update
--   B: ROLLBACK;
--   Then: SELECT balance FROM l14_accounts WHERE id = 1;       -> 450  (A's change is the only one)

-- ---------------------------------------------------------------------------
-- Task 4. Write skew: the on-call doctors
-- ---------------------------------------------------------------------------
-- The rule of the hospital: at least one doctor must stay on call. Each doctor checks the
-- count first, then goes off call only if there are 2 or more.
-- Part a, REPEATABLE READ.
--   A: BEGIN ISOLATION LEVEL REPEATABLE READ;
--   B: BEGIN ISOLATION LEVEL REPEATABLE READ;
--   A: SELECT count(*) FROM l14_doctors WHERE on_call;          (2)
--   B: SELECT count(*) FROM l14_doctors WHERE on_call;          (2)
--   A: UPDATE l14_doctors SET on_call = false WHERE name = 'Dewi';
--   B: UPDATE l14_doctors SET on_call = false WHERE name = 'Eka';
--   A: COMMIT;
--   B: COMMIT;
--   Then: SELECT count(*) FROM l14_doctors WHERE on_call;
-- My guess: how many doctors are on call at the end?
-- Expected: 0. Both COMMITs worked. The rule is broken.
--
-- Part b, the same, with ISOLATION LEVEL SERIALIZABLE in both BEGIN lines.
-- (Reset first: UPDATE l14_doctors SET on_call = true;)
-- Expected: one of the COMMITs fails:
--   ERROR:  could not serialize access due to read/write dependencies among transactions
--   DETAIL:  Reason code: Canceled on identification as a pivot, during commit attempt.
--   HINT:  The transaction might succeed if retried.
--   and the count at the end is 1.

-- ---------------------------------------------------------------------------
-- Task 5. Write it yourself: fix the lost update with one statement
-- ---------------------------------------------------------------------------
-- At the default level, both A and B must add 50 to Ana, and no change may be lost.
-- Reset first: UPDATE l14_accounts SET balance = 400 WHERE id = 1;
-- Do NOT read the balance first. Use ONE UPDATE statement in each window.
--
-- TODO 5: write the UPDATE statement, then run it in both windows inside BEGIN ... COMMIT
--         (A first, then B. B will wait until A commits.)
--
-- CHECK 5
-- SELECT balance FROM l14_accounts WHERE id = 1;
-- Expected: 500.

-- ---------------------------------------------------------------------------
-- Task 6. Write it yourself: the same fix when you MUST read first
-- ---------------------------------------------------------------------------
-- Sometimes you must look at the value before you decide (for example "only if balance >= 100").
-- Make B wait for A, then read the new value. Use SELECT ... FOR UPDATE.
-- Reset first: UPDATE l14_accounts SET balance = 400 WHERE id = 1;
--   A: BEGIN;
--   B: BEGIN;
--   A: SELECT balance FROM l14_accounts WHERE id = 1 ...;     (400)
--   B: SELECT balance FROM l14_accounts WHERE id = 1 ...;     (B waits)
--   A: UPDATE l14_accounts SET balance = 450 WHERE id = 1;
--   A: COMMIT;
--   (B's SELECT now answers: 450)
--   B: UPDATE l14_accounts SET balance = 500 WHERE id = 1;
--   B: COMMIT;
--
-- TODO 6: write the two SELECT lines (what goes in place of the "...")
--
-- CHECK 6
-- SELECT balance FROM l14_accounts WHERE id = 1;
-- Expected: 500, and B's SELECT showed 450, not 400.
--
-- Clean up afterwards:
--   DROP TABLE l14_accounts, l14_orders, l14_doctors;
