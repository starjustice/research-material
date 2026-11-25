# What is most important to know

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews

Reading every lesson takes a long time, and some are hard. This page is the short version. It tells you what to learn first, what interviewers ask most, and how to use your time if the interview is close.

**This ranking is my judgement**, based on the topics in [CLAUDE.md](../CLAUDE.md) and how often each idea shows up in the lessons' own interview questions. It is not a list from a company. If you have a real job description, look at it first. It beats this page.

Each subject has its own page with the same ★★★ ★★ ★ ranking, a "say this" line for every lesson, and the common trap:

| Subject | Summary page |
|---|---|
| JavaScript | [JavaScript: what to know first](javascript/must-know-summary.md) |
| React and frontend | [React and frontend: what to know first](react/must-know-summary.md) |
| React Native | [React Native: what to know first](react-native/must-know-summary.md) |
| Backend and API | [Backend and API: what to know first](backend-api/must-know-summary.md) |
| Database | [Database: what to know first](database/must-know-summary.md) |
| System design | [System design: what to know first](system-design/must-know-summary.md) |
| Networking | [Networking: what to know first](networking/must-know-summary.md) |
| DevOps and cloud | [DevOps and cloud: what to know first](devops-cloud/must-know-summary.md) |
| Problem solving | [Problem solving: what to know first](problem-solving/must-know-summary.md) |

## The top 25 ideas, across everything

If you only learn 25 things, learn these. Each one is a lesson or section you can explain in about 2 minutes.

**JavaScript and React**

1. The event loop: sync code, then microtasks, then one task. ([JS 11](javascript/11-the-event-loop.md))
2. Closures, and the stale closure bug in React. ([JS 05](javascript/05-closures.md))
3. `this`, hoisting, and reference vs copy. ([JS 06](javascript/06-this-call-apply-and-bind.md), [01](javascript/01-variables-scope-and-hoisting.md), [03](javascript/03-reference-vs-copy.md))
4. `useEffect`, keys, and why the Virtual DOM is a strategy, not "fast". ([React guide](react/must-know-summary.md))
5. State management: split server state from client state. ([React guide](react/must-know-summary.md))
6. Server Components, and rendering strategies per page. ([React guide](react/must-know-summary.md))

**Backend and API**

7. Sessions vs JWT, and access vs refresh tokens. ([API 06](backend-api/06-authentication-sessions-vs-jwt.md), [07](backend-api/07-access-and-refresh-tokens.md))
8. Authorization and IDOR: check the owner on every request. ([API 08](backend-api/08-authorization.md))
9. N+1 and DataLoader. ([API 05](backend-api/05-resolvers-and-the-n-1-problem.md))
10. Webhooks and idempotency: it will arrive twice. ([API 13](backend-api/13-webhooks-and-idempotency.md))
11. Choosing REST, GraphQL, tRPC or gRPC. ([API 18](backend-api/18-choosing-an-api-style.md))

**Database**

12. How an index works and what it costs. ([DB 09](database/09-indexes-and-b-trees.md), [26](database/26-what-an-index-costs.md))
13. Reading EXPLAIN to fix a slow query. ([DB 11](database/11-reading-explain.md))
14. ACID, isolation levels and the lost update. ([DB 13](database/13-transactions-and-acid.md), [14](database/14-isolation-levels.md))
15. OFFSET vs keyset pagination. ([DB 17](database/17-pagination.md))
16. Joins and WHERE vs HAVING. ([DB 02](database/02-joins.md), [03](database/03-grouping-and-aggregation.md))

**System design**

17. The design framework: requirements, estimate, draw, deep dive. ([SD 01](system-design/01-the-interview-framework.md))
18. Scale out with stateless servers, a load balancer, a cache and a queue. ([SD 02](system-design/02-scaling-up-vs-out.md), [03](system-design/03-load-balancers.md), [04](system-design/04-caching.md), [06](system-design/06-message-queues.md))
19. Consistency and read-your-writes. ([SD 07](system-design/07-consistency-and-cap.md))
20. Idempotency and retries. ([SD 13](system-design/13-idempotency-and-retries.md))
21. "Why did you choose it, and what did it cost?" ([SD 15](system-design/15-choosing-tools-and-explaining-why.md))

**Networking, cloud and coding**

22. What happens when you type a URL: DNS, TCP, TLS, HTTP, render. ([Networking summary](networking/must-know-summary.md))
23. CORS and cookies. ([NET 06](networking/06-cookies-cors-and-same-origin.md))
24. Docker layers, CI/CD, and secrets. ([DevOps 02](devops-cloud/02-docker-images-and-layers.md), [05](devops-cloud/05-ci-cd-pipelines.md), [09](devops-cloud/09-config-and-secrets.md))
25. Big O, hash maps, and always saying time and space. ([PS 01](problem-solving/01-big-o-time-and-space.md), [02](problem-solving/02-hash-maps-and-sets.md))

## If you have limited time

| Time | What to do |
|---|---|
| **2 days** | Read the 25 ideas above, one line each. Explain 5 of them out loud. Do not open new lessons. |
| **1 week** | Do the ★★★ rows of JavaScript, Backend and Database. Then system design lessons 01, 02, 03, 04, 06, 07, 13, 15. Do one quiz a day. |
| **3 weeks** | All ★★★ rows of every subject, then the ★★ rows. Practice one design from a blank page each week with `/mock-interview`. |
| **2 months** | Follow the [study method and weekly plan](../my-learning/study-method-and-weekly-plan.md) and the [system design roadmap](system-design/system-design-roadmap-beginner-to-senior.md). |

## Why this order

- **Every interview asks fundamentals.** JavaScript, API and database basics come up even in senior rounds. A wrong answer here costs more than a missing answer on Kafka.
- **Senior rounds add tradeoffs.** For each choice, say what it costs and what would change your mind. This is the senior skill.
- **Your own projects matter.** The best answer to "why did you choose X?" is a true story from DBO, Unloan or ZWS. Use `/project-story`. Say only facts you can back up.

## What is missing

- **TypeScript** has no lessons yet (11 are planned). Interviews usually ask: `type` vs `interface`, `any` vs `unknown`, generics, utility types (`Partial`, `Pick`, `Omit`), narrowing, and how you type an API response. These are in the [TypeScript plan](typescript/README.md), but there is no summary because there is nothing to summarise yet.
- **React** and **React Native** have guides, not numbered lessons, so their pages summarise the guides.
- **Other stacks** (.NET, Java Spring) are low priority unless the job uses them.
- **Behavioral questions** (STAR) are in the interview folder, not in `learn/`. See [interview](../interview/README.md).

## How to use these pages

1. Read the subject page first. It takes about 5 minutes.
2. Open only the ★★★ lessons. Look at the picture, then the "Remember" lines.
3. Take the quiz in the lesson.
4. Say the "say this" line out loud, then explain it in your own words with `/explain-check`.
5. Come back to ★★ and ★ later.

## Honest notes

- These pages only compress what the lessons already say. If a page and a lesson disagree, the lesson is right.
- The stars are my ranking, not an official one. Change them as you learn what your real interviews ask. Add the questions you could not answer to [the review list](../my-learning/review-list.md).
