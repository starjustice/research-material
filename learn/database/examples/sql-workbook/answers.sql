-- Answers to workbook exercises 1 to 19. Run after seed.sql:  psql -f answers.sql
-- It changes some data (adds a constraint, claims jobs). To run it again, run seed.sql first.
-- Exercise 9 deletes inside BEGIN ... ROLLBACK, so the data stays.
SET search_path = wb; SET timezone = 'Asia/Jakarta';
\echo '== 1 revenue per store incl zero, only PAID/SHIPPED'
SELECT s.name, COALESCE(SUM(o.total), 0) AS revenue, COUNT(o.id) AS orders
FROM store s
LEFT JOIN orders o ON o.store_id = s.id AND o.status IN ('PAID','SHIPPED')
GROUP BY s.id, s.name
ORDER BY revenue DESC;
\echo '== 1 trap'
SELECT s.name, COALESCE(SUM(o.total), 0) AS revenue
FROM store s LEFT JOIN orders o ON o.store_id = s.id
WHERE o.status IN ('PAID','SHIPPED')
GROUP BY s.id, s.name ORDER BY revenue DESC;
\echo '== 2 never ordered'
SELECT s.name FROM store s
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.store_id = s.id);
\echo '== 3 latest order per store DISTINCT ON'
SELECT DISTINCT ON (store_id) store_id, id AS order_id, status, created_at
FROM orders
ORDER BY store_id, created_at DESC, id DESC;
\echo '== 3b ROW_NUMBER'
SELECT store_id, order_id, status, created_at FROM (
  SELECT store_id, id AS order_id, status, created_at,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at DESC, id DESC) AS rn
  FROM orders) t
WHERE rn = 1 ORDER BY store_id;
\echo '== 4 top 2 products by revenue per category'
WITH product_revenue AS (
  SELECT p.category_id, p.name, SUM(oi.qty * oi.unit_price) AS revenue
  FROM order_item oi
  JOIN orders o  ON o.id = oi.order_id AND o.status IN ('PAID','SHIPPED')
  JOIN product p ON p.id = oi.product_id
  GROUP BY p.category_id, p.id, p.name
), ranked AS (
  SELECT *, DENSE_RANK() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS rnk
  FROM product_revenue
)
SELECT c.name AS category, r.name AS product, r.revenue, r.rnk
FROM ranked r JOIN category c ON c.id = r.category_id
WHERE r.rnk <= 2
ORDER BY c.name, r.rnk;
\echo '== 5 running balance'
SELECT store_id, created_at::date AS day, reason, delta,
       SUM(delta) OVER (PARTITION BY store_id ORDER BY created_at, id) AS balance
FROM point_ledger
ORDER BY store_id, created_at, id;
\echo '== 6 MoM'
WITH monthly AS (
  SELECT date_trunc('month', created_at)::date AS month, SUM(total) AS revenue
  FROM orders WHERE status IN ('PAID','SHIPPED')
  GROUP BY 1
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS pct_change
FROM monthly ORDER BY month;
\echo '== 7 share of store total'
SELECT store_id, id AS order_id, total,
       ROUND(100.0 * total / SUM(total) OVER (PARTITION BY store_id), 1) AS pct_of_store
FROM orders WHERE status IN ('PAID','SHIPPED')
ORDER BY store_id, id;
SET search_path = wb; SET timezone = 'Asia/Jakarta';
\echo '== 8 islands'
WITH grouped AS (
  SELECT store_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY login_date))::int AS grp
  FROM store_login
), streaks AS (
  SELECT store_id, MIN(login_date) AS start_day, MAX(login_date) AS end_day, COUNT(*) AS days
  FROM grouped GROUP BY store_id, grp
)
SELECT DISTINCT ON (store_id) store_id, start_day, end_day, days
FROM streaks
ORDER BY store_id, days DESC, start_day;
\echo '== 8 show grp'
SELECT store_id, login_date, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY login_date) rn,
  login_date - (ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY login_date))::int AS grp
