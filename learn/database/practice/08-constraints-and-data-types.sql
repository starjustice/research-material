-- Lesson 08 practice: constraints and data types
-- Add rules to tables, guess which inserts Postgres refuses, and pick safe types for money, time and JSON.
--
-- How to run:
--   Docker playground: from learn/database/examples/postgres-practice/ run
--     docker compose exec -T db psql -U practice practice < ../../practice/08-constraints-and-data-types.sql
--   (-T lets psql read the file from your computer.)
--   Or open psql with: docker compose exec db psql -U practice practice
--   and paste the file in, one task at a time. Pasting one task at a time is better here,
--   because many tasks WANT an error, and you should read each error.
--   No Docker: paste it into the PGlite REPL at https://pglite.dev/repl/ (real Postgres in the browser).
--
-- Work top to bottom. Write your SQL under each TODO. Check your result against "Expected".
-- An error is often the right answer in this file. Compare the error text with "Expected".
-- The answers are in lesson 08, section 9 C, inside "One possible answer". Try first.
-- Every table here starts with l08_ so it never touches the practice tables.

-- ---------------------------------------------------------------------------
-- Setup: start clean every time you run the file
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS l08_vouchers, l08_payments, l08_visits, l08_events, l08_staff;

-- Vouchers a store can give. There are NO rules yet, and one row is already bad.
CREATE TABLE l08_vouchers (
  id             serial PRIMARY KEY,
  code           text,
  discount_cents bigint
);

INSERT INTO l08_vouchers (code, discount_cents) VALUES
  ('WELCOME', 5000),
  ('RAMADAN', 10000),
  ('FREE',    -100),     -- a bug wrote a negative discount
  ('VIP',     25000);

-- ---------------------------------------------------------------------------
-- Task 1: add a CHECK rule to a table that already has a bad row
-- ---------------------------------------------------------------------------
-- 1a. Add a rule named l08_vouchers_discount_positive: discount_cents must be above 0.
-- TODO

-- Expected: an error, because one old row breaks the new rule.
--   ERROR:  check constraint "l08_vouchers_discount_positive" of relation "l08_vouchers" is violated by some row

-- 1b. Find the row that breaks the rule. Columns: id, code, discount_cents.
-- TODO

-- Expected:
--  id | code | discount_cents
--   3 | FREE |           -100

-- 1c. Fix that row: set its discount to 100 cents. Then run your ALTER TABLE from 1a again.
-- TODO

-- Expected: UPDATE 1, then ALTER TABLE works with no error.

-- ---------------------------------------------------------------------------
-- Task 2: more rules, then predict which inserts fail
-- ---------------------------------------------------------------------------
-- 2a. Make code required and unique. Then add a column kind:
--     text, required, default 'FIXED', and only 'FIXED' or 'PERCENT' allowed.
-- TODO

-- Expected: three statements, no errors.
-- Check: SELECT id, code, kind FROM l08_vouchers ORDER BY id;
--  id | code    | kind
--   1 | WELCOME | FIXED
--   2 | RAMADAN | FIXED
--   3 | FREE    | FIXED
--   4 | VIP     | FIXED
-- (The DEFAULT filled kind for the old rows too.)

-- 2b. BEFORE you run them, write next to each insert: works, or which rule stops it.
INSERT INTO l08_vouchers (code, discount_cents) VALUES ('NEW10', 1000);                -- a: ?
INSERT INTO l08_vouchers (code, discount_cents) VALUES ('NEW10', 500);                 -- b: ?
INSERT INTO l08_vouchers (code, discount_cents) VALUES (NULL, 500);                    -- c: ?
INSERT INTO l08_vouchers (code, discount_cents) VALUES ('BIG', 0);                     -- d: ?
INSERT INTO l08_vouchers (code, discount_cents, kind) VALUES ('HALF', 50, 'percent');  -- e: ?
INSERT INTO l08_vouchers (code, discount_cents, kind) VALUES ('HALF', 50, 'PERCENT');  -- f: ?

-- Expected (open only after you wrote your guesses):
--   a works. b fails on UNIQUE (Key (code)=(NEW10) already exists).
--   c fails on NOT NULL for code. d fails on the CHECK discount_cents > 0.
--   e fails on the CHECK for kind (lowercase). f works.
-- Check: SELECT count(*) FROM l08_vouchers;   Expected: 6
-- Check: SELECT max(id) FROM l08_vouchers;    Expected: 10 (the refused inserts still used up ids 6 to 9)

