// Lesson 21: What CapRover does for you. Write the seven pieces below, then run:
//   node --test learn/devops-cloud/practice/21-what-caprover-does-for-you.test.js
//
// This is a small model of five things CapRover decides. It is not CapRover. The real rules come from
// the CapRover docs and source code (opened 2026-11-19). The model keeps only the rule you need.
//
//   parseCaptainDefinition(text)
//       text is the content of a captain-definition file, as a JSON string.
//       Return { source, value }. source is the one choice that was given:
//       "dockerfilePath", "imageName", "dockerfileLines" or "templateId". value is what it holds.
//       Throw an Error when the file is bad. The message must contain these words:
//         not a JSON object                          "JSON object"
//         schemaVersion is not the number 2          "schemaVersion"
//         none of the four choices, or more than one "exactly one"
//         dockerfilePath has ".." as one of its parts (it leaves the project)   "inside the project"
//         dockerfileLines is not a non-empty list of text lines                 "dockerfileLines"
//         imageName or dockerfilePath is not text, or is empty                  "must be text"
//         templateId is not NAME/VERSION, with NAME one of node, php, python-django, ruby-rack
//         and a VERSION that is not empty (for example "node/24")               "templateId"
//
//   updateOrder(volumes)
//       volumes is the list of persistent directories of an app (may be empty or missing).
//       Return "stop-first" when the app has at least one, and "start-first" when it has none.
//
//   rollout({ order, healthCheck, bootSeconds, newWorks, buildOk })
//       What visitors see while Swarm swaps the old copy for the new one.
//       order is "start-first" or "stop-first". healthCheck says if the image has a HEALTHCHECK.
//       bootSeconds is how long the new copy needs before it can really answer.
//       newWorks is false when the new version never becomes ready (it cannot reach the database).
//       buildOk is true unless the build failed. A missing buildOk means true.
//       Return { downtimeSeconds, serving }. serving is "old", "new" or "nothing".
//         build failed: the service is not touched. { downtimeSeconds: 0, serving: "old" }
//         start-first with a health check: Swarm keeps the old copy until the new one passes.
//             new works: { 0, "new" }.  new never works: { 0, "old" }
//         every other case: the old copy is gone before the new one can answer.
//             new works: { bootSeconds, "new" }.  new never works: { Infinity, "nothing" }
//
//   routeTable(apps, rootDomain)
//       The nginx routes. Each app is { name, port, web, https, forceHttps, domains }.
//       web === false means the app is not shown on the web (a worker): it gets no route.
//       port is missing sometimes: use 80. https says if the default name has a certificate.
//       domains is a list of extra names { host, https }, and may be missing.
//       Return one row for every name of every web app:
//         { host, upstream, https, redirectToHttps }
//         host: name + "." + rootDomain for the default name, or the extra host
//         upstream: "http://" + name + ":" + port
//         redirectToHttps: true only when the app has forceHttps AND this host has https
//       Sort the rows by host (plain < comparison). Never change the input.
//
//   certsToRenew(certs)
//       certs is a list of { host, daysLeft }. "certbot renew" only touches a certificate that
//       has less than 30 days left. Return the hosts that it would renew, in the same order.
//
//   survivesRedeploy(mounts, path)
//       mounts is the list of persistent directories (container paths). A file survives a deploy
//       only when its path is one of them, or is inside one of them. "/app/uploads2/a.png" is NOT
//       inside "/app/uploads". A mount written with a slash at the end ("/app/uploads/") is the
//       same folder as "/app/uploads". Return true or false.
//
//   restoreReport({ configBackup, dataBackup, registry })
//       What a restore on a new server brings back. configBackup: you have a CapRover
//       configuration backup. dataBackup: you made your own backup of the volumes and databases.
//       registry: the self-hosted registry was on (its images live inside the config backup).
//       Return { settingsBack, certificatesBack, imagesBack, dataBack }, all true or false.
//         settingsBack and certificatesBack: true only with configBackup
//         imagesBack: true only with configBackup AND registry
//         dataBack: true only with dataBackup (the config backup never has your volumes)

function parseCaptainDefinition(text) {
  // TODO
}

function updateOrder(volumes) {
  // TODO
}

function rollout({ order, healthCheck, bootSeconds, newWorks, buildOk }) {
  // TODO
}

function routeTable(apps, rootDomain) {
  // TODO
}

function certsToRenew(certs) {
  // TODO
}

function survivesRedeploy(mounts, path) {
  // TODO
}

function restoreReport({ configBackup, dataBackup, registry }) {
  // TODO
}

module.exports = { parseCaptainDefinition, updateOrder, rollout, routeTable, certsToRenew, survivesRedeploy, restoreReport };
