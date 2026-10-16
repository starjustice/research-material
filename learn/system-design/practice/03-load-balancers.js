// Lesson 03: Load balancers. Write the two functions below, then run:
//   node --test learn/system-design/practice/03-load-balancers.test.js

// 1. createPicker(names) makes a round robin picker for servers such as ["A", "B", "C"].
//    It returns an object with three methods:
//      pick()          returns the name of the next server that is up, taking turns:
//                      A, B, C, A, B, C ... Servers that are down are skipped.
//                      When every server is down, it returns null.
//      markDown(name)  a health check failed: pick() must stop returning this server.
//      markUp(name)    health checks pass again: pick() may return this server again.
//    All servers start as up.
function createPicker(names) {
  // TODO
}

// 2. leastConnections(servers) picks by the number of open connections.
//    servers looks like [{ name: "A", up: true, open: 3 }, { name: "B", up: false, open: 0 }].
//    Return the name of the server that is up and has the fewest open connections.
//    When two servers tie, return the one that comes first in the list.
//    Never return a server that is down. When every server is down, return null.
function leastConnections(servers) {
  // TODO
}

module.exports = { createPicker, leastConnections };
