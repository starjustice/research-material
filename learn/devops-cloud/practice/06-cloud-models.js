// Lesson 06: Cloud models. Write the five pieces below, then run:
//   node --test learn/devops-cloud/practice/06-cloud-models.test.js
//
// The seven layers of a running web app, from the top of the stack to the bottom.
// A layer is a plain text name:
//   "data", "code", "runtime", "platform", "os", "vm", "building"
//   (platform = deploy, restart, route traffic and HTTPS. vm = the virtual machine. building = building and machines.)
//
// The five models, and who looks after each layer. The owner is "you", "provider" or "tool":
//   "on-prem"           you look after all seven layers
//   "iaas"              the provider looks after vm and building. You look after the other five.
//   "paas"              you look after data and code. The provider looks after the other five.
//   "saas"              you look after data. The provider looks after the other six.
//   "self-hosted-paas"  a tool such as CapRover on a rented server.
//                       The provider looks after vm and building. The tool looks after platform.
//                       You look after data, code, runtime and os.
//
//   whoManages(layers, model)
//       Return a list with one answer for each layer you are given, in the same order:
//         [{ layer: "os", owner: "you" }, ...]
//       An unknown model throws an Error whose message is "unknown model: <name>".
//       An unknown layer throws an Error whose message is "unknown layer: <name>".
//       Do not change the layers list.
//
//   yourLayerCount(layers, model)
//       How many of the given layers have the owner "you". The tool and the provider do not count.
//
//   chooseModel(needs)
//       needs is an object with four yes or no fields. A missing field means false:
//         { writesCode, needsOsControl, mustOwnHardware, hasOpsPerson }
//       Return { model, reason, warning }. Check the fields in this order:
//         mustOwnHardware        -> model "on-prem"
//         writesCode is false    -> model "saas"
//         needsOsControl         -> model "iaas"
//         otherwise              -> model "paas"
//       reason is a short sentence in words, and each of the four models has its own sentence.
//       warning is true when the model is "iaas" or "on-prem" and hasOpsPerson is false, because
//       you look after the low layers then and nobody is there to do it. Otherwise it is false.
//
//   survives(placement, failedZones)
//       placement is a list of { name, zone }, for example [{ name: "api-1", zone: "a" }].
//       failedZones is a list of zone names that are down.
//       Return { up, running }: running is the names of the instances in a zone that is NOT down,
//       in the same order as the placement. up is true when at least one instance is running.
//       Do not change the placement list.
//
//   nearestRegion(pings)
//       pings is a list of { region, ms }, the time to reach each region.
//       Return the name of the region with the smallest ms. On a tie, the first one in the list wins.
//       An empty list gives null. Do not change the list.

function whoManages(layers, model) {
  // TODO
}

function yourLayerCount(layers, model) {
  // TODO
}

function chooseModel(needs) {
  // TODO
}

function survives(placement, failedZones) {
  // TODO
}

function nearestRegion(pings) {
  // TODO
}

module.exports = { whoManages, yourLayerCount, chooseModel, survives, nearestRegion };
