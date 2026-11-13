// Lesson 03: Docker Compose. Write the six pieces below, then run:
//   node --test learn/devops-cloud/practice/03-docker-compose.test.js

//   startOrder(services)
//       services looks like { web: { depends_on: ["db", "cache"] }, db: {}, cache: {} }.
//       depends_on can also be an object, like { db: { condition: "service_healthy" } }. Use its keys.
//       Return the service names in the order Compose starts them: a service comes after everything it needs.
//       Go through the services in the order they are written. Before you add a service, add the ones it needs.
//       Each name appears once. Throw an Error whose message contains "cycle" when services wait for each other
//       (a service that needs itself is a cycle too). Throw an Error containing "unknown service" when a name in
//       depends_on is not in services.
//
//   canStart(condition, dep)
//       Can the service that waits start now? dep describes the service it waits for:
//         { state: "running" | "created" | "exited", health: "none" | "starting" | "healthy" | "unhealthy", exitCode: number or null }
//       "service_started"                 true when dep.state is "running". Health does not matter.
//       "service_healthy"                 true when dep.state is "running" and dep.health is "healthy".
//                                         When dep.health is "none" (no healthcheck written) throw an Error containing "no healthcheck".
//       "service_completed_successfully"  true when dep.state is "exited" and dep.exitCode is 0.
//       No condition (undefined) means "service_started". Any other text: throw an Error containing "unknown condition".
//
//   webStartsAt({ condition, dbStartedAt, dbReadyAt, interval })
//       Times are in milliseconds. The database container starts at dbStartedAt and can really take
//       connections at dbReadyAt. Return the time when Compose starts the web service.
//       "service_started": web starts at dbStartedAt (the container is running, nothing more is asked).
//       "service_healthy": the healthcheck runs at dbStartedAt + interval, then every interval after that.
//                          Web starts at the first check that is at or after dbReadyAt.
//       Any other condition: throw an Error containing "unknown condition".
//
//   connectResult(startsAt, dbReadyAt)
//       The web service connects to the database the moment it starts.
//       Return "connected" when startsAt is at or after dbReadyAt, else "ECONNREFUSED".
//
//   resolve(services, from, hostname)
//       services looks like { proxy: { networks: ["frontend"] }, api: { networks: ["frontend", "backend"] }, db: { networks: ["backend"] } }.
//       A service with no networks list is on the network called "default".
//       The service called from looks up hostname. Return:
//         from            when hostname is "localhost" (you reach yourself)
//         hostname        when hostname is a service that shares at least one network with from
//         null            for anything else (another network, or no such service)
//
//   dataSurvives(command, mount)
//       Does a file written before the command still exist after the command and after the stack starts again?
//       command is "stop" (docker compose stop, then start), "down", or "down -v".
//       mount is where the file lives: "layer" (the container's own storage), "named" (a named volume), or "bind" (a host folder).
//       Return true or false. Throw an Error containing "unknown" for a command or mount you do not know.

function startOrder(services) {
  // TODO
}

function canStart(condition, dep) {
  // TODO
}

function webStartsAt(options) {
  // TODO
}

function connectResult(startsAt, dbReadyAt) {
  // TODO
}

function resolve(services, from, hostname) {
  // TODO
}

function dataSurvives(command, mount) {
  // TODO
}

module.exports = { startOrder, canStart, webStartsAt, connectResult, resolve, dataSurvives };