-- ---------------------------------------------------------------------------
-- Task 3: money as float against money as cents
-- ---------------------------------------------------------------------------
CREATE TABLE l08_payments (
  id           serial PRIMARY KEY,
  amount_float float8 NOT NULL,   -- the wrong way
  amount_cents bigint NOT NULL    -- the safe way
);
INSERT INTO l08_payments (amount_float, amount_cents) VALUES (0.1, 10), (0.2, 20), (0.3, 30);

-- 3a. In one query, show sum(amount_float) AS float_total and sum(amount_cents) AS cents_total.
-- TODO

-- Expected:
--  float_total        | cents_total
--  0.6000000000000001 |          60

-- 3b. Show the cents total as dollars with exactly 2 decimals, named dollars. Use numeric, not float.
-- TODO

-- Expected:
--  dollars
--  0.60

-- ---------------------------------------------------------------------------
-- Task 4: one moment in time, shown in three time zones
-- ---------------------------------------------------------------------------
CREATE TABLE l08_visits (
  label   text,
  plain   timestamp,     -- no time zone: the wrong way
  with_tz timestamptz    -- with time zone: the safe way
);

-- 4a. Set the session time zone to 'Asia/Jakarta'.
--     Insert one row: label 'visit', and '2026-03-01 08:00:00+07' into BOTH time columns.
-- TODO

-- 4b. Set the session time zone to 'UTC' and select label, plain, with_tz.
-- TODO

-- Expected:
--  label | plain               | with_tz
--  visit | 2026-03-01 08:00:00 | 2026-03-01 01:00:00+00

-- 4c. Set the session time zone to 'Australia/Sydney' and select the same columns.
-- TODO

-- Expected:
--  label | plain               | with_tz
--  visit | 2026-03-01 08:00:00 | 2026-03-01 12:00:00+11
-- (plain never changes: Postgres threw the +07 away. with_tz is the same moment, shown in Sydney time.)
-- Put the zone back when you are done: SET timezone = 'Asia/Jakarta';

-- ---------------------------------------------------------------------------
-- Task 5: JSONB has no types inside
-- ---------------------------------------------------------------------------
CREATE TABLE l08_events (
  id      int PRIMARY KEY,
  payload jsonb NOT NULL
);
INSERT INTO l08_events SELECT g, jsonb_build_object('n', g) FROM generate_series(1, 50) AS g;

-- 5a. Run this query. It should count events with n above 40. It gives the wrong number.
SELECT count(*) FROM l08_events WHERE payload->>'n' > '40';
-- Expected: 15. Why is that wrong?

-- 5b. Write the correct query.
-- TODO

-- Expected: 10

-- 5c. Add a GIN index on payload named l08_events_payload_gin.
--     Then find the event whose payload contains {"n": 7} with the @> operator. Columns: id, payload.
-- TODO

-- Expected:
--  id | payload
--   7 | {"n": 7}

-- ---------------------------------------------------------------------------
-- Task 6 (stretch): soft delete and a partial unique index
-- ---------------------------------------------------------------------------
-- Staff are never really deleted. "Deleted" means deleted_at has a time.
CREATE TABLE l08_staff (
  id         serial PRIMARY KEY,
  email      text NOT NULL,
  deleted_at timestamptz
);

-- 6a. Make email unique, but only among rows that are NOT deleted.
--     Name the index l08_staff_email_live.
-- TODO

-- 6b. Predict, then run:
INSERT INTO l08_staff (email) VALUES ('ana@toko.id');                                              -- ?
UPDATE l08_staff SET deleted_at = '2026-10-01 10:00:00+07' WHERE email = 'ana@toko.id';            -- ?
INSERT INTO l08_staff (email) VALUES ('ana@toko.id');                                              -- ?
INSERT INTO l08_staff (email) VALUES ('ana@toko.id');                                              -- ?

-- Expected: insert works, update works, the second insert works,
-- the third insert fails:
--   ERROR:  duplicate key value violates unique constraint "l08_staff_email_live"
--   DETAIL:  Key (email)=(ana@toko.id) already exists.
-- Check: SELECT id, email, deleted_at IS NOT NULL AS deleted FROM l08_staff ORDER BY id;
--  id | email       | deleted
--   1 | ana@toko.id | t
--   2 | ana@toko.id | f