FROM store_login WHERE store_id = 1 ORDER BY login_date;
\echo '== 9 find dups'
SELECT provider, event_id, COUNT(*) AS copies, array_agg(id ORDER BY id) AS ids
FROM webhook_event GROUP BY provider, event_id HAVING COUNT(*) > 1;
BEGIN;
\echo '== 9 delete keep first'
DELETE FROM webhook_event w
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY provider, event_id ORDER BY received_at, id) AS rn
  FROM webhook_event
) d
WHERE w.id = d.id AND d.rn > 1
RETURNING w.id, w.event_id;
ROLLBACK;
\echo '== 10 pivot'
SELECT s.name,
       COUNT(*) FILTER (WHERE o.status = 'PENDING')   AS pending,
       COUNT(*) FILTER (WHERE o.status = 'PAID')      AS paid,
       COUNT(*) FILTER (WHERE o.status = 'SHIPPED')   AS shipped,
       COUNT(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled,
       COUNT(o.id)                                    AS all_orders
FROM store s LEFT JOIN orders o ON o.store_id = s.id
GROUP BY s.id, s.name ORDER BY s.id;
\echo '== 11 cohort'
WITH cohort AS (
  SELECT id AS store_id, date_trunc('month', joined_at)::date AS cohort_month FROM store
), activity AS (
  SELECT DISTINCT o.store_id,
         (EXTRACT(YEAR FROM age(date_trunc('month', o.created_at), c.cohort_month)) * 12
        + EXTRACT(MONTH FROM age(date_trunc('month', o.created_at), c.cohort_month)))::int AS month_n
  FROM orders o JOIN cohort c ON c.store_id = o.store_id
  WHERE o.status <> 'CANCELLED'
)
SELECT c.cohort_month,
       COUNT(DISTINCT c.store_id) AS stores,
       COUNT(DISTINCT a.store_id) FILTER (WHERE a.month_n = 0) AS m0,
       COUNT(DISTINCT a.store_id) FILTER (WHERE a.month_n = 1) AS m1,
       COUNT(DISTINCT a.store_id) FILTER (WHERE a.month_n = 2) AS m2
FROM cohort c LEFT JOIN activity a ON a.store_id = c.store_id
GROUP BY c.cohort_month ORDER BY c.cohort_month;
\echo '== 12 recursive'
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, name::text AS path, 1 AS depth
  FROM category WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.path || ' > ' || c.name, t.depth + 1
  FROM category c JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10
)
SELECT id, path, depth FROM tree ORDER BY path;
\echo '== 13 median p90'
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY total) AS median,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY total) AS p90,
       ROUND(AVG(total), 2) AS mean
FROM orders WHERE status IN ('PAID','SHIPPED');
\echo '== 14 7 day moving avg over full calendar'
WITH days AS (
  SELECT d::date AS day FROM generate_series('2026-02-01'::date, '2026-02-21'::date, interval '1 day') d
), daily AS (
  SELECT d.day, COALESCE(SUM(o.total), 0) AS revenue
  FROM days d
  LEFT JOIN orders o ON o.created_at::date = d.day AND o.status IN ('PAID','SHIPPED')
  GROUP BY d.day
)
SELECT day, revenue,
       ROUND(AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) AS avg_7d
FROM daily ORDER BY day;
\echo '== 15 jsonb'
SELECT payload->>'type' AS type, COUNT(*) AS events, SUM((payload->>'amount')::int) AS amount
FROM (SELECT DISTINCT ON (provider, event_id) * FROM webhook_event ORDER BY provider, event_id, received_at) e
GROUP BY 1 ORDER BY 1;
SELECT COUNT(*) FROM webhook_event WHERE payload @> '{"type":"refund"}';
\echo '== 16 upsert daily stats, run twice'
INSERT INTO daily_store_stats (store_id, day, order_count, revenue)
SELECT store_id, created_at::date, COUNT(*), SUM(total)
FROM orders WHERE status IN ('PAID','SHIPPED') AND created_at::date = '2026-03-15'
GROUP BY store_id, created_at::date
ON CONFLICT (store_id, day) DO UPDATE
SET order_count = EXCLUDED.order_count,
    revenue     = EXCLUDED.revenue;
INSERT INTO daily_store_stats (store_id, day, order_count, revenue)
SELECT store_id, created_at::date, COUNT(*), SUM(total)
FROM orders WHERE status IN ('PAID','SHIPPED') AND created_at::date = '2026-03-15'
GROUP BY store_id, created_at::date
ON CONFLICT (store_id, day) DO UPDATE
SET order_count = EXCLUDED.order_count,
    revenue     = EXCLUDED.revenue;
SELECT * FROM daily_store_stats;
\echo '== 17 claim jobs'
WITH next_jobs AS (
  SELECT id FROM job
  WHERE status = 'queued' AND run_at <= now()
  ORDER BY run_at
  LIMIT 2
  FOR UPDATE SKIP LOCKED
)
UPDATE job j SET status = 'running', locked_by = 'worker-1'
FROM next_jobs n WHERE j.id = n.id
RETURNING j.id, j.kind;
\echo '== 18 idempotent ledger'
ALTER TABLE point_ledger ADD CONSTRAINT point_ledger_source_uniq UNIQUE (reason, source_id);
INSERT INTO point_ledger (id, store_id, delta, reason, source_id, created_at)
VALUES (9, 3, 200, 'REFUND', 'tada:evt_78', now())
ON CONFLICT (reason, source_id) DO NOTHING
RETURNING id;
INSERT INTO point_ledger (id, store_id, delta, reason, source_id, created_at)
VALUES (10, 3, 200, 'REFUND', 'tada:evt_78', now())
ON CONFLICT (reason, source_id) DO NOTHING
RETURNING id;
\echo '== 19 keyset page 1'
SELECT id, store_id, created_at FROM orders
ORDER BY created_at DESC, id DESC LIMIT 4;
\echo '== 19 keyset page 2'
SELECT id, store_id, created_at FROM orders
WHERE (created_at, id) < ('2026-03-03 16:00+07', 6)
ORDER BY created_at DESC, id DESC LIMIT 4;
\echo '== guarded update'
UPDATE orders SET status = 'SHIPPED' WHERE id = 3 AND status = 'PAID' RETURNING id;
UPDATE orders SET status = 'SHIPPED' WHERE id = 3 AND status = 'PAID' RETURNING id;
