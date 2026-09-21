# The International Bar — what changes when you apply outside Indonesia

Context for calibration and feedback. **Company specifics (process, levels, comp, visa/EOR policy) change constantly and vary per company — verify with web search for the actual company before stating them as fact in a session.** What's below is the structural difference between a typical local-market loop and a global one.

---

## The loop you're preparing for

A senior full-stack loop at an international company is usually 4–6 stages:

1. **Recruiter screen** (20–30 min) — motivation, timezone/location, notice period, salary expectations. Low technical content, non-zero rejection rate.
2. **Technical phone screen** (45–60 min) — coding, live, with someone who will interrupt. Sometimes a take-home instead.
3. **Coding rounds** (1–2) — algorithms and/or practical implementation. Correctness *and* communication.
4. **System design** (1, sometimes 2 at staff) — the round that decides your level more than any other.
5. **Behavioral / values** — structured, rubric-scored. Not small talk.
6. **Hiring manager / bar raiser / cross-functional** — scope, ownership, judgment.

**Two structural facts to internalize:**
- **Your level is decided in the loop, not by your title.** "Senior" at a 40-person local company and "Senior" at a global one are different scopes; the loop calibrates you, and system design plus behavioral scope are what move the number.
- **Every interviewer writes independent written feedback against a rubric** before seeing anyone else's. One vague round isn't offset by a great one with the same person. Consistency across rounds matters more than a single peak.

---

## The eight habits that cost candidates a level

These are the behaviors to flag in a scorecard. None of them are about knowledge — they're about how the answer is delivered, and they're the fastest points to win back.

1. **Answering only what was asked.** Local interviews often reward concise deference. International loops read it as lack of ownership. If asked "how would you scale this?", a senior also says what breaks first, what they'd measure, and what they'd defer. **Volunteer the next two steps.**
2. **Not driving.** At senior+, silence from the interviewer is a test, not a pause. Propose the scope, state your assumptions, and check in ("I'll assume 10M users and reads dominating — shall I go deeper on the storage layer or the API?").
3. **No numbers.** "It will be slow" vs "three serial cross-region calls at ~80ms each is 240ms before any work." Estimate out loud, and say when you're guessing.
4. **Naming tools instead of mechanisms.** "We'd use Kafka and Redis" scores nothing. *Why a partitioned log, what it costs you, what you'd use instead.*
5. **Thinking silently.** If you go quiet for 30 seconds the interviewer has nothing to score. Narrate: "I'm weighing fan-out on write against read-time assembly — the tradeoff is celebrity accounts."
6. **Hiding uncertainty.** "I don't know Kafka's internals well; here's how I'd reason about it, and here's what I'd verify" is a *strong* answer in these loops. Bluffing is the actual disqualifier, and experienced interviewers detect it in one follow-up.
7. **Under-claiming your own work.** "We built it" and "I helped with" erase you. Say what *you* decided, what you owned, what the result was in numbers. This isn't bragging in an international rubric — it's the evidence the interviewer is required to write down.
8. **Behavioral answers without structure or metrics.** A story with no result is a story with no score.

---

## Behavioral rounds are technical rounds with a different rubric

Structured and scored, usually against explicit company values (Amazon's Leadership Principles are the well-known example; most large companies have an equivalent). Expect: "tell me about a time you disagreed with a decision", "a project that failed", "how you handled an underperforming teammate", "a time you had to choose speed over quality".

**STAR, with the international weighting:**
- **S/T** — 20% of the airtime. Just enough context.
- **A** — 60%. What **you** personally did, the options you weighed, the call you made and why. "I" not "we".
- **R** — 20%, **with a number** (latency down X%, incidents down from Y to Z, deploy time from hours to minutes, N engineers onboarded) **and what you'd do differently**.

At senior+, prepare stories that show: influencing without authority, a decision you got wrong and what you changed, mentoring someone concretely, and pushing back on a stakeholder with data.

**Prepare 6–8 stories, not 20.** Each strong story answers three or four different prompts. Write them down with the numbers in them; recalling metrics live is where most people fail.

---

## Communicating in English under technical pressure

Fluency is not being tested — **clarity is.** Simple, structured, and confident beats fast and fluent.

- **Lead with the answer, then the reasoning.** "I'd use keyset pagination. Here's why." Not a three-minute build-up to a conclusion.
- **Signpost.** "Three options — let me walk through each, then recommend one." Interviewers scoring against a rubric need the structure as much as you do.
- **Ask for repeats without apologizing.** "Can you rephrase that?" is normal and costs nothing.
- **Slow down on the technical nouns.** Precision matters more than pace: *idempotency, quorum, partition key, hydration, eventual consistency* — practice saying them out loud.
- **Timezones:** ask early what the working-hours expectation is (overlap hours, on-call). It reads as professional, not as a red flag.
- **Practice in English even when it's harder.** If a mock is run in Indonesian, the scorecard should note that the English version is still untested — that gap is real, and it shows up under pressure.

---

## Timezone, employment, and the questions to ask

Keep this factual and verify per company — arrangements vary widely and change:
- **Remote-from-Indonesia roles** are typically either through an employer-of-record entity, a contractor agreement, or require relocation. These are materially different for taxes, benefits, and stability. **Ask which one it is in the recruiter screen**, not at the offer stage.
- **Relocation/visa** timelines and sponsorship policies differ per country and per company, and change year to year — check the current policy for the specific company rather than assuming.
- **Compensation** is usually banded by level and location. Ask for the band for the level you're interviewing at; asking is normal practice in these markets.
- **Good questions to ask them** (these also signal seniority): how is the on-call rotation structured across timezones? · what does the promotion process look like from this level? · what's the split between feature work and platform work? · what's the biggest piece of technical debt the team is carrying?

---

## How to use this in a session

- Score the **eight habits** above alongside the technical layers. A candidate who reaches L4 on every topic but never drives the conversation should be told plainly: *"your knowledge is at the bar; your delivery would get you downlevelled."*
- End the scorecard with an **honest level read** — "mid-level", "solid senior", "approaching staff" — plus the one thing that would move it. The user has explicitly asked for honesty over encouragement; a comfortable score that misrepresents the bar is the least useful thing this skill can produce.
