// Lesson 02: Scaling up vs out. Write createSite below, then run:
//   node --test learn/system-design/practice/02-scaling-up-vs-out.test.js

// createSite({ mode, servers }) makes a small web site with a load balancer and some servers.
//   servers  the server names, for example ["A", "B", "C"]. The default is ["A", "B"].
//   mode     where a login note is kept. The default is "shared".
//     "memory"  each server keeps notes in its own memory (the bug of card 2)
//     "sticky"  the same as "memory", but the balancer sends every user back to the server of their login
//     "shared"  every server uses one shared box (the fix of card 3)
//
// The load balancer gives the requests to the servers one after the other, in the order of the list:
// the first request goes to the first server, the next to the second, and so on, and then it starts again.
// One counter is shared by login and request calls. (Sticky users do not use the counter after their login.)
//
// It returns an object with these methods:
//
//   login(user)       the next server in turn writes the note: a new session id is linked to the user.
//                     Session ids are "s1", "s2", "s3" ... in the order of the logins.
//                     It returns { id, server }, with the name of the server that took the login.
//
//   request(id)       a request with this session id. Which server gets it:
//                       "memory" and "shared": the next server in turn
//                       "sticky": the server that took the login, as long as that server is up.
//                                 If it is not up any more, the next server in turn.
//                     That server looks for the id in its notes (its own memory, or the shared box).
//                     It returns { server, says }. `says` is the user name, or "please log in" when no note is found.
//
//   addServer(name)   a new, empty server joins the end of the list. It starts to get requests in turn.
//                     Return true. If the name is already in the list, change nothing and return false.
//   loseServer(name)  the server stops and its own memory is gone. It leaves the list.
//                     Return true. If the name is not in the list, change nothing and return false.
//   servers()         the names of the servers that are up, in order.
//
// When no server is up, login and request throw an Error.
function createSite(options) {
  // TODO
}

module.exports = { createSite };
