// Lesson 04: Kubernetes objects. Write the five pieces below, then run:
//   node --test learn/devops-cloud/practice/04-kubernetes-objects.test.js
//
// A pod in this exercise is a plain object: { name: "shop-api-1", labels: { app: "shop-api" }, ready: true }

//   reconcile(desiredReplicas, pods)
//       The control loop. Compare the number you want with the number of pods that exist.
//       Return a list of actions, as text:
//         too few pods  -> one "create" for each missing pod
//         too many pods -> one "delete <name>" for each extra pod, taking pods from the END of the list
//                          (the last pod is deleted first)
//         the right number -> an empty list
//       Do not change the pods list.
//
//   applyActions(pods, actions, makePod)
//       Do the actions and return a NEW list of pods. The old list must stay the same.
//         "create"        -> add the pod that makePod() gives you, at the end
//         "delete <name>" -> remove the pod with that name
//
//   selectorMatches(selector, labels)
//       selector and labels are plain objects, for example { app: "shop-api" }.
//       Return true when every key of the selector is in the labels with the same value.
//       The labels may have more keys. An empty selector matches nothing (return false),
//       because a Service without a selector does not pick pods by itself.
//
//   serviceEndpoints(service, pods)
//       service looks like { name: "shop-api", selector: { app: "shop-api" } }.
//       Return the names of the pods that get traffic, in the same order as the pods list:
//       the pod's labels match the selector AND the pod is ready (pod.ready is true).
//
//   ingressRoute(rules, host, path)
//       rules is a list of { host, path, pathType, service }, where pathType is "Prefix" or "Exact".
//       Return the service name for a request, or null when no rule matches.
//         The host must be equal to the rule's host.
//         Exact:  the request path must be equal to the rule path (capital letters count).
//         Prefix: compare piece by piece, where pieces are split at "/".
//                 "/api" matches "/api" and "/api/users" but NOT "/apis". "/" matches every path.
//         If several rules match, the one with the most path pieces wins ("/api" beats "/").
//         On a tie, an Exact rule beats a Prefix rule.

function reconcile(desiredReplicas, pods) {
  // TODO
}

function applyActions(pods, actions, makePod) {
  // TODO
}

function selectorMatches(selector, labels) {
  // TODO
}

function serviceEndpoints(service, pods) {
  // TODO
}

function ingressRoute(rules, host, path) {
  // TODO
}

module.exports = { reconcile, applyActions, selectorMatches, serviceEndpoints, ingressRoute };
