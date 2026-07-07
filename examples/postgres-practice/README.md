# PostgreSQL Query Practice Playground

Hands-on companion to `notes/postgresql-queries-interview-guide.md`.
One Postgres 16 container, three seeded tables shaped like the DBO platform
(stores / orders / point_transactions, plus a jobs table), and 14 exercises.

Seed sizes: 1,000 stores · 100,000 orders · 200,000 point transactions —
enough rows that EXPLAIN plans actually change when you add an index.

## Run it

```bash
cd examples/postgres-practice
docker compose up -d          # first start runs seed.sql (takes ~10s)
docker compose exec db psql -U practice practice
```

Inside psql, first thing:

```
\timing on
```

`\timing` prints each query's wall-clock time — you want to *see* 20ms drop to 0.1ms.

Other useful psql commands:

- `\d orders` — table + indexes
- `\di+` — all indexes with sizes
- `\x` — expanded output (nice for EXPLAIN and wide rows)

## Suggested order

Work through `exercises.sql` top to bottom. Each exercise is a TASK comment —
try it before reading the SOLUTION below it.

1. **1–4: joins & aggregation.** LEFT vs INNER, the LEFT JOIN + WHERE trap, anti-joins, FILTER/HAVING.
2. **5–7: the burn topic.** Read a bad plan, replay the mock-interview question (two single indexes vs one composite for `ORDER BY a DESC, b DESC LIMIT 1`), then fix the store-timeline query. This is the core — repeat until the EXPLAIN output is boring.
3. **8–9: covering & partial indexes.** Index Only Scan, indexing a hot slice.
4. **10–11: windows & pagination.** ROW_NUMBER vs DISTINCT ON, OFFSET vs keyset with timings.
5. **12–13: production patterns.** UPSERT webhook dedupe, SKIP LOCKED job queue (needs two psql sessions — open a second terminal and run the same `psql` command).
6. **14 + wrap-up: LATERAL, recursive CTE, pg_stat_statements.**

## Reset

```bash
docker compose down -v && docker compose up -d
```

`-v` drops the data volume, so the seed runs fresh (indexes you created are gone too).

## Notes

- Postgres listens on host port **5433** (to avoid clashing with a local Postgres):
  `psql postgres://practice:practice@localhost:5433/practice`
- `pg_stat_statements` is preloaded and created by the seed, so the wrap-up
  queries work out of the box.
- Random seeds mean your exact row counts and timings differ — the plan
  *shapes* (Seq Scan → Index Scan Backward, Sort disappearing) are what matter.
