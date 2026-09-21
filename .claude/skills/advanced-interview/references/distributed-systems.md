# Distributed Systems — the theory international loops assume you have

The JS/TS path into engineering usually skips this. It is the most common reason a strong local senior gets downlevelled abroad, so drill it hard.

---

## 1. CAP, and why the usual version of it is wrong

**L2** "What's CAP?"
**L3** "Postgres with a synchronous replica — is that CP or AP? Why?"

- CAP says: **when a network partition happens**, you must choose between consistency and availability. That's it. It says nothing about the 99.9% of the time when the network is fine, so "we chose AP" as a general design statement is a buzzword, not an answer.
- **PACELC** is the version seniors should use: *if* **P**artition, choose **A** or **C**; **E**lse (normal operation), choose **L**atency or **C**onsistency. This is the real daily tradeoff — a synchronous replica in another region costs you an RTT on **every** commit, partition or not.
- Concretely: Postgres with `synchronous_commit = remote_apply` to a second region = strong consistency, and every write pays cross-region latency. Async replication = fast writes, and a failover can lose the last few seconds of commits. **Ask what they'd pick for a payments ledger vs a "last seen" timestamp** — the point is that different data in the same product deserves different answers.

---

## 2. Consistency models — say the right word

Ordered from strongest:

- **Linearizable (strong):** every read sees the latest committed write; the system behaves like one copy. Costs coordination, i.e. latency.
- **Sequential / serializable:** operations appear in *some* consistent order for everyone.
- **Causal:** if A caused B, everyone sees A before B; unrelated events may be seen in different orders. Enough for comment threads, chat.
- **Read-your-own-writes:** the specific one users actually notice — "I posted and it vanished." Achievable by pinning that user's reads to the primary briefly, or by version tokens.
- **Monotonic reads:** you never see time go backwards (refresh shows a comment, refresh again and it's gone — two replicas with different lag).
- **Eventual:** given no new writes, replicas converge. Says nothing about *when*.

**L4 question:** "Your app shows a user their own new comment missing after posting. Which guarantee is violated, and give me two fixes." (Read-your-own-writes; sticky reads to primary for N seconds, or optimistic UI + version check.)

---

## 3. Quorums and replication

- **N** replicas, **W** acknowledge a write, **R** are read. If **R + W > N** you're guaranteed to read at least one replica that saw the latest write. N=3, W=2, R=2 is the classic tuning: survives one node down for both reads and writes.
- W=1 is fast and loses data on failure; W=N is durable and unavailable if any node is down.
- **Conflict resolution** when two replicas accept different writes: last-write-wins (needs synced clocks — and **clocks are not trustworthy**, which is why Google built TrueTime with atomic clocks and error bounds), **vector clocks** (detect concurrency, push the merge to the app), or **CRDTs** (types designed so merges are automatic and order-independent — the basis of collaborative editors like Figma/Google Docs).
- **Leader–follower** (Postgres, MySQL, Kafka partitions) vs **leaderless** (Dynamo, Cassandra). Leader = simple ordering, single write bottleneck, failover gap. Leaderless = always writable, conflict resolution becomes your problem.

---

## 4. Consensus — Raft in plain language

**L3** "How does a cluster agree on a leader without a central coordinator?"

- **Raft:** nodes are follower/candidate/leader. A follower that hears nothing for a randomized election timeout becomes a candidate and requests votes; a candidate with a **majority** wins for that **term**. All writes go to the leader, which appends to its log and replicates; an entry is **committed once a majority has it**.
- **Why a majority?** Two disjoint majorities cannot exist, so two leaders in the same term cannot both commit — that's the whole mechanism against split brain.
- **Why an odd number of nodes?** 3 tolerates 1 failure, 4 also tolerates only 1 — the extra node adds cost and no fault tolerance.
- **Fencing tokens:** a paused-then-resumed old leader may still think it's leader. Every request carries a monotonically increasing token and storage rejects stale ones. This is also **the flaw in naive Redis locks** — a lock that expires while the holder is in a GC pause is no lock at all unless something fences it.
- Used by: etcd (so, Kubernetes), Consul, CockroachDB, Kafka's KRaft mode. **Paxos** solves the same problem and is notoriously harder to explain; Raft was explicitly designed for understandability.

---

## 5. Messaging semantics and the exactly-once lie

**L3** "Can a queue deliver exactly once?"

- **At-most-once:** ack before processing. Fast, loses messages on crash.
- **At-least-once:** ack after processing. The default in practice — **and it means duplicates are guaranteed to happen eventually**.
- **Exactly-once *delivery* over a network is impossible** (the two-generals problem). What systems actually provide is **effectively-once processing**: at-least-once delivery + an **idempotent consumer**. Kafka's "exactly-once" is a transactional read-process-write *within Kafka*, not a promise about your database or a third-party API.
- **Idempotency in practice:** a client-supplied key stored with a unique constraint; on replay, return the stored result instead of re-executing. This is exactly how Stripe's API works, and asking a candidate to design it is a standard senior question.

---

## 6. The patterns that come up in every design round

- **Outbox pattern.** You can't atomically write to Postgres and publish to Kafka — two systems, no shared transaction. Instead write the event to an `outbox` table **in the same transaction** as the business change, then a relay (poller or CDC from the WAL) publishes it. Solves the dual-write problem; the answer interviewers are listening for when they ask "what if the DB commit succeeds but the publish fails?"
- **Saga.** A long-running transaction across services as a sequence of local transactions, each with a **compensating action** (refund, release inventory) rather than a rollback. Choreography (events) vs orchestration (a coordinator) — orchestration is easier to debug at scale.
- **2PC.** Prepare then commit across participants. Correct, but **blocking**: if the coordinator dies after prepare, participants hold locks indefinitely. Why most internet-scale systems chose sagas and idempotency instead.
- **Circuit breaker.** After N failures, stop calling and fail fast; probe occasionally (half-open). Protects you *and* the struggling dependency.
- **Bulkhead.** Separate pools per dependency so one slow downstream can't consume every worker.
- **Backpressure.** When a consumer is slower than the producer, something must give: bounded queues, pause, or shed load. Unbounded buffering means the failure mode is an OOM at 3am instead of a visible slowdown.
- **Cache stampede / thundering herd.** One hot key expires, 5,000 requests miss simultaneously and hit the DB. Fixes: **single-flight** (one request recomputes, the others wait), jittered TTLs, early/probabilistic refresh, or serve-stale-while-revalidating.
- **Hot key / hot partition.** One celebrity, one tenant, one popular product. Fixes: key suffixing/write sharding, a local in-process cache in front of the shared one, or dedicated handling for whales.

---

## 7. Queue technologies — pick one and defend it

| | **Kafka** | **SQS** | **RabbitMQ** |
|---|---|---|---|
| Model | Partitioned, replayable **log** | Managed queue | Broker with exchanges/routing |
| Ordering | Per partition | FIFO queues only (lower throughput) | Per queue, best-effort |
| Retention | Time/size based — **replay is a feature** | Deleted after ack | Deleted after ack |
| Consumers | Groups with offsets; many independent readers of the same data | Competing consumers | Competing consumers, rich routing |
| Ops | Heavy (until managed) | Zero | Moderate |
| Reach for it when | Event streaming, multiple consumers, replay, high throughput | Simple async work in AWS | Complex routing, per-message priority/TTL |

**The discriminating question:** "why is Kafka faster than a database for this?" — sequential appends, OS page cache, zero-copy transfer, batching, and no per-message random I/O or index maintenance.

---

## 8. Microservices vs monolith — answer it like a staff engineer

The junior answer is a feature list. The staff answer:

- **Microservices are an organizational solution, not a performance one.** They buy independent deploys and clear team ownership; they cost you a distributed system — network failure between every call, distributed transactions, distributed tracing, versioned contracts, and a much harder local dev story.
- **Start with a modular monolith.** One deploy, in-process calls, real transactions — with hard internal module boundaries. Extract a service when a *specific* pressure justifies it: a team that can't ship independently, a component with radically different scaling or hardware needs (GPU inference, video encoding), or an isolation/compliance boundary.
- **The cost nobody budgets for:** every service needs its own CI, alerts, on-call, dashboards, secrets, and migration path. Three engineers do not need nine services.
- **Say the reversal cost out loud:** splitting a monolith is hard; merging services back is harder, because by then the data has been split too.

---

## Rapid-fire L3 probes

- "Two services both need this data. Shared database — what's wrong with that?" (coupled schema, no independent deploy, unclear ownership)
- "Design an idempotency key. What's stored, what's the uniqueness constraint, when does it expire?"
- "Your cron job runs on 3 instances. How do you make sure it runs once?" (leader election, advisory lock, `SKIP LOCKED`, or a scheduler with fencing)
- "How do you trace a request across 6 services?" (trace/span ids propagated in headers, W3C `traceparent`, sampling)
- "What's a dead letter queue for, and what do you do with the messages in it?"
- "A deploy corrupts data for 20 minutes. What's your recovery path?" (PITR from WAL, event replay, backfill job, feature flags to stop the bleeding)
- "Why is clock skew dangerous in a distributed system?" (LWW conflict resolution, token expiry, lock leases, ordering)
