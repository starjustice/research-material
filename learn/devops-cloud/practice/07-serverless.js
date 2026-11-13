// Lesson 07: Serverless. Write the five pieces below, then run:
//   node --test learn/devops-cloud/practice/07-serverless.test.js
//
// This is a small model of a function platform. Time is in milliseconds.
// An instance in this exercise is a plain object: { id: 1, busyUntil: 600 }
//   busyUntil is the time when the instance finishes its work. At that time it is free (idle).
// A request is { at: 0, durationMs: 100 }: it arrives at time "at" and its code runs for durationMs.
// Each instance does one request at a time.

//   billedMs(durationMs)
//       The platform bills whole milliseconds. Round the time UP to the next whole millisecond.
//       Examples: 933.59 -> 934, 100 -> 100, 0.2 -> 1.
//
//   expireIdle(instances, now, idleTimeoutMs)
//       The platform removes an instance that has been idle for too long.
//       Return a NEW list with the instances that stay. Do not change the old list.
//         An instance that is still busy (busyUntil is after now) stays.
//         An idle instance stays only when it has been idle for LESS than idleTimeoutMs.
//         (idle time = now - busyUntil). Idle for exactly idleTimeoutMs means it is removed.
//
//   runPlatform(config, requests)
//       config is { coldStartMs, idleTimeoutMs, maxInstances, billColdStart }.
//       requests are in time order. Start with an empty pool. For each request, in this order:
//         1. Remove the instances that were idle too long (use expireIdle with the request's "at").
//         2. If an instance is free (busyUntil <= at), use the FIRST free one in the pool.
//            The request is "warm". Its latency is its durationMs.
//            The instance is busy until at + durationMs.
//         3. Else, if the pool has fewer than maxInstances, make a new instance.
//            Ids count up from 1 and are never used twice (1, 2, 3, ...).
//            The request is "cold". Its latency is coldStartMs + durationMs.
//            The instance is busy until at + that latency.
//         4. Else the request is "throttled": nobody runs it. instance is null, latency 0, billed 0.
//       Billing (use billedMs):
//         warm: the durationMs.
//         cold: only the durationMs, but when config.billColdStart is true the whole latency
//               (coldStartMs + durationMs) is billed.
//       Return one result for each request: { kind, instance, latencyMs, billedMs }
//       where kind is "cold", "warm" or "throttled" and instance is the instance id (or null).
//
//   monthlyCost({ calls, avgMs, memoryMb, pricePerGbSecond, pricePerMillionCalls })
//       Time price: GB-seconds * pricePerGbSecond
//         GB-seconds = calls * (billedMs(avgMs) / 1000) * (memoryMb / 1024)
//       Request price: (calls / 1,000,000) * pricePerMillionCalls
//       Return the sum in dollars, rounded to cents (two decimals, as a number).
//
//   breakEvenCalls(fixedMonthly, costPerMillionCalls)
//       A server costs fixedMonthly dollars a month. Serverless costs costPerMillionCalls dollars
//       for every million calls. Return the fewest whole calls a month at which serverless
//       costs as much as the server or more. A part of a call rounds UP.

function billedMs(durationMs) {
  // TODO
}

function expireIdle(instances, now, idleTimeoutMs) {
  // TODO
}

function runPlatform(config, requests) {
  // TODO
}

function monthlyCost(params) {
  // TODO
}

function breakEvenCalls(fixedMonthly, costPerMillionCalls) {
  // TODO
}

module.exports = { billedMs, expireIdle, runPlatform, monthlyCost, breakEvenCalls };
