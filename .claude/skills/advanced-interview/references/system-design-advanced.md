# System Design — the 45-minute international round

One problem, 45 minutes. The interviewer says almost nothing after the prompt. **A candidate who waits to be asked things is already scoring below senior** — at senior and above, the candidate runs the session like a design review they're leading.

---

## The structure to run (and to grade against)

| Phase | Time | What must happen |
|---|---|---|
| **1. Scope & requirements** | 5 min | Functional (what it does) + **non-functional** (scale, latency target, consistency, availability). Explicitly cut things: "I'll skip auth and focus on the feed — agreed?" |
| **2. Estimation** | 5 min | DAU → QPS → storage/year → bandwidth. Rough numbers, stated out loud. |
| **3. API & data model** | 8 min | Endpoints, then **the schema and the access keys**. Most bad designs are visible here. |
| **4. High-level design** | 8 min | Boxes and arrows, request path end to end. |
| **5. Deep dive** | 15 min | Interviewer picks (or candidate proposes) the hard part. This is where the round is won. |
| **6. Bottlenecks & operations** | 5 min | What breaks first, how you'd know, rollback, cost. |

**Estimation shortcuts worth memorizing:** 1M DAU with 10 actions/day ≈ 116 avg QPS; peak ≈ 2–3× average. 86,400 seconds/day ≈ 100k. 1 KB × 1M rows/day ≈ 1 GB/day ≈ 365 GB/year. A modern Postgres box comfortably does thousands of simple QPS — **so a good candidate often concludes "one database is fine"**, and saying that is a *strength*, not a failure to think big.

---

## The senior vs staff rubric

**Senior:** owns the system. Identifies bottlenecks, names failure modes before being asked, justifies tradeoffs with numbers, and covers operations — observability, deployment, rollback, on-call burden. Skipping ops is lost signal.

**Staff:** reasons across systems, teams, and years. Proposes the scope. Raises cross-team concerns and build-vs-buy unprompted. Talks about **cost per request**, migration path from the current system, what ships in v1 vs next quarter, and who maintains it in 18 months. The framing to look for: *the answer is a system, plus the team that owns it, plus the tradeoff you made, plus the v2 you're deliberately deferring.*

**Downlevel signals** — call these out honestly in the scorecard:
- Jumps to the architecture before asking about scale.
- Names technologies instead of describing mechanisms ("we'll use Kafka and Redis and Kubernetes").
- Adds microservices, a queue, and a cache to a problem that has 100 QPS.
- Never says a number.
- Only covers the happy path — no failure, no monitoring, no rollback.
- Waits silently for the interviewer to drive.

---

## Hard problems, with the fork in the road

Each: the prompt, the deep dive that matters, and what separates a good answer from a recited one.

### URL shortener
*Deep dive:* key generation. Random + collision check (extra read per write) vs a **pre-allocated key range per instance** (no coordination in the hot path) vs base62 of an auto-increment (guessable and leaks volume — a real security answer). Then: read:write is ~100:1, so this is a cache problem, and the redirect should be a `301` vs `302` decision based on whether you want analytics.

### Rate limiter (distributed)
*Deep dive:* fixed window's boundary burst → sliding log (accurate, memory heavy) → sliding counter → **token bucket** (allows bursts, smooth refill). Then the real question: where does the state live? In-process = wrong count across N instances; **Redis with an atomic Lua script**; or local buckets with periodic sync (approximate, fast). **"Redis is down — fail open or closed?"** is the judgment question.

