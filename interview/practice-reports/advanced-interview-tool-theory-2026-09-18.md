# Advanced Interview Report — Tool Theory: Docker and CapRover

**Date:** 2026-09-18
**Level:** Senior (international bar)
**Mode:** teach (model answer given after every answer)
**Topic:** tool-theory, scoped to Docker and CapRover
**Why this topic:** prep for [Parable Health](../companies/parable-health/parable-health-interview-prep.md). No Go/C++/ML background, so depth on tools actually run in production is the main lever.
**Source material:** [docker-caprover-internals.md](../../learn/devops-cloud/docker-caprover-internals.md)
**Previous report:** [database internals, same day](advanced-interview-database-2026-09-18.md)

## Depth map

| # | Question | Layer reached |
|---|---|---|
| 1 | What is a container, and how does it differ from a VM? | L1 |
| 2 | Rebuild reinstalls all npm packages after a one-line change | **L2 (partial)** |
| 3 | Users get errors mid-request during a CapRover deploy | **L2** |
| 4 | Container restarts with exit code 137 and no logs | L1 (wrong) |
| 5 | API can't reach Postgres via `localhost` on CapRover | L1–L2 (partial) |
| 6 | Uploaded files vanish after a deploy | **L2** |

Nothing reached L3 (why it works at kernel level) or L4 (proving it in production).

## What happened, per question

**Q1.** Gave the purpose (packaged app environment) but not the mechanism. Correct answer: a container is a Linux process with namespaces (isolated view) and cgroups (resource limits), sharing the host kernel. A VM brings its own kernel.

**Q2.** Right instinct: cache dependencies and only reinstall when `package.json` or the lockfile changes. Missing: it's Docker's layer cache, a changed layer invalidates every layer after it, and you copy the lockfile then install, never copy the host's `node_modules`.

**Q3.** Right direction: redundancy plus a load balancer removes the gap. Missed: (a) Swarm already does rolling updates, (b) CapRover uses `start-first` only when the app has no persistent directory, otherwise `stop-first`, which causes the gap, (c) a real `HEALTHCHECK` is required, (d) the "errors mid-request" symptom points at in-flight requests being killed, which needs exec-form `CMD` and a `SIGTERM` handler.

**Q4.** Guessed a build problem. Wrong. Exit 137 = 128 + 9 = SIGKILL, usually the kernel OOM killer hitting the container's memory limit, or a `docker stop` timeout. No logs because the process is killed from outside. Confirm with `docker inspect` (`OOMKilled`), fix by setting `--max-old-space-size` below the container limit.

**Q5.** Identified `localhost` as the problem but believed it means the host server. It means the container itself (own network namespace). Suggested using IP and port. Correct: use the service name (`srv-captain--<app>`) via the overlay network's built-in DNS. IPs change on redeploy, and no port mapping is needed.

**Q6.** Correct diagnosis (deploy resets the space) and the best production fix (S3). Missing the mechanism (the writable layer dies with the container) and the alternative with its tradeoffs (volume / persistent directory).

## Ratings (1–5)

- Depth of mechanism: **2/5** (up from 1/5 in the database round)
- Quantitative reasoning: **1/5**. No numbers volunteered (memory limits, timeouts, build times).
- Tradeoff judgment: **3/5**. Chose S3 unprompted; redundancy plus load balancer; cache design instinct.
- Failure-mode awareness: **2/5**. Named the deploy gap; missed OOM kill and in-flight request kill.
- Drove the conversation: **2/5** (up from 1/5). Attempted all six questions with no skips, but never asked a clarifying question or volunteered a next step.
- Communication in English: **3/5**. Understandable; answers are short and often open with "Yes", including on why-questions, which reads as agreeing with a question that wasn't yes/no.

## Level read

**Solid mid-level on practical instincts, not yet senior at an international bar.** Three of six answers (Q2, Q3, Q6) landed on the correct fix, which is what real hands-on experience looks like. The gap is that every answer states *what to do* and none states *why it works*. A senior answer adds one sentence of mechanism.

**Honest caveat on comparing to the database round:** this session was teach mode, which lowers the cost of a wrong guess. The improvement in attempts (zero skips) is real, but the level comparison is not apples-to-apples. Re-test in interview mode.

## Top 3 gaps, ranked

1. **No kernel-level mental model (namespaces, cgroups).** Q1, Q4 and Q5 all trace back to it: container vs VM, why the OOM kill is silent, and why `localhost` is the container. One concept explains three misses.
2. **Signals and process lifecycle (PID 1, SIGTERM, graceful shutdown).** Explains both the mid-request errors and the `docker stop` variant of exit 137.
3. **Answers stop at "what", not "why", and carry no numbers.** Add one sentence of mechanism and one number (memory limit, 10s stop timeout, seconds saved) to every answer.

## Full model answer, Q6 (last question)

The container's writable layer is created empty when the container starts and **is deleted with the container**. A deploy replaces the container, so anything written to `/app/uploads` is gone. Options:

1. **Object storage (S3):** best for production. Survives host loss, works across multiple replicas and nodes, cheap, and keeps the app stateless so any instance can serve any request. For sensitive files (Parable's wound photos are PHI): encryption at rest, non-guessable keys, short-lived signed URLs, never a public bucket.
2. **Volume / CapRover persistent directory:** simple and fast, but tied to one host, not shared across replicas on different nodes, backups are your job, and **CapRover then falls back to `stop-first` updates, which reintroduces the deploy gap from Q3.**
3. **Network filesystem (NFS/EFS):** shared across nodes, but slower and more operational work.

## Study list

- [docker-caprover-internals.md](../../learn/devops-cloud/docker-caprover-internals.md) Part 1 (namespaces and cgroups), Part 3 (PID 1 and SIGTERM), Part 4 (networking), Part 6 (exit 137 and the two memory limits)
- `.claude/skills/advanced-interview/references/tool-theory.md` §7 (containers)
- [system-design-step-by-step-walkthrough.md](../../learn/system-design/system-design-step-by-step-walkthrough.md) step 7 (failure and operations)

## Re-test next session

- All six questions in **interview mode** (no model answer between questions)
- Add one L3 question: "why does a `RUN rm` in a later layer not shrink the image?"
- Add one L5 question: "design zero-downtime deploys for a stateful service on Swarm"
- Practice: first sentence of every answer states the mechanism; last sentence gives one number
