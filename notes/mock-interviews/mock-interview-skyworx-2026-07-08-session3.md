# Mock Interview Report — Skyworx Take-Home Review (Session 3)

- **Date:** 2026-07-08 (second session same day)
- **Format:** take-home review simulation, tech-lead persona, 6 **new** questions (no repeats from sessions 1–2), Bahasa Indonesia, feedback after every answer
- **Purpose:** widen coverage beyond the six previously drilled topics — test formula/precision, logging design, caching, deployment, concurrency, leadership

## Questions & Results (all new topics)

| # | Topic | Result | Key gap |
|---|---|---|---|
| 1 | decimal vs double for money (annuity/Math.Pow) | 🟡 | Correct core reason (Math.Pow needs double, rounded at end) but too short; missed *binary float vs base-10 decimal* explanation and **MidpointRounding** |
| 2 | Logging design to debug one customer's failure | 🟡 | Good diagnosis + Sentry + PII masking; missed the key concept **correlation/request id** and structured (queryable) logging |
| 3 | Caching in a credit system (Soal 6) | 🟡 (strongest) | read-heavy vs write-heavy instinct correct; missed that financial state must not be cached for **correctness, not efficiency**, and "measure before caching" |
| 4 | Zero-downtime schema migration (Soal 7) | 🟡 | Right instincts (rolling, backup, FK order) but scattered; missed the named pattern **expand → migrate → contract** and why (old+new code run together) |
| 5 | Concurrency: two admins edit same row | 🟡 | "Last write wins" correct; proposed row locking (relevant but not ideal for human UI edits) — missed **optimistic concurrency + 409**, and the stale-data trap in locking |
| 6 | Code review of a junior (leadership) | 🟡 | Technical mechanics present; the human dimension the question tested (explain why, ask don't command, positive-first, blocking vs nit) was thin; also over-commenting advice is an anti-pattern |

## Ratings

| Dimension | Score | Note |
|---|---|---|
| Technical depth | 3.5/5 | Consistent with session 2; instincts right almost everywhere, the "why" is one layer short |
| Communication & structure | 3/5 | Answers still ramble (Q4 worst); conclusion often mid-answer, not first |
| Senior signals | 3/5 | Good: "measure first" appeared, links to real experience possible; weak: named patterns not automatic |
| Honesty | 4/5 | Consistently honest about limits, no fabrication |

## The recurring pattern across all 3 sessions

**The candidate understands the concepts but does not yet reflexively use the named terms.** Session 1–2: *derived value, composite index, WebApplicationFactory*. Session 3: *correlation id, expand-contract, optimistic concurrency, read-heavy/write-heavy, MidpointRounding*. Same root issue — reasoning is sound, vocabulary lags. This is the single highest-leverage fix: memorize the pattern names, because they are what signal senior-level to a reviewer.

## Top 3 Improvements

1. **Memorize the 5 pattern-names missed this session:** correlation/request id · expand → migrate → contract · optimistic concurrency (409) · read-heavy vs write-heavy · MidpointRounding. The understanding is already there.
2. **Tighten long answers** — Q4 jumped between backup, type change, FK order, instances. Drill: one core sentence first ("the schema must be compatible with both old and new code at once"), then details.
3. **For leadership questions, answer the human side, not the technical side** — "so the junior isn't discouraged" tests empathy/communication. Frame: praise first → explain the *why* → ask don't command → separate blocking from nits.

## Model answers to internalize (Indonesian)

- decimal/double: "decimal basis-10 simpan angka persis; double floating point biner punya error kecil. Math.Pow butuh double, error jauh di bawah 1 sen, saya Round di akhir. Kebijakan pembulatan = MidpointRounding, keputusan bisnis."
- Logging: "request id di-generate di middleware awal, ikut setiap baris log sampai DB dan pihak ketiga — filter satu request instan. Plus structured logging queryable dan PII masking."
- Caching: "cache read-heavy jarang ditulis (suku bunga). Jangan cache data uang yang harus konsisten — bukan soal resource, tapi data basi bikin keputusan salah. Ukur dulu sebelum pasang Redis."
- Migration: "skema harus kompatibel dengan kode lama dan baru sekaligus (rolling). Expand-contract: tambah kolom → tulis dua-duanya + backfill → hapus kolom lama di deploy terpisah. Additive aman, destruktif bertahap."
- Concurrency: "lost update. Optimistic concurrency: kolom versi, kalau berubah sejak dibuka → DbUpdateConcurrencyException → 409, minta reload. Locking untuk transaksi cepat otomatis (spt TADA), optimistic untuk edit UI manusia."

## Progress across sessions

- Session 1: 0 clean passes, 1 fail (Q6 priorities), redesign-first mistake, "encrypt password" error.
- Session 2: Q1 clean pass, all others improved, no fails, carried prior fixes forward.
- Session 3 (new topics): all 🟡 — solid baseline on unseen questions, same vocabulary-lag pattern, no fails.
- **Trend: technical understanding is interview-ready; the gap is now purely (a) naming patterns and (b) answer structure (conclusion-first).** Both are polish, not knowledge gaps.

## Next session

Re-drill mixing old + new questions. Target: land the pattern-name for every answer in sentence 1–2, and open every "how/priority" question with the conclusion. If those two habits stick, the candidate is ready for the real meeting.
