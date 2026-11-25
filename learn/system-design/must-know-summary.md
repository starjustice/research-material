# System design: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews

This page is a short map of the 31 system design lessons. It tells you which ones to learn first and gives you the sentence to say out loud. If a lesson feels hard or long, read the line here first, then open the lesson.

**How to read the stars.** This ranking is my judgement of how often interviewers ask each topic, so treat it as a guide, not a rule.

- ★★★ Almost every design round uses this. Learn these first.
- ★★ Often asked, especially for senior roles. Learn these second.
- ★ Asked when the interviewer wants depth. Learn these last.

## The one thing to remember

A design answer is not a perfect drawing. It is: **ask what is needed, do a small estimate, draw the simple version, then say what each choice costs and what would change it.** Never say "the best". Say what you gave up.

## ★★★ Learn these first

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [01 Interview framework](01-the-interview-framework.md) | Requirements, a small estimate, the simple drawing, then deep dives. Say each step out loud. | Jumping to boxes before you know what is needed. If you freeze, go back one step. |
| [02 Scaling up vs out](02-scaling-up-vs-out.md) | Up is a bigger machine. Out is more machines, and it only works when servers keep no user data in their own memory (stateless). | Moving the data out of the server moves the single point of failure. It does not remove it. |
| [03 Load balancers](03-load-balancers.md) | Users know one address. The balancer picks a server for each request and uses health checks to skip dead ones. Layer 7 is the default for web apps. | A health check has a gap, so retry safe requests on another server. The balancer can fail too. |
| [04 Caching](04-caching.md) | A cache is a fast copy, and a copy can go old. On a write, change the database first, then delete the cache key. Keep a TTL as a limit. | A cache stampede: many misses at once. Let the first miss refill and the others wait. |
| [06 Message queues](06-message-queues.md) | The request adds a job and moves on. A worker does the slow work later. Ack after the work, so a crash means a repeat. | Nobody can promise exactly once. You build "at least once" plus a worker that is safe to repeat. |
| [07 Consistency and CAP](07-consistency-and-cap.md) | Copies make reads faster but a read can be stale. Choose per feature: money is strong, likes are eventual, and a user must see their own change. | CAP only speaks when the network is cut. Read your own writes from the leader for a few seconds. |
| [13 Idempotency and retries](13-idempotency-and-retries.md) | A timeout means "I do not know". So the retry must be safe to repeat. A unique key in the database picks the winner. | Never "check if it exists, then insert". Insert first and let the unique rule refuse the second one. |
| [08 URL shortener](08-design-a-url-shortener.md) | A short code is a key in a table. Reads are about 100 times the writes, so cache. A counter never repeats a code. | 301 vs 302: a 301 is cached by the browser, so you lose click counts and cannot turn links off. |
| [09 Rate limiter](09-design-a-rate-limiter.md) | Token bucket, with the count in one shared Redis, changed in one step (`INCR` or a Lua script). | Never keep the count in each server's memory. Fail open on most routes, closed on login, OTP and money. |
| [12 Online shop checkout](12-design-an-online-shop-checkout.md) | Hold stock in one step, let the payment company say "paid" through a webhook, and run undo steps when something fails. | The success page only reads. The webhook marks the order paid. |
| [15 Choosing tools](15-choosing-tools-and-explaining-why.md) | Say the limits, what you compared, what you picked, what it cost, and what would change your mind. | Never say "the best". A choice with no cost sounds shallow. This is the question behind "why did you choose X?" |