### News feed / timeline
*Deep dive:* **fan-out on write** (precompute each follower's feed — fast reads, but a celebrity with 10M followers is a write storm) vs **fan-out on read** (assemble at request time — cheap writes, slow reads) vs the real answer: **hybrid** — fan out for normal users, pull at read time for celebrities, merge. Then ranking, pagination stability while new items arrive (cursor on a snapshot), and cache invalidation.

### Chat / messaging
*Deep dive:* connection routing — a user's socket lives on one instance; how does a message find it? (registry in Redis + pub/sub, or a session-aware gateway layer). Then: delivery semantics and dedupe, ordering per conversation (monotonic sequence per room, not wall-clock timestamps), offline delivery and read receipts, and message storage keyed by `(conversation_id, seq)`.

### Notification system
*Deep dive:* fan-out to email/push/SMS with per-channel providers, **at-least-once + idempotency** so a retry doesn't send a duplicate push, user preferences and quiet hours, digesting/deduping bursts, and a dead letter queue with a replay path. Prioritization: an OTP must not queue behind a marketing blast — separate queues, not priorities on one.

### Payments / ledger
*Deep dive:* **double-entry bookkeeping** (every transaction is balanced entries; the ledger is append-only and never updated in place), idempotency keys on every mutating call, exactly-once at the provider boundary via webhooks + reconciliation (**webhooks arrive out of order, twice, or never** — reconcile against the provider's record of truth, don't trust the webhook alone), and SERIALIZABLE or explicit locking for balance checks. Strong consistency non-negotiable — a place to say "here I give up availability on purpose."

### Search autocomplete
*Deep dive:* **trie** in memory with top-k precomputed at each node vs an inverted index with prefix matching. Update path is the interesting half: rebuilding the trie from a stream of queries, weighting by recency, and sharding by prefix. Latency budget is ~50–100ms end to end, which rules out most architectures immediately.

### Ride-hailing / nearby drivers
*Deep dive:* geospatial indexing — **geohash / S2 / H3 cells** turn "find within 5km" into a prefix or cell-id lookup, because a naive `WHERE distance < 5` scans everything. Then: high-frequency location writes (a write-heavy store or an in-memory grid, not your main Postgres), matching as a distributed assignment problem, and stale locations.

---

## The AI/ML infrastructure questions (now standard in 2026 loops)

Global companies treat these as ordinary architecture questions. They test **serving and systems judgment, not ML theory** — nobody is asking for gradient descent.

**"Add semantic search to our product."**
Embedding model choice and cost per document · where vectors live (`pgvector` in the DB you already run vs a dedicated vector store) · **HNSW vs IVFFlat** (graph-based: fast, accurate, expensive to build and memory hungry; cluster-based: cheaper, needs training data, tune `probes` for recall) · **recall vs latency is a tunable dial, not a fixed property** · re-embedding the whole corpus when you change models (a migration project, not a config change) · hybrid search (keyword + vector) because pure vector search misses exact identifiers.

**"Put an LLM feature behind a 2-second latency budget."**
Streaming tokens so time-to-first-token is what the user feels · caching (exact-match, semantic, and prompt-prefix caching) · **model versioning and A/B testing at the inference layer** · graceful degradation when GPU capacity is short — queue, shed, or fall back to a smaller model · timeouts and the fact that a partial stream is still a usable answer · cost per request as a first-class design constraint, because inference is orders of magnitude more expensive per call than a DB query · evaluation and guardrails in the request path, and what they add to latency.

**"Design a RAG pipeline."**
Ingestion and chunking strategy (chunk size vs retrieval quality) · incremental re-indexing when a document changes · retrieval + rerank · context window budgeting · **citation and traceability** · staleness (the index is a cache of the source of truth) · what happens when retrieval returns nothing relevant.

---

## Deep-dive probes the interviewer should have ready

- "Where is the bottleneck at 10× traffic? At 100×?"
- "What's the single point of failure you've drawn there?"
- "This box just died. Walk me through what the user sees."
- "What's in the cache, what's the key, and what invalidates it?"
- "What's your partition key, and which query does it make expensive?"
- "How much does this cost per million requests? Roughly is fine."
- "You're on call and the p99 triples. What's your first dashboard?"
- "What do you monitor here, and what's the alert threshold?"
- "How do you deploy this without downtime? How do you roll it back?"
- "Which part of this would you *not* build, and buy instead?"
- "If you had one more quarter, what would v2 change?"
