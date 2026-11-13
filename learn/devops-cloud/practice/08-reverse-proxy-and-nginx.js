// Lesson 08: Reverse proxy and Nginx. Write the four pieces below, then run:
//   node --test learn/devops-cloud/practice/08-reverse-proxy-and-nginx.test.js
//
// This is a small model of what nginx does with one request. It is not real nginx.
// The config is a plain object, like the nginx.conf in the lesson:
//   {
//     servers: [
//       { name: "shop.example.test", locations: [
//           { prefix: "/api/", upstream: "api_pool" },   // send to a pool of apps
//           { prefix: "/", static: true } ] },           // nginx answers by itself
//       { name: "admin.example.test", locations: [ { prefix: "/", static: true } ] }
//     ],
//     upstreams: { api_pool: ["app1", "app2"] }
//   }
// A request looks like { host, path, clientIp, headers } where headers may be missing.
// health is a plain object like { app1: true, app2: false }. An app is up only when its value is true.
//
//   pickServer(servers, host)
//       Return the server whose name is equal to host.
//       When no name matches, return the FIRST server (nginx calls this the default server).
//       When the list is empty, return null.
//
//   pickLocation(server, path)
//       Return the location whose prefix is the start of the path.
//       When several prefixes match, the LONGEST prefix wins ("/api/" beats "/").
//       "/apis" does NOT start with "/api/", so it goes to "/".
//       When no prefix matches, return null.
//
//   forwardedFor(existing, clientIp)
//       Build the X-Forwarded-For value. existing is the header the client sent, or undefined.
//       No existing value: return clientIp.
//       An existing value: return existing + ", " + clientIp (nginx adds to the list, it does not replace it).
//
//   createProxy(config, health)
//       Return a function handle(request). It must:
//         1. pickServer for request.host. No server at all: return { status: 404 }.
//         2. pickLocation for request.path. No location: return { status: 404 }.
//         3. A static location: return { status: 200, from: "static" }.
//         4. An upstream location: take the apps of config.upstreams[location.upstream].
//            Round robin: the first call goes to the first app, the next call to the next app, and
//            after the last app it starts again at the first. Each pool has its own counter.
//            Skip apps that are not up (health[app] !== true), looking at the next app in the list.
//            Read health when handle is called, not when createProxy is called.
//            When no app in the pool is up, return { status: 502 } and do not move the counter.
//         5. For an app that answers, return
//            { status: 200, from: <app name>, headers: {
//                host: request.host,
//                "x-forwarded-for": forwardedFor(<the x-forwarded-for the client sent>, request.clientIp),
//                "x-forwarded-proto": "http" } }
//            After an app answers, the next request starts at the app after it.

function pickServer(servers, host) {
  // TODO
}

function pickLocation(server, path) {
  // TODO
}

function forwardedFor(existing, clientIp) {
  // TODO
}

function createProxy(config, health) {
  // TODO
}

module.exports = { pickServer, pickLocation, forwardedFor, createProxy };