## ★★ Learn these second

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [05 CDN](05-cdn.md) | Only a miss travels to the origin. Cache what is the same for everyone. Give a long life only to names that change when the content changes. | Private pages must not be cached at the edge. |
| [10 Chat app](10-design-a-chat-app.md) | One open line per phone, plus a map (in Redis) to find it. Save first, then ack, then deliver. Ids only grow, so a phone asks "give me everything after my last id". | Sent means saved on disk, not delivered. |
| [11 Notification system](11-design-a-notification-system.md) | The first service drops an event and moves on. Workers send through providers with retries, an idempotency key, and a separate fast lane for login codes. | A marketing blast must never block a login code. |
| [14 Observability](14-observability.md) | Metrics tell you something is wrong. A trace tells you where. Logs tell you why. | Watch p99, not the average. Alert on what users feel, not on CPU. |
| [16 Latency and estimates](16-latency-numbers-and-estimation.md) | Per day ÷ 100,000 is per second. Times 3 for the peak. Know: memory ns, same data centre 0.5 ms, across the world 150 ms. | An estimate that does not change what you say next wastes time. |
| [17 Proxies and gateways](17-proxies-and-api-gateways.md) | A gateway does the door jobs once: HTTPS, login check, rate limit, routing. Services stay private. | The gateway is one more thing that can fail. Run two copies. Services still check ownership. |
| [18 Object storage](18-object-storage-and-presigned-uploads.md) | The API checks who may upload and signs a link. The bytes go straight to storage. Details go in Postgres. | The server picks the file key. Sign the type and size. |
| [19 Replication and quorums](19-replication-and-quorums.md) | Async can lose the last writes. Sync cannot, but writes wait. R + W > N means readers always meet at least one fresh copy. | A copy is only a safety net for data that has reached it. |
| [21 Streams vs queues](21-streams-vs-queues.md) | A queue hands out jobs and forgets them. A stream keeps the history and each reader keeps its own place. Kafka order is only inside a partition. | More workers than partitions do not help. |
| [22 Search indexes](22-search-indexes.md) | An inverted index maps each word to the documents that hold it. Start with Postgres full text search. | Search is a little behind on purpose. Use a version number to ignore old changes. |
| [23 Timeouts, retries, breakers](23-timeouts-retries-and-circuit-breakers.md) | Every call needs a timeout. Retry at one layer, with backoff and jitter. A circuit breaker fails fast so the other side can recover. | Add up the worst case: timeout × tries must fit what the user will wait. |
| [25 Multi-tenancy](25-multi-tenancy.md) | Shared tables with a tenant id on every query, plus row level security as a safety net. Give a schema or database only to tenants that need a wall. | One missed filter leaks data silently. Limit each tenant, so one noisy customer cannot hurt others. |
| [27 Safe deploys](27-safe-deploys.md) | Limit how many users one bad release can touch, and keep a fast way back. Know rolling, canary, blue green and feature flags. | Old and new code run side by side on the same database, so change columns in steps. |
| [29 Security in a design](29-security-in-a-design.md) | A valid token only says who you are. Also check on every request that this user may touch this object. | Changing the id in the URL is the classic bug. Put the owner in the database query. |
| [31 The frontend design round](31-the-frontend-design-round.md) | Requirements, parts, data, API, then deep dives. Choose rendering per page. Server data in a cache, shareable choices in the URL. | Optimistic updates only for easy, safe actions, never for money. |

## ★ Depth, for senior and staff rounds

| Lesson | The one idea |
|---|---|
| [20 Consistent hashing](20-consistent-hashing.md) | With `mod N`, adding one server moves almost every key. On a ring, only about 1 key in N moves. |
| [24 Consensus and Raft](24-consensus-and-raft.md) | A majority must agree, so two halves of a split network cannot both go ahead. Use 3 or 5 servers, not an even number. |
| [26 SLOs and error budgets](26-slos-and-error-budgets.md) | SLI measures, SLO is the goal, the error budget is what the goal still allows. SLA is a looser contract. Alert on symptoms. |
| [28 Disaster recovery](28-disaster-recovery.md) | RPO is data you can lose. RTO is time you can be down. A replica does not protect you from a mistake. Only a backup does. |
| [30 LLM features](30-llm-features-in-a-system.md) | The model only knows the prompt. Filter by permission before search, show sources, add timeout and fallback, never trust the model's output. |

## The 6 questions most likely to come up

1. "Walk me through how you approach a design question." (01)
2. "The API is slow. Bigger server or more servers?" Then load balancer, cache, queue. (02, 03, 04, 06)
3. "What can go wrong with a cache?" Stale data, stampede, delete after write. (04)
4. "A payment request timed out and the client retried. How do you charge once?" (13)
5. "Design a rate limiter / URL shortener / chat / checkout." (08, 09, 10, 12)
6. "Why did you choose this database or tool? What did it cost?" (15)

## If you have limited time

- **1 week:** lessons 01, 02, 03, 04, 06, 07, 13, 15. Then do one design (08 or 09) from a blank page.
- **3 weeks:** all ★★★, then the ★★ designs (10, 11) and 14, 16, 17, 23.
- **Full plan:** follow the [roadmap](system-design-roadmap-beginner-to-senior.md). It has six stages and a 10 week plan.

## Practice

- The lessons have quizzes in `learn/system-design/quiz/`.
- For long answers to rehearse, use [senior system design interview questions](senior-system-design-interview-questions.md).
- For full designs on a blank page, use the two design workbooks listed in the [README](README.md).

## Honest notes

- This page only compresses the lessons' "Remember" lines. If it disagrees with a lesson, the lesson is right.
- The DBO case study has a note about whether Hasura was used. Do not claim it. Say only facts from your own project.
