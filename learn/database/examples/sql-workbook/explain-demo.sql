SET search_path = wb;
DROP TABLE IF EXISTS big_orders;
CREATE TABLE big_orders AS
SELECT g AS id, (g % 5000) + 1 AS store_id,
       (ARRAY['PENDING','PAID','SHIPPED','CANCELLED'])[1 + g % 4] AS status,
       (random()*1000000)::numeric(12,2) AS total,
       timestamptz '2025-01-01' + (g * interval '37 seconds') AS created_at
FROM generate_series(1, 1000000) g;
ALTER TABLE big_orders ADD PRIMARY KEY (id);
VACUUM ANALYZE big_orders;
\echo '== before'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING ON) SELECT id, status, total, created_at FROM big_orders WHERE store_id = 42 ORDER BY created_at DESC LIMIT 20;
CREATE INDEX big_orders_store_recent ON big_orders (store_id, created_at DESC);
\echo '== after'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, status, total, created_at FROM big_orders WHERE store_id = 42 ORDER BY created_at DESC LIMIT 20;
\echo '== offset deep'
EXPLAIN (ANALYZE, COSTS OFF) SELECT id FROM big_orders ORDER BY id LIMIT 20 OFFSET 900000;
\echo '== keyset deep'
EXPLAIN (ANALYZE, COSTS OFF) SELECT id FROM big_orders WHERE id > 900000 ORDER BY id LIMIT 20;
