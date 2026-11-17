// Lesson 11: Kubernetes probes, limits and rollouts. Write the six pieces below, then run:
//   node --test learn/devops-cloud/practice/11-kubernetes-probes-limits-and-rollouts.test.js
//
// These are small models of what the kubelet and the Deployment controller do.
// They are not real Kubernetes code, but the rules come from the Kubernetes docs.
//
//   probeAction(type, results, failureThreshold)
//       type is "startup", "readiness" or "liveness". Any other text: throw an Error.
//       results is a list of true (the check passed) or false (it failed), oldest first.
//       Count the failures in a row at the END of the list. A pass in the middle starts the count again.
//       If that count is less than failureThreshold (default 3), return "none".
//       If it is failureThreshold or more:
//         readiness  -> "stop traffic"   (the pod leaves the Service list, the container is NOT restarted)
//         liveness   -> "restart"
//         startup    -> "restart"
//
//   probesRunning(hasStartupProbe, startupPassed)
//       Which probes does the kubelet run right now? Return a list of names.
//       While a startup probe exists and has not passed yet, only ["startup"] runs.
//       Otherwise ["liveness", "readiness"] run (in that order).
//
//   parseQuantity(text)
//       Turn a Kubernetes quantity such as "500m", "2", "128Mi" or "1G" into a number.
//       The number part may have a decimal point ("1.5Gi"). Then an optional suffix:
//         m  = one thousandth        ("500m" is 0.5, and "128m" is 0.128)
//         no suffix = 1
//         k, M, G, T       = 1000, 1000 * 1000, ... (powers of ten)
//         Ki, Mi, Gi, Ti   = 1024, 1024 * 1024, ... (powers of two)
//       The case matters: "M" is megabytes and "m" is thousandths.
//       Text that is not a quantity (empty, letters only, a minus sign, a space inside) throws an Error.
//
//   limitEffect(limits, use)
//       limits is an object that may have a memory text and a cpu text, such as { memory: "256Mi", cpu: "500m" }.
//       A missing key means "no limit". use has memory and cpu texts: what the container wants right now.
//       Return { killed, exitCode, speed }.
//         killed:   true when memory use is MORE than the memory limit. Equal is fine.
//         exitCode: 137 when killed, otherwise null.
//         speed:    the share of the CPU it wants that it gets, from 0 to 1.
//                   1 when there is no cpu limit or the want is at or under the limit.
//                   Over the limit it is limit / want (a limit of 500m for a want of 1 core gives 0.5).
//       Memory and cpu are checked on their own. A container can be killed and slow in the same answer.
//
//   rolloutLimits(replicas, maxSurge, maxUnavailable)
//       maxSurge and maxUnavailable are a whole number (1) or a percentage text ("25%").
//       Both default to "25%". A percentage is a share of replicas.
//       maxSurge rounds UP. maxUnavailable rounds DOWN.
//       Return { maxPods, minReady }: maxPods = replicas + surge, minReady = replicas - unavailable.
//       If the caller wrote 0 or "0%" for BOTH, throw an Error (Kubernetes refuses that).
//       If both only come out as 0 because of rounding (for example 3 replicas, surge 0, unavailable "10%"),
//       use 1 for unavailable, so the rollout can still move.
//
//   rollout(replicas, limits, newPodsPassReadiness)
//       limits is { maxSurge, maxUnavailable } (either may be missing, so the default applies).
//       Use rolloutLimits to get maxPods and minReady.
//       A pod state is { old, starting, ready }:
//         old      = old pods. All of them are ready.
//         starting = new pods that exist but have not passed readiness.
//         ready    = new pods that passed readiness.
//       Start with { old: replicas, starting: 0, ready: 0 }. Each "round" does these three things, in this order:
//         1. If newPodsPassReadiness is true, every starting pod becomes ready.
//         2. Remove old pods. Remove as many as you can, but old + ready must stay at minReady or more.
//         3. Start new pods. Start as many as you can, but all pods (old + starting + ready) stay at maxPods
//            or less, and new pods (starting + ready) never go above replicas.
//       After the three steps, save a copy of the state. Stop when old is 0 and ready equals replicas
//       (status "done"), or when a round changes nothing (status "stalled", and do not save that round).
//       Return { steps, status, maxPods, minReady }:
//         steps    = the list of saved states, the start state first.
//         status   = "done" or "stalled".
//         maxPods  = the biggest old + starting + ready in steps.
//         minReady = the smallest old + ready in steps.

function probeAction(type, results, failureThreshold) {
  // TODO
}

function probesRunning(hasStartupProbe, startupPassed) {
  // TODO
}

function parseQuantity(text) {
  // TODO
}

function limitEffect(limits, use) {
  // TODO
}

function rolloutLimits(replicas, maxSurge, maxUnavailable) {
  // TODO
}

function rollout(replicas, limits, newPodsPassReadiness) {
  // TODO
}

module.exports = { probeAction, probesRunning, parseQuantity, limitEffect, rolloutLimits, rollout };
