# Mock Interview Report — Skyworx Take-Home Review

- **Date:** 2026-07-07
- **Format:** take-home review simulation, tech-lead persona, 6 questions, conducted in Bahasa Indonesia (per user request), feedback after every answer (user-requested format)
- **Context:** real review meeting upcoming at PT Skyworx Indonesia (backend developer, .NET take-home)

## Questions & Results

| # | Question | Result |
|---|---|---|
| 1 | Walk me through your solution end-to-end (create pengajuan kredit) | 🟡 Listed folder structure instead of request flow; own ExceptionHandlingMiddleware not mentioned; said "resolver" (GraphQL term) |
| 2 | Hardcoded login — why, and what changes for production? | 🟡 Scope defense good; said "encrypt password" instead of **hash** (bcrypt); no refresh token or Key Vault until prompted |
| 3 | `angsuran` accepted from client — problem? | 🟡 Found the fix (compute server-side) but could not name the risk (money data integrity, derived value, untrusted client) |
| 4 | Do your two indexes serve `ORDER BY tenor DESC, plafon DESC`? | 🟡 Right conclusion, wrong reason (blamed missing DESC; real answer: two single-column indexes can't serve a two-column sort → composite index; no EXPLAIN ANALYZE) |
| 5 | What do your tests NOT cover? | 🟡 Said "negative cases" but missed the structural gap: direct controller calls skip the pipeline, so `[Range]` and `[Authorize]` are never tested; didn't name WebApplicationFactory/Testcontainers; claimed "no weird bugs" while bunga=0 → Infinity bug exists |
| 6 | Priority list before bank go-live | ❌ Put "change architecture to microservices" first — inverted priorities; omitted the bunga=0 fix and integration tests taught minutes earlier |

## Ratings

- Technical depth: **2.5/5** — components known, mechanisms fuzzy (hash vs encrypt, index mechanics, where validation runs)
- Communication & structure: **2.5/5** — answers ramble; needs frameworks (flow → risk → fix → priority)
- Senior signals: **2/5** — good: defended scope decisions, carried Q3 fix into Q6; bad: redesign-first instinct, "confident no bugs"
- Honesty under pressure: **4/5** — openly asked "why is server-side better?" when unsure; keep this

## Top 3 Improvements

1. **Memorize the 5-step request flow** (exception middleware → Serilog → JWT auth → DTO validation → controller → 201 CreatedAtAction). The opening question will be "explain your solution" — answer with the flow, not the folders.
2. **Drill the 5 costly terms:** hash vs encrypt · derived value · composite index · EXPLAIN ANALYZE · WebApplicationFactory. Cheap to memorize, expensive to get wrong at a bank.
3. **Practice the priority frame:** money correctness → auth/security → load (pagination) → tests → observability, plus the sentence "I would NOT touch the architecture — the monolith is right at this scale" (backed by the DBO story).

## Key phrases delivered (Indonesian, reusable in the real meeting)

- "Password di-hash pakai bcrypt, bukan encrypt, karena hash satu arah."
- "Angsuran itu derived value — nilai turunan tidak boleh dipercaya dari client; server yang menghitung, satu sumber kebenaran."
- "Index mengikuti query, bukan query mengikuti index — dan saya verifikasi dengan EXPLAIN ANALYZE."
- "Test saya memanggil controller langsung, jadi pipeline tidak jalan — [Authorize] dan [Range] butuh WebApplicationFactory."
- "Arsitektur tidak saya sentuh minggu ini — monolith ini benar untuk skala sekarang; yang saya perbaiki dulu adalah bug uang."

## To review before the real meeting

- `notes/skyworx/skyworx-backend-interview-prep.md` — walkthrough script + "weaknesses to own proactively" (the real meeting will mirror this session)
- `notes/dotnet-basics-for-typescript-devs.md` — middleware pipeline + testing sections
- `notes/system-design-basics-senior-fullstack-interview.md` — indexing/EXPLAIN context

## Next session

Re-run `/mock-interview skyworx` after reviewing — target: turn all 🟡 into ✅, especially Q1 (flow) and Q6 (priorities). Compare against this report.
