-- Practice for lesson 15: Locks and deadlocks
-- Lesson: learn/database/15-locks-and-deadlocks.md
--
-- How to run it
--   You need THREE psql windows on the same database. Call them A, B and C.
--   (Most tasks use only A and B. C is only for task 6.)
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice      (run this in every window)
--   Option 2, any Postgres. Use a test database.
--   Run the setup in window A only. Then follow the numbered lines: "A:" means type it in
--   window A, "B:" means type it in window B. Keep the order. The order is the whole point.
--   A line in brackets, like (B waits), tells you what to see. It is not something to type.
--
-- Tip: in psql, type \pset null NULL first.
--
-- How to work
--   For each task, first write your guess under "My guess". Then run it and compare.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3 with the default deadlock_timeout of 1 second.
-- If a window shows "current transaction is aborted", type ROLLBACK; and go on.
-- At the end of every task, type ROLLBACK; (or COMMIT;) in both windows, so no lock is left.

-- ---------------------------------------------------------------------------
-- Setup (window A only; safe to run again)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l15_accounts, l15_orders CASCADE;

CREATE TABLE l15_accounts (id int PRIMARY KEY, owner text NOT NULL, balance int NOT NULL);
INSERT INTO l15_accounts VALUES (1, 'Ana', 400), (2, 'Budi', 400), (3, 'Citra', 400);

CREATE TABLE l15_orders (id int PRIMARY KEY, note text);
INSERT INTO l15_orders SELECT g, 'x' FROM generate_series(1, 1000) g;

-- ---------------------------------------------------------------------------
-- Task 1. Which statements wait?
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   A: UPDATE l15_accounts SET balance = 0 WHERE id = 1;
--   B: SELECT balance FROM l15_accounts WHERE id = 1;
--   B: UPDATE l15_accounts SET balance = 1 WHERE id = 2;
--   B: UPDATE l15_accounts SET balance = 2 WHERE id = 1;
-- My guess: which of B's three statements waits?
-- Expected: only the last one. (B's SELECT shows 400, the old value. B's second line works.)
--   A: COMMIT;        (now B's last UPDATE finishes)
--   B: ROLLBACK;

-- ---------------------------------------------------------------------------
-- Task 2. SELECT ... FOR UPDATE
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   A: SELECT * FROM l15_accounts WHERE id = 1 FOR UPDATE;
--   B: SELECT balance FROM l15_accounts WHERE id = 1;                  (no wait)
--   B: SELECT balance FROM l15_accounts WHERE id = 1 FOR UPDATE;       (B waits)
--   A: COMMIT;        (B's SELECT ... FOR UPDATE answers now)
--   B: ROLLBACK;

-- ---------------------------------------------------------------------------
-- Task 3. Do not wait: NOWAIT, SKIP LOCKED, lock_timeout
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   A: SELECT * FROM l15_accounts WHERE id = 1 FOR UPDATE;
--   B: SELECT * FROM l15_accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- Expected: ERROR:  could not obtain lock on row in relation "l15_accounts"
--   B: SELECT id FROM l15_accounts ORDER BY id FOR UPDATE SKIP LOCKED;
-- Expected: two rows, ids 2 and 3. Row 1 is skipped.
--   B: SET lock_timeout = '500ms';
--   B: UPDATE l15_accounts SET balance = 5 WHERE id = 1;
-- Expected: after half a second, ERROR:  canceling statement due to lock timeout
--   A: ROLLBACK;
--   B: ROLLBACK;

-- ---------------------------------------------------------------------------
-- Task 4. A deadlock
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   B: BEGIN;
--   A: UPDATE l15_accounts SET balance = balance - 10 WHERE id = 1;
--   B: UPDATE l15_accounts SET balance = balance - 10 WHERE id = 2;
--   A: UPDATE l15_accounts SET balance = balance + 10 WHERE id = 2;    (A waits for B)
--   B: UPDATE l15_accounts SET balance = balance + 10 WHERE id = 1;    (B waits for A)
-- My guess: what happens? How long does it take?
-- Expected: after about 1 second, one of the windows shows
--   ERROR:  deadlock detected
--   DETAIL:  Process 12345 waits for ShareLock on transaction 1039; blocked by process 12346.
--            Process 12346 waits for ShareLock on transaction 1038; blocked by process 12345.
--   HINT:  See server log for query details.
--   (your numbers will differ). The other window's UPDATE finishes.
--   A: ROLLBACK;
--   B: ROLLBACK;

-- ---------------------------------------------------------------------------
-- Task 5. Write it yourself: a transfer that cannot deadlock
-- ---------------------------------------------------------------------------
-- Repeat task 4, but this time every window must lock BOTH rows first, in id order,
-- before it changes anything. Window A moves 10 from Ana (id 1) to Budi (id 2).
-- Window B moves 10 from Budi (id 2) to Ana (id 1).
--
-- TODO 5: write the one statement that locks both rows in id order. Run it first in each
--         window, right after BEGIN. Then run the two UPDATEs in each window.
--
-- CHECK 5: no deadlock error in either window. One window waits a moment, then both finish.
--   Then: SELECT id, balance FROM l15_accounts ORDER BY id;
-- Expected: 400, 400 and 400 (the two transfers cancel out).

-- ---------------------------------------------------------------------------
-- Task 6. Write it yourself: who is blocking whom?
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   A: UPDATE l15_accounts SET balance = 0 WHERE id = 1;       (and leave the window alone)
--   B: UPDATE l15_accounts SET balance = 1 WHERE id = 1;       (B waits)
-- Now, in window C, write a query on pg_stat_activity that shows every session that is
-- waiting for another one: its pid, the pid(s) that block it, its state and the start of its query.
-- Hint: use pg_blocking_pids(pid). Keep only the rows where it is not empty.
--
-- TODO 6: write the query in window C
--
-- CHECK 6
-- Expected: one row, for B. blocked_by holds A's pid. Then look at A's own row in
-- pg_stat_activity: its state is 'idle in transaction'. A is not doing anything. It is just
-- holding the lock. That is why a forgotten open transaction is dangerous.
--   A: COMMIT;
--   B: ROLLBACK;

-- ---------------------------------------------------------------------------
-- Task 7 (optional). A waiting ALTER TABLE
-- ---------------------------------------------------------------------------
--   A: BEGIN;
--   A: SELECT count(*) FROM l15_orders;                  (a plain read, and A leaves the transaction open)
--   B: ALTER TABLE l15_orders ADD COLUMN l15_new int;    (B waits for A)
--   C: SELECT count(*) FROM l15_orders;                  (a plain read. My guess: does C wait?)
-- Expected: C waits too, behind B's ALTER, although C only reads.
--   A: COMMIT;       (now B finishes, and then C answers)
--
-- Then try it the safe way:
--   A: BEGIN;
--   A: SELECT count(*) FROM l15_orders;
--   B: SET lock_timeout = '300ms';
--   B: ALTER TABLE l15_orders ADD COLUMN l15_new2 int;
-- Expected: after 0.3 seconds, ERROR:  canceling statement due to lock timeout
--   C: SELECT count(*) FROM l15_orders;                  (no wait)
--   A: COMMIT;
--
-- Clean up afterwards:
--   DROP TABLE l15_accounts, l15_orders;
