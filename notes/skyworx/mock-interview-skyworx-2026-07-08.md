# Mock Interview Report — Skyworx Take-Home Review (Session 2)

- **Date:** 2026-07-08
- **Format:** take-home review simulation, tech-lead persona, 6 questions, conducted in Bahasa Indonesia, feedback after every answer
- **Context:** repeat session, directly targeting weak spots from [2026-07-07 session](mock-interview-skyworx-2026-07-07.md)

## Questions & Results (vs previous session)

| # | Question | 2026-07-07 | 2026-07-08 | Trend |
|---|---|---|---|---|
| 1 | Walk me through the request flow | 🟡 listed folders, not flow | ✅ full correct flow, right terms (JWT validation, [Authorize] implied, DTO check, 201) | **Improved** |
| 2 | Hash vs encrypt, and why | 🟡 said "encrypt" by mistake | 🟡 correct terms and correct login mechanism (hash input, compare, no decrypt), but "why" still generic ("bisa dibobol") — missing: one leaked key exposes ALL passwords (encrypt) vs no key exists at all, brute-force cost (hash) | **Improved** |
| 3 | What kind of value is `angsuran`, and why is it dangerous from client | 🟡 found the fix, no risk vocabulary | 🟡 gave "single source of truth" + "client can't be trusted" (real improvement) but still never said the term **derived value** | **Improved** |
| 4 | Composite index reasoning | 🟡 wrong reason (blamed missing DESC) | 🟡→✅ correct reason this time (single-column indexes only serve single-column queries), correct fix (composite index) — still missing the backward-scan mechanism explanation and EXPLAIN ANALYZE as the verification step | **Improved clearly** |
| 5 | What does calling `controller.Create()` directly skip | 🟡 vague "negative case," insight didn't surface | ✅→🟡 the core insight appeared unprompted this time ("test DTO validation input yang tidak dapat dijalankan") — missing: naming `[Authorize]`/`[Range]` explicitly and naming WebApplicationFactory/Testcontainers as the fix | **Improved significantly** |
| 6 | First priority before bank go-live | ❌ led with "redesign to microservices" | 🟡 did NOT repeat the architecture mistake, and the bunga=0 bug (taught in Q5 last session) was remembered and carried into the answer — but still buried mid-list, not stated as the opening sentence; led with requirement-clarification/new auth service instead | **Improved, but core issue (answer-first structure) not yet fixed** |

## Ratings (vs previous session)

| Dimension | 07-07 | 07-08 | Note |
|---|---|---|---|
| Technical depth | 2.5 | **3.5** | Mechanisms are now correct across the board (hash flow, index diagnosis, validation gap); precision vocabulary still lags the reasoning |
| Communication & structure | 2.5 | **3** | Q1 flow answer was clean; Q3/Q6 still follow "context first, conclusion last" — needs inverting |
| Senior signals | 2 | **3** | Carried the bunga=0 bug forward into Q6 unprompted — real evidence of learning between sessions. Habit of "clarify requirements" before "fix known bug" still surfaces |
| Honesty under pressure | 4 | **4** | Consistent, no overclaiming — no change needed here |

## Top 3 Improvements (this session)

1. **Answer-first structure for "what's first / what's the priority" questions.** The candidate's pattern is always context → conclusion. Drill: force the first sentence to BE the answer ("Yang saya lakukan pertama adalah X, karena Y"), details after. This single habit change would have converted every 🟡 today into a ✅.
2. **Attach the precision vocabulary that's still missing even though the reasoning is right:** *derived value* (Q3), `[Authorize]`/`[Range]` named explicitly (Q1/Q5), `EXPLAIN ANALYZE` (Q4), `WebApplicationFactory`/`Testcontainers` named explicitly (Q5). Cheapest possible fix — the understanding is already there.
3. **Deepen the hash-vs-encrypt "why" one more level:** one leaked encryption key exposes every password at once; hashing has no key to leak at all, so a leaked DB only gives an attacker hashes to brute-force — and bcrypt is deliberately slow to make that expensive.

## Key phrases delivered this session (reusable, Indonesian)

- "Authentication dulu baru authorization — karena tidak bisa authorize orang yang belum diketahui identitasnya." (candidate's own Q1 framing, worth reusing)
- "Index single-column hanya melayani query satu kolom — untuk ORDER BY dua kolom butuh composite index." (Q4, correct this time)
- "Test saya memanggil controller langsung, jadi validasi input tidak pernah benar-benar dijalankan." (Q5 — the core insight, now internalized)

## Ideal answer given for Q6 (still owed to the candidate)

> "Yang saya perbaiki pertama adalah bug uang yang sudah saya tahu ada: bunga = 0% menghasilkan pembagian dengan nol di rumus anuitas — itu bug correctness yang menyangkut uang nasabah, jadi prioritas nomor satu. Klarifikasi requirement dan fitur tambahan itu perlu, tapi paralel — bukan sebelum memperbaiki bug yang sudah diketahui di kode yang sudah ada."

## To review before the real meeting

- Same as last time: `notes/skyworx/skyworx-backend-interview-prep.md`, `notes/dotnet-basics-for-typescript-devs.md`, `notes/system-design-basics-senior-fullstack-interview.md`
- New: `notes/postgresql-queries-interview-guide.md` — has the exact composite-index/EXPLAIN ANALYZE material Q4 needs

## Next session

Overall trend across two sessions is clearly upward — every single question improved, none regressed. The one remaining structural issue is answer ordering (conclusion-first), not technical understanding. Re-run once more, prioritizing: state the answer in sentence one for every question, and land the 5 vocabulary terms listed above by name. If those two things land, this submission is ready for the real meeting.
