-- ============================================================================
-- PostgreSQL practice exercises — run these in psql, in order.
-- Format: the TASK is a comment; try it yourself, then compare with SOLUTION.
-- Turn on timing first:   \timing on
-- Reset everything:       docker compose down -v && docker compose up -d
-- ============================================================================


-- ============================================================================
-- Exercise 1 — LEFT JOIN vs INNER JOIN, and COUNT(*) vs COUNT(col)
-- TASK: List every store with its order count — INCLUDING stores that have
--       zero orders (stores 901..1000 have none). Sort by count descending.
--       Why would COUNT(*) be wrong here?
-- ============================================================================

-- SOLUTION
SELECT s.id, s.name, COUNT(o.id) AS order_count       -- COUNT(o.id) skips NULLs → 0
FROM stores s
LEFT JOIN orders o ON o.store_id = s.id
GROUP BY s.id, s.name
ORDER BY order_count DESC;
-- COUNT(*) counts the joined ROW (even the all-NULL one) → zero-order stores
-- would show 1 instead of 0. Verify: WHERE s.id = 950.


-- ============================================================================
-- Exercise 2 — The LEFT JOIN + WHERE trap
-- TASK: "All stores, with their PAID orders if any."
--       First write it with WHERE o.status = 'PAID' and count result rows.
--       Then fix it. How many stores disappear in the broken version?
-- ============================================================================

-- SOLUTION
-- Broken: WHERE turns the LEFT JOIN into an INNER JOIN (NULL fails the filter)
SELECT COUNT(DISTINCT s.id) FROM stores s
LEFT JOIN orders o ON o.store_id = s.id
WHERE o.status = 'PAID';                               -- ~900 stores. The 100 orderless stores vanished.

-- Fixed: filter belongs in ON
SELECT COUNT(DISTINCT s.id) FROM stores s
LEFT JOIN orders o ON o.store_id = s.id AND o.status = 'PAID';   -- 1000 stores.


-- ============================================================================
-- Exercise 3 — Anti-join
-- TASK: Find the stores with NO orders, two ways: NOT EXISTS and
--       LEFT JOIN ... IS NULL. Then explain why NOT IN would be risky.
-- ============================================================================

-- SOLUTION
SELECT s.id, s.name FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.store_id = s.id);

SELECT s.id, s.name FROM stores s
LEFT JOIN orders o ON o.store_id = s.id
WHERE o.id IS NULL;
-- NOT IN risk: if the subquery ever returns a NULL, NOT IN returns ZERO rows,
-- silently. NOT EXISTS is NULL-safe. Prefer it.


-- ============================================================================
-- Exercise 4 — Aggregation with FILTER and HAVING
-- TASK: Per city: total PAID revenue, count of PAID orders, count of
--       CANCELLED orders. Only show cities with more than 5,000 orders total.
-- ============================================================================

-- SOLUTION
SELECT s.city,
       SUM(o.total_cents) FILTER (WHERE o.status = 'PAID')  AS paid_revenue,
       COUNT(*)           FILTER (WHERE o.status = 'PAID')  AS paid_orders,
       COUNT(*)           FILTER (WHERE o.status = 'CANCELLED') AS cancelled_orders
FROM stores s
JOIN orders o ON o.store_id = s.id
GROUP BY s.city
HAVING COUNT(*) > 5000;                                -- HAVING filters groups, WHERE filters rows


-- ============================================================================
-- Exercise 5 — Read a bad plan (BEFORE any index)
-- TASK: EXPLAIN (ANALYZE, BUFFERS) the query "10 newest orders of store 42".
--       Identify: the scan type, the Sort node, Rows Removed by Filter,
--       and whether the row estimate is close to reality.
-- ============================================================================

-- SOLUTION
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE store_id = 42
ORDER BY created_at DESC
LIMIT 10;
-- Expect: Seq Scan on orders (whole table!), Filter: store_id = 42,
-- Rows Removed by Filter ≈ 99,9xx, then a top-N heapsort feeding the Limit.
-- This is the "no index" baseline — note the execution time.


-- ============================================================================
-- Exercise 6 — THE MOCK-INTERVIEW REPLAY: two single indexes vs one composite
-- TASK: The query is  ORDER BY total_cents DESC, created_at DESC LIMIT 1
--       (same shape as ORDER BY tenor DESC, plafon DESC LIMIT 1).
--       a) Create single-column indexes on total_cents and created_at.
--          EXPLAIN ANALYZE — is the Sort gone? Why not?
--       b) Create ONE composite index (plain ASC!). EXPLAIN ANALYZE again.
--          What does the plan say instead of Sort?
-- ============================================================================

