const http = require("http");
const crypto = require("crypto");

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[process.env.LOG_LEVEL || "info"];
const FORMAT = process.env.LOG_FORMAT || "json";
let healthy = true;

function log(level, msg, fields = {}) {
  if (LEVELS[level] < MIN) return;
  const time = new Date().toISOString();
  const line =
    FORMAT === "json"
      ? JSON.stringify({ time, level, msg, ...fields })
      : `${time} ${level.toUpperCase()} ${msg} ` + Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(" ");
  // errors go to stderr, the rest to stdout
  (level === "error" ? console.error : console.log)(line.trim());
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  const requestId = req.headers["x-request-id"] || crypto.randomUUID().slice(0, 8);
  const url = new URL(req.url, "http://x");
  // health checks run every few seconds, so they only log at debug level
  const quiet = url.pathname === "/health";
  log(quiet ? "debug" : "info", "request start", { requestId, method: req.method, path: url.pathname });
  const done = (status, body) => {
    res.writeHead(status, { "x-request-id": requestId });
    res.end(body + "\n");
    const level = status >= 500 ? "error" : quiet ? "debug" : "info";
    log(level, "request done", { requestId, status, ms: Date.now() - started });
  };
  if (url.pathname === "/health") {
    return healthy ? done(200, "ok") : done(500, "not ok");
  }
  if (url.pathname === "/break") {
    healthy = false;
    log("warn", "health switched off for the demo", { requestId });
    return done(200, "broken");
  }
  if (url.pathname === "/heal") {
    healthy = true;
    log("warn", "health switched back on for the demo", { requestId });
    return done(200, "healed");
  }
  if (url.pathname === "/order") {
    log("debug", "query orders table", { requestId });
    return setTimeout(() => done(200, "order saved"), Number(url.searchParams.get("wait") || 5));
  }
  if (url.pathname === "/fail") {
    log("error", "payment provider timed out", { requestId });
    return done(500, "error");
  }
  if (url.pathname === "/spam") {
    for (let i = 0; i < Number(url.searchParams.get("n") || 100); i++) log("info", "noisy line " + i, { requestId });
    return done(200, "spammed");
  }
  done(404, "not found");
});

server.listen(3000, () => log("info", "server started", { port: 3000, minLevel: process.env.LOG_LEVEL || "info" }));
process.on("SIGTERM", () => {
  log("info", "got SIGTERM, shutting down");
  server.close(() => process.exit(0));
});
