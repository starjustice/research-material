-- Practice for lesson 13: Transactions and ACID
-- Lesson: learn/database/13-transactions-and-acid.md
--
-- How to run it
--   Option 1, the Docker playground. From learn/database/examples/postgres-practice:
--     docker compose up -d
--     docker compose exec db psql -U practice practice
--   Then paste this file in, one task at a time. Do not run it with "psql -f":
--   one task has a statement that must fail, and you want to read each error.
--   Option 2, any Postgres. Use a test database.
--
-- Tip: in psql, type \pset null NULL first. Then empty cells show the word NULL,
-- the same as the expected results below.
--
-- How to work
--   1. Run the setup part once. It makes a table with two accounts.
--   2. For each task, write your SQL under the TODO line and run it.
--   3. Run the CHECK lines. Compare with the "Expected" comments.
--   The answers are in the lesson, in card 11 (Practice), part C, inside "One possible answer".
--
-- Checked on PostgreSQL 18.3. Error texts show the main words; constraint names may differ.

-- ---------------------------------------------------------------------------
-- Setup (safe to run again: it drops the table first)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l13_accounts CASCADE;

CREATE TABLE l13_accounts (
  id      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner   text NOT NULL,
  balance int  NOT NULL
);

INSERT INTO l13_accounts (owner, balance) VALUES ('Ana', 500), ('Budi', 300);

-- Use this query as the CHECK after every task. The total must stay 800.
--   SELECT owner, balance, sum(balance) OVER () AS total
--   FROM l13_accounts ORDER BY id;

-- ---------------------------------------------------------------------------
-- Task 1. A transfer that works
-- ---------------------------------------------------------------------------
-- Move 100 from Ana to Budi, as ONE transaction.

-- TODO 1: write BEGIN, the two UPDATEs, and COMMIT here


-- CHECK 1
SELECT owner, balance, sum(balance) OVER () AS total FROM l13_accounts ORDER BY id;
-- Expected:
--  owner | balance | total
-- -------+---------+-------
--  Ana   |     400 |   800
--  Budi  |     400 |   800
-- (2 rows)

-- ---------------------------------------------------------------------------
-- Task 2. An error in the middle
-- ---------------------------------------------------------------------------
-- Start a transaction. Take 200 from Ana. Then run SELECT 1/0; (it fails).
-- Then try to give 200 to Budi. Then run COMMIT.
-- Before you run it, say out loud: what will the balances be at the end?

-- TODO 2: write the transaction here


-- Expected messages:
--   ERROR:  division by zero
--   ERROR:  current transaction is aborted, commands ignored until end of transaction block
--   ROLLBACK        <- this is what COMMIT answers. Nothing was saved.

-- CHECK 2
SELECT owner, balance, sum(balance) OVER () AS total FROM l13_accounts ORDER BY id;
-- Expected: the same as CHECK 1 (Ana 400, Budi 400, total 800).

-- ---------------------------------------------------------------------------
-- Task 3. A rule the whole transfer must obey
-- ---------------------------------------------------------------------------
-- Add a rule to the table: balance must never be below 0. Name it balance_not_negative.
-- Then, in one transaction: give 1000 to Budi first, then take 1000 from Ana. Then COMMIT.

-- TODO 3: write the ALTER TABLE, then the transaction


-- Expected: the second UPDATE fails.
--   ERROR:  new row for relation "l13_accounts" violates check constraint "balance_not_negative"
--   DETAIL:  Failing row contains (1, Ana, -600).
--   and COMMIT answers ROLLBACK.

-- CHECK 3
SELECT owner, balance, sum(balance) OVER () AS total FROM l13_accounts ORDER BY id;
-- Expected: still Ana 400, Budi 400, total 800. The 1000 given to Budi was undone too.

-- ---------------------------------------------------------------------------
-- Task 4. Undo only the last step (SAVEPOINT)
-- ---------------------------------------------------------------------------
-- In one transaction:
--   take 50 from Ana,
--   make a savepoint named s1,
--   try to take 5000 from Ana (it fails),
--   go back to s1,
--   give 50 to Budi,
--   COMMIT.

-- TODO 4: write the transaction here


-- CHECK 4
SELECT owner, balance, sum(balance) OVER () AS total FROM l13_accounts ORDER BY id;
-- Expected:
--  owner | balance | total
-- -------+---------+-------
--  Ana   |     350 |   800
--  Budi  |     450 |   800
-- (2 rows)

-- ---------------------------------------------------------------------------
-- Task 5. Even CREATE TABLE can be undone
-- ---------------------------------------------------------------------------
-- Start a transaction. CREATE TABLE l13_scratch (id int);
-- Run SELECT to_regclass('l13_scratch'); inside the transaction. Then ROLLBACK.
-- Run the SELECT again.

-- TODO 5: write the transaction and the second SELECT here


-- Expected:
--   inside the transaction:   l13_scratch
--   after ROLLBACK:           NULL

-- ---------------------------------------------------------------------------
-- Task 6 (optional). Two windows: what does the other session see?
-- ---------------------------------------------------------------------------
-- Open TWO psql windows on the same database. Call them A and B.
--
--   A: BEGIN;
--   A: UPDATE l13_accounts SET balance = balance - 100 WHERE owner = 'Ana';
--   A: SELECT balance FROM l13_accounts WHERE owner = 'Ana';
--      Expected: 250
--   B: SELECT balance FROM l13_accounts WHERE owner = 'Ana';
--      Expected: 350   (B does not see the change of A, because A has not committed)
--   B: UPDATE l13_accounts SET balance = balance + 1 WHERE owner = 'Ana';
--      Expected: B waits. The prompt does not come back.
--   A: COMMIT;
--      Expected: B's UPDATE finishes now.
--   B: SELECT balance FROM l13_accounts WHERE owner = 'Ana';
--      Expected: 251
--
-- Lesson 15 (locks) explains why B waited.
--
-- Clean up afterwards:
--   DROP TABLE l13_accounts;