-- SOLUTION
-- a) Two single-column indexes CANNOT serve a two-column sort:
CREATE INDEX idx_orders_total   ON orders (total_cents);
CREATE INDEX idx_orders_created ON orders (created_at);

EXPLAIN ANALYZE
SELECT * FROM orders ORDER BY total_cents DESC, created_at DESC LIMIT 1;
-- Postgres may walk idx_orders_total backward, but rows with EQUAL total_cents
-- are not ordered by created_at inside it — it still needs a sort step
-- (often an Incremental Sort), and it can never combine two B-trees into
-- one two-column ordering.

-- b) ONE composite index — plain ASC works, backward scan handles DESC DESC:
CREATE INDEX idx_orders_total_created ON orders (total_cents, created_at);

EXPLAIN ANALYZE
SELECT * FROM orders ORDER BY total_cents DESC, created_at DESC LIMIT 1;
-- Expect: "Index Scan Backward using idx_orders_total_created", NO Sort node,
-- actual rows=1. It read exactly one index entry.
-- DESC in the index definition is only needed for MIXED directions
-- (e.g. ORDER BY total_cents DESC, created_at ASC).

-- Clean up the two useless indexes (they only tax writes now):
DROP INDEX idx_orders_total, idx_orders_created;


-- ============================================================================
-- Exercise 7 — Composite index for the store timeline (fix Exercise 5)
-- TASK: Create the right index for  WHERE store_id = ? ORDER BY created_at
--       DESC LIMIT 10,  then re-run the EXPLAIN from Exercise 5.
--       Compare execution time and Buffers with the baseline.
-- ============================================================================

-- SOLUTION
CREATE INDEX idx_orders_store_created ON orders (store_id, created_at);
-- rule: equality column first, then the sort column

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE store_id = 42
ORDER BY created_at DESC
LIMIT 10;
-- Expect: Index Scan Backward, Index Cond: store_id = 42, no Sort,
-- Buffers ~13 instead of ~1800, time ~0.1ms instead of ~20ms.


-- ============================================================================
-- Exercise 8 — Covering index → Index Only Scan
-- TASK: The dashboard only needs (created_at, total_cents) per store.
--       Make that query answerable from the index alone. Verify the plan
--       says "Index Only Scan" and check "Heap Fetches".
-- ============================================================================

-- SOLUTION
CREATE INDEX idx_orders_store_created_inc
  ON orders (store_id, created_at) INCLUDE (total_cents);

VACUUM orders;   -- refresh the visibility map so heap fetches drop to ~0

EXPLAIN (ANALYZE, BUFFERS)
SELECT created_at, total_cents FROM orders
WHERE store_id = 42
ORDER BY created_at DESC;
-- Expect: Index Only Scan, Heap Fetches: 0 (or near 0).
-- INCLUDE columns are payload: returned, not searchable.


-- ============================================================================
-- Exercise 9 — Partial index
-- TASK: Ops constantly polls "oldest PENDING orders". Index ONLY that slice.
--       Compare the partial index size with the full composite from Ex. 7
--       using \di+ or pg_relation_size.
-- ============================================================================

-- SOLUTION
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'PENDING';

EXPLAIN ANALYZE
SELECT * FROM orders
WHERE status = 'PENDING'
ORDER BY created_at
LIMIT 20;
-- The query MUST repeat the WHERE condition to qualify for the partial index.

SELECT relname, pg_size_pretty(pg_relation_size(oid))
FROM pg_class
WHERE relname IN ('idx_orders_pending', 'idx_orders_store_created');
-- Partial ≈ 1/7 of the rows → a fraction of the size, cheaper on every write.


-- ============================================================================
-- Exercise 10 — Window functions: latest order per store, and running balance
-- TASK: a) Latest order per store with ROW_NUMBER, then with DISTINCT ON.
--          EXPLAIN both — which one uses idx_orders_store_created better?
--       b) Running points balance over time for store 42.
-- ============================================================================

-- SOLUTION
-- a1) ROW_NUMBER (portable)
SELECT * FROM (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at DESC) AS rn
  FROM orders o
) t
WHERE rn = 1;

-- a2) DISTINCT ON (Postgres specialty — shorter, pairs with the composite index)
SELECT DISTINCT ON (store_id) *
FROM orders
ORDER BY store_id, created_at DESC;

-- b) Running total: SUM as a window function
SELECT created_at, amount, reason,
       SUM(amount) OVER (ORDER BY created_at) AS balance
