-- Seed data for the PostgreSQL query practice playground.
-- Runs automatically on first container start (docker-entrypoint-initdb.d).
-- Design notes:
--   * NO indexes beyond primary keys and one unique constraint —
--     the exercises add indexes and measure the difference.
--   * stores 901..1000 have no orders (for LEFT JOIN / anti-join exercises).
--   * ~100k orders and ~200k point_transactions: enough rows for EXPLAIN
--     to show real plan changes.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ---------------------------------------------------------------------------
-- Tables (mirrors the DBO B2B platform shape: stores / orders / points)
-- ---------------------------------------------------------------------------

CREATE TABLE stores (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  city        text NOT NULL,
  referred_by int,                    -- for the recursive CTE exercise
  created_at  timestamptz NOT NULL
);

CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  store_id    int NOT NULL REFERENCES stores(id),
  status      text NOT NULL,          -- PENDING | PAID | SHIPPED | DELIVERED | CANCELLED
  total_cents bigint NOT NULL,
  created_at  timestamptz NOT NULL
);

CREATE TABLE point_transactions (
  id         bigserial PRIMARY KEY,
  store_id   int NOT NULL REFERENCES stores(id),
  amount     int NOT NULL,            -- + earn / - redeem
  reason     text NOT NULL,           -- PURCHASE | REDEEM | REFUND | YEARLY_RESET
  reference  text NOT NULL UNIQUE,    -- idempotency key (webhook dedupe exercise)
  created_at timestamptz NOT NULL
);

CREATE TABLE jobs (
  id         bigserial PRIMARY KEY,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  status     text NOT NULL DEFAULT 'queued',   -- queued | running | done | failed
  attempts   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- Data
-- ---------------------------------------------------------------------------

-- 1,000 stores; referred_by forms a tree (store g was referred by store g/2)
INSERT INTO stores (name, city, referred_by, created_at)
SELECT
  'Store ' || g,
  (ARRAY['Jakarta','Surabaya','Bandung','Medan','Semarang'])[1 + (g % 5)],
  CASE WHEN g = 1 THEN NULL ELSE g / 2 END,
  now() - (g % 730) * interval '1 day'
FROM generate_series(1, 1000) AS g;

-- 100,000 orders, spread over stores 1..900 and the last 365 days.
-- Status is weighted: PAID appears ~3x more than the others.
INSERT INTO orders (store_id, status, total_cents, created_at)
SELECT
  1 + floor(random() * 900)::int,
  (ARRAY['PENDING','PAID','PAID','PAID','SHIPPED','DELIVERED','CANCELLED'])[1 + floor(random() * 7)::int],
  (10000 + floor(random() * 5000000))::bigint,
  now() - random() * interval '365 days'
FROM generate_series(1, 100000);

-- 200,000 point transactions over the same stores.
INSERT INTO point_transactions (store_id, amount, reason, reference, created_at)
SELECT
  1 + floor(random() * 900)::int,
  (floor(random() * 500) - 150)::int,
  (ARRAY['PURCHASE','PURCHASE','REDEEM','REFUND'])[1 + floor(random() * 4)::int],
  'seed:' || g,
  now() - random() * interval '365 days'
FROM generate_series(1, 200000) AS g;

-- 50 queued jobs for the SKIP LOCKED exercise.
INSERT INTO jobs (type, payload)
SELECT 'send_email', jsonb_build_object('n', g)
FROM generate_series(1, 50) AS g;

-- Fresh statistics so the planner starts with good estimates.
ANALYZE;
