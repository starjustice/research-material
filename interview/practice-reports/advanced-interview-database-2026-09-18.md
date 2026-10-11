# Advanced Interview Report — Database Internals

**Date:** 2026-09-18
**Level:** Senior (international bar)
**Mode:** interview
**Topic:** database

## Depth map

| # | Question | Layer reached |
|---|---|---|
| 1 | What `CREATE INDEX` builds physically | L1 |
| 2 | Why MVCC lets a reader and writer avoid blocking | L1 |
| 3 | WAL / durability on crash after `COMMIT` | L1 |
| 4 | Why the planner might ignore an existing index | L1 (no attempt) |
| 5 | Why `OFFSET` pagination gets slower with page depth | L1 |
| 6 | Debugging a slow ORM-generated query | **L2** (best of the round) |

No question reached L3 (theory — "why this structure is the right tradeoff for the hardware/workload").

## What happened, per question

**Q1 — Index mechanism.** Named "B-tree" correctly but could not describe the leaf/internal-node structure, the TID pointer back to the heap, or the build cost. Skipped the follow-up rather than guessing.

**Q2 — MVCC.** Got the right conclusion (reader and writer don't block) from instinct/experience, but explained it as "we don't lock the API" — describing the absence of a lock, not the actual mechanism (row versions + snapshots). Skipped the follow-up.

**Q3 — WAL/durability.** "It saves the data" — no concept of a write-ahead log, no idea that durability is tied to an fsync'd log record rather than the table file being current.

**Q4 — Planner ignoring an index.** No attempt.

**Q5 — OFFSET pagination.** Reached for practical fixes (caching, selecting fewer fields) without diagnosing the cause. When pushed on the mechanism, guessed Postgres jumps directly to the offset row — the opposite of what happens (it scans and discards every preceding row).

**Q6 — Debugging a slow ORM query.** Strongest answer of the round: correctly named N+1 queries, over-joining, and unbounded selects as real causes from direct experience, and knew Prisma's generated SQL can be logged. Stalled one step short of naming `EXPLAIN ANALYZE` as the tool to confirm *why* a query is slow.

## Ratings (1–5)

- Depth of mechanism: **1/5**
- Quantitative reasoning: **1/5** — no numbers volunteered anywhere
- Tradeoff judgment: **2/5** — credit from Q6
- Failure-mode awareness: **2/5** — credit from Q6 (N+1, over-joining)
- Drove the conversation: **1/5** — mostly "skip" instead of a reasoned guess
- Communication in English: **3/5** — understandable, answers too short to show structure

## Level read

**Reads as junior-to-mid, not senior, at an international bar.** The genuine strength — hands-on ORM query debugging — is real and worth building on, but stalled one command short of the senior version of that answer. Every other question tested "how does Postgres actually work," and there was no fallback mental model to reach for. This is learnable and none of it is exotic, but as-is this round would not clear a senior DB-adjacent loop at a global company.

## Top 3 gaps, ranked

1. **No mental model for how Postgres physically works** — B-tree structure, MVCC, WAL. Comes up in nearly every backend-leaning senior loop in some form.
2. **Doesn't know `EXPLAIN ANALYZE`.** Highest-leverage fix available — the instinct to investigate is already there; missing the one command that confirms *why*.
3. **Skipping instead of reasoning out loud.** "I don't know, here's my best guess and why" scores real points internationally. A bare "skip" reads as passive, not humble.

## Full model answers

**Q1.** Postgres builds a separate B+tree: internal nodes hold routing keys, leaf nodes hold `(value, TID)` pairs where TID points to the row's physical location in the heap (page + offset). Leaves are linked to siblings for fast range scans. Building it requires sorting the full column first (external merge sort if needed), which is why a plain `CREATE INDEX` locks writes and `CONCURRENTLY` exists.

**Q2.** Postgres never updates in place — `UPDATE` writes a new row version and marks the old one's `xmax`. Every transaction reads against a snapshot of "what was committed when I started," so a reader keeps seeing the old version while a writer creates a new one — no shared bytes, no need to block. Only two writers on the same row block each other.

**Q3.** Every change is written to the WAL before the data page is touched; `COMMIT` isn't acknowledged until that WAL record is fsync'd. Data pages can stay dirty in memory and flush later at a checkpoint — on crash, Postgres replays the WAL to reconstruct anything not yet flushed. Durability lives in the log, not the table file.

**Q4.** Any two of: stale statistics (`ANALYZE` needed), low selectivity (a sequential scan can be cheaper than many random index lookups), a function/cast on the filtered column needing an expression index, or a leading wildcard `LIKE` that a B-tree can't serve. Proof: `EXPLAIN (ANALYZE, BUFFERS)`, comparing estimated vs. actual rows.

**Q5.** Postgres has no random row-access — `OFFSET 100000` means scanning and discarding 100,000 rows before returning the next 20. That discard cost grows linearly with the offset. Fix: keyset/cursor pagination — `WHERE (created_at, id) < ($last, $lastId) ORDER BY created_at DESC, id DESC LIMIT 20` with a matching composite index — turns every page into a fast index seek regardless of depth, at the cost of arbitrary page jumps.

**Q6.** `EXPLAIN ANALYZE` (or `EXPLAIN (ANALYZE, BUFFERS)`) executes the query and reports, per plan node: estimated vs. actual rows, time spent, and (with `BUFFERS`) cache vs. disk reads. A big estimate/actual gap means stale stats; an unexpected sequential scan points at Q4's causes.

## Re-test next session

- All six questions above
- Join algorithms: hash join vs. nested loop vs. merge join, and when the planner picks each (not reached this session)
- Push for L3 on at least the index question: *why* a B+tree specifically, tied to disk page size and fanout