FROM point_transactions
WHERE store_id = 42
ORDER BY created_at;


-- ============================================================================
-- Exercise 11 — OFFSET vs keyset pagination
-- TASK: Fetch "page 4,000" (20 per page) of newest-first orders with OFFSET,
--       then fetch the same region with a keyset WHERE. Compare \timing and
--       the plans. Why does OFFSET get slower the deeper you go?
-- ============================================================================

-- SOLUTION
-- OFFSET: reads and THROWS AWAY 80,000 rows first
EXPLAIN ANALYZE
SELECT id, created_at FROM orders
ORDER BY created_at DESC, id DESC
OFFSET 80000 LIMIT 20;

-- Keyset: grab a cursor row from that depth (in an app this is the last row
-- of the previous page), then:
EXPLAIN ANALYZE
SELECT id, created_at FROM orders
WHERE (created_at, id) < (now() - interval '292 days', 999999999)
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- Keyset descends the index straight to the cursor: constant work per page.
-- OFFSET's work grows linearly with page depth.
-- (Add  CREATE INDEX ON orders (created_at, id);  if the plan still sorts.)


-- ============================================================================
-- Exercise 12 — UPSERT as webhook dedupe (idempotency)
-- TASK: Insert a point transaction with reference 'tada:refund:evt_1' TWICE.
--       Make the second insert a silent no-op, and make your SQL tell you
--       whether it won (processed) or lost (duplicate).
-- ============================================================================

-- SOLUTION
INSERT INTO point_transactions (store_id, amount, reason, reference, created_at)
VALUES (42, 500, 'REFUND', 'tada:refund:evt_1', now())
ON CONFLICT (reference) DO NOTHING
RETURNING id;                       -- first run: returns the new id

-- run it again ↑ : returns ZERO rows = duplicate detected, skip processing.
-- This is the TADA double-refund fix, layer (a): dedupe at the door with a
-- unique constraint. No lock, no race — the constraint IS the guard.


-- ============================================================================
-- Exercise 13 — FOR UPDATE SKIP LOCKED: a job queue in pure Postgres
-- TASK: Open TWO psql sessions. In session 1: BEGIN, claim one job, DON'T
--       commit. In session 2: claim a job. Verify session 2 gets a DIFFERENT
--       job instantly (no waiting). What happens without SKIP LOCKED?
-- ============================================================================

-- SOLUTION (run in each session)
BEGIN;
UPDATE jobs SET status = 'running', locked_at = now()
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'queued'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING id, type, payload;        -- note the id you claimed
-- ... do the work, then mark THAT job (and only that job) done:
UPDATE jobs SET status = 'done' WHERE id = /* the id returned above */ 1;
COMMIT;
-- Without SKIP LOCKED, session 2 BLOCKS on the row session 1 locked —
-- workers would process serially. SKIP LOCKED = "take the next free counter".
-- This is exactly how pg-boss and Graphile Worker implement queues in Node.


-- ============================================================================
-- Exercise 14 (bonus) — LATERAL and a recursive CTE
-- TASK: a) Top 3 biggest orders for stores 1–5, one query (LATERAL).
--       b) The full referral chain starting from store 1, with depth
--          (stores.referred_by forms a tree).
-- ============================================================================

-- SOLUTION
-- a) LATERAL = "for each store, run this subquery"
SELECT s.id AS store_id, s.name, o.id AS order_id, o.total_cents
FROM stores s
JOIN LATERAL (
  SELECT id, total_cents FROM orders
  WHERE store_id = s.id
  ORDER BY total_cents DESC
  LIMIT 3
) o ON true
WHERE s.id <= 5;

-- b) Recursive CTE: base row UNION ALL the next level, until empty
WITH RECURSIVE chain AS (
  SELECT id, name, referred_by, 1 AS depth
  FROM stores WHERE id = 1
  UNION ALL
  SELECT s.id, s.name, s.referred_by, c.depth + 1
  FROM stores s
  JOIN chain c ON s.referred_by = c.id
  WHERE c.depth < 12                       -- cycle/depth guard
)
SELECT * FROM chain ORDER BY depth, id;


-- ============================================================================
-- Wrap-up — the production tools
-- ============================================================================

-- Which queries have cost the most total time this session?
SELECT round(total_exec_time)::text || ' ms' AS total, calls, left(query, 90) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Dead tuples / is autovacuum keeping up?
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Which of my indexes are never used? (candidates to drop — indexes tax writes)
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
