# Mock Interview — Bank Mandiri Final Round (Senior Manager, ex-developer)

- **Date:** 2026-07-29
- **Prep source:** [bank-mandiri-final-round-senior-manager.md](bank-mandiri-final-round-senior-manager.md)
- **Previous session:** [mock-interview-bank-mandiri-2026-07-28.md](mock-interview-bank-mandiri-2026-07-28.md) (Department Head round)
- **Format:** 6-question live mock — persona: senior manager, ex-developer, superior of the two prior interviewers.

## Questions asked

1. Perkenalan diri dan alasan memilih backend.
2. Kasus performa nyata (proses CSV bulk di DBO) — gejala, cara ukur, hasil. *(follow-up: bagaimana Anda tahu bottleneck-nya di situ?)*
3. Bagaimana memastikan data tetap benar saat ada request bersamaan. *(follow-up: pernah mengalami ini di production nyata?)*
4. Kenapa Node/TypeScript dulu, dan kapan Java lebih masuk akal? *(follow-up: momen konkret di mana Node terasa kurang?)*
5. Satu keputusan teknis yang sekarang akan Anda lakukan berbeda.
6. Kenapa kami harus memilih Anda?

## Answer quality summary — improvement vs. 2026-07-28 session

**Confirmed improvement:** the 2026-07-28 report flagged that idempotency/duplicate-handling answers were buried behind vague framing ("event-driven architecture") for three follow-ups before the real mechanism surfaced. **This session, the same topic was answered correctly on the first pass** — row-level locking, idempotency key, broker dedup, named immediately, followed by a strong, specific TADA incident story with the correct mitigate-first instinct. This is the clearest fixed weakness across sessions.

**Recurring pattern, different question:** the earlier report flagged the "why Mandiri / 5 years" closing answer as generic and unstructured. This session's closing question ("why should we hire you") **fell into the same pattern** — a list of soft-skill traits (responsible, adaptable, curious) instead of concrete evidence. The specific question changed; the underlying weakness (closing answers lack structure and concrete proof points) did not.

**New observation:** when asked to justify Java's advantages, the candidate's answer shifted into recited textbook language (multi-threading, compile-time checking, built-in security) rather than personal reasoning. When pushed for a concrete personal example, the candidate answered honestly ("tidak pernah") rather than fabricating a scenario — good instinct, but the underlying answer stayed weak.

**Strong, real technical judgment shown:** the CSV bulk-processing fix (background worker + batched retry) and the microservice-split regret (should have separated webhook/order-heavy paths and added Redis caching, tied to a real high-load incident) were both concrete, specific, and showed genuine architectural thinking — not textbook answers.

## Scorecard

| Question | Result |
|---|---|
| Perkenalan diri | ✅ strong — consistent with prior rounds, non-templated reasoning for choosing backend |
| Performance case (CSV bulk processing) | 🟡 partial — excellent fix, skipped the measurement step until prompted |
| Concurrent correctness / idempotency | ✅ strong — **fixed the recorded weakness from 2026-07-28**; led with mechanism, strong real incident follow-up |
| Node vs Java reasoning | 🟡 partial — grounded on the Node side, textbook-sounding on the Java side |
| Technical decision regret (microservice split) | ✅ strong — concrete, tied to a real high-load incident |
| Why should we hire you | 🟡 partial — generic trait list, missed available concrete differentiators |

**Ratings (1-5):**
- Technical depth: 4/5 — idempotency answer was genuinely senior-level and held under a follow-up; performance story needed prompting to reach measurement
- Communication & structure: 3.5/5 — excellent structure in the idempotency answer (numbered mechanisms); no structure in the closing answer
- Senior signals: 4/5 — real ownership in the TADA story, real structural judgment in the architecture-regret answer, honest self-assessment on the Java gap
- Honesty under pressure: 4/5 — said "tidak pernah" rather than inventing a scenario when pushed on Java

## Top 3 improvements

1. Rebuild "why should we hire you" around three concrete proof points (Unloan's regulated banking environment, the TADA incident, the .NET ecosystem-switch) instead of a list of traits.
2. When explaining "why Java," avoid reciting textbook advantages — pair honesty about the gap with what's actively being done about it (studying the Java/Spring note).
3. Lead performance stories with how the problem was measured, before describing the fix.

## What to review

- [choosing-the-right-tool-frontend-backend-decisions.md](../choosing-the-right-tool-frontend-backend-decisions.md) — for a sharper, non-textbook "why Java" answer
- [bank-mandiri-final-round-senior-manager.md](bank-mandiri-final-round-senior-manager.md) §6 — the "why hire you" model answer with concrete proof points
- [performance-optimization-web-mobile-backend.md](../performance-optimization-web-mobile-backend.md) §1 — measure-first framing
