# SQL Workbook Practice Database

Companion to [advanced-sql-workbook.md](../../advanced-sql-workbook.md). A tiny DBO-style database with 5 stores, 11 orders, a points ledger, logins, webhook events with duplicates, and a job table.

## Run it

```bash
docker run --name pg-workbook -e POSTGRES_PASSWORD=pw -p 5432:5432 -d postgres:18
docker cp seed.sql pg-workbook:/seed.sql
docker exec -it pg-workbook psql -U postgres -f /seed.sql
docker exec -it pg-workbook psql -U postgres
```

At the start of every session in `psql`:

```sql
SET search_path = wb;
SET timezone = 'Asia/Jakarta';
```

## Files

| File | What it is |
|---|---|
| `seed.sql` | Creates schema `wb` and loads the data. Safe to run again, it drops and rebuilds. |
| `answers.sql` | The answers to exercises 1 to 19. Try them yourself first. Run `seed.sql` again before a second run, because exercise 18 adds a constraint. |
| `explain-demo.sql` | Builds a 1,000,000 row table and shows the before and after EXPLAIN plans for the index and keyset pagination examples. Takes about 20 seconds. |

Checked on 2026-10-16 with PostgreSQL 16.
