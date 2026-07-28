# Mock Interview — Bank Mandiri DDL (Department Head)

- **Date:** 2026-07-28
- **Prep source:** [bank-mandiri-ddl-interview-prep.md](bank-mandiri-ddl-interview-prep.md)
- **Format:** 6-question live mock (1 warm-up/intro, 3 core deep-dives, 1 AKHLAK/behavioral, 1 closing) — first session for this topic, no prior baseline.

## Questions asked

1. Perkenalan diri — latar belakang teknis dan proyek unggulan.
2. Unloan (home loan app, under CBA Australia) — bagian mana yang paling sensitif dari sisi data correctness/reliability? *(follow-up x2: pushed past the security-only answer to the actual dedup/idempotency mechanism)*
3. AKHLAK — pilih satu nilai, beri cerita nyata.
4. Bagaimana menangani junior engineer yang code review-nya sering menghasilkan bug berulang?
5. Kenapa tertarik Bank Mandiri / divisi DDL, dan visi 3-5 tahun ke depan?

## Answer quality summary

- **Strong:** self-intro (clear stack/project coverage), AKHLAK/Amanah story (real TADA double-refund incident — matches prep note exactly, concrete and honest).
- **Partial:** Unloan reliability question — answered PII/security first (off-topic), then gave a vague "event driven architecture" non-answer, and only on a third, narrowly-scoped prompt produced the actually strong answer (Azure Service Bus duplicate detection, DB unique constraints, idempotency key/UUID to external APIs). Knowledge is solid but doesn't surface on the first pass. Mentoring answer showed good diagnostic instinct (pair programming to isolate root cause) but stayed abstract, no concrete outcome. "Why Mandiri / 5 years" answer hit real points (BUMN long-term vision, Kopra/B2B fit) but the 5-year part drifted into a general opinion on AI's effect on the SE field instead of the concrete growth narrative the prep note templates.
- **Missed/weak pattern:** repeatedly answering an adjacent topic before the asked one — happened on Q2 (security instead of reliability) and partly on Q5 (AI-and-the-future tangent instead of a Mandiri-specific 5-year answer).

## Scorecard

| Question | Result |
|---|---|
| Tell me about yourself | 🟡 partial — good content, listy, no explicit link to "why DDL" at the close |
| Unloan reliability/idempotency | 🟡 partial — strong knowledge, surfaced only after 2 follow-ups |
| AKHLAK — Amanah | ✅ strong — concrete TADA story |
| Mentoring junior engineer | 🟡 partial — good instinct, no concrete outcome |
| Why Mandiri/DDL + 5 years | 🟡 partial — relevant points but 5-year answer off-target |

**Ratings (1-5):**
- Technical depth: 3/5 — real knowledge, slow to surface
- Communication & structure: 3/5 — answers often start on an adjacent topic before landing on the actual question; no consistent STAR shape
- Senior signals: 3.5/5 — TADA story and mentoring diagnostic show real ownership; "why Mandiri" close needed to be more decisive
- Honesty under pressure: not directly tested — noted tendency to answer an adjacent topic rather than ask a clarifying question when a question was ambiguous

## Top 3 improvements

1. Answer the question actually asked, first — restate it mentally before responding. Q2 opened with PII/security when reliability was asked.
2. Lead technical answers with the specific mechanism (idempotency key, unique constraint, dedup), not the category ("event driven architecture"). The mechanism should be sentence one, not revision three.
3. Land the "why this company / 5 years" answer on the prepped template (scale/impact → fit → domain → concrete growth statement) rather than pivoting to a general industry opinion.

## What to review

- [bank-mandiri-ddl-interview-prep.md](bank-mandiri-ddl-interview-prep.md) — "Kenapa Bank Mandiri?" and "Di mana Anda 5 tahun ke depan?" sections.
