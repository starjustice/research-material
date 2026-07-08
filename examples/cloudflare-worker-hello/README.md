# cloudflare-worker-hello

A tiny Cloudflare Worker you can run **fully on your machine** — no Cloudflare account, no login. It exists to make one idea concrete: an edge serverless function starts instantly because it runs in a **V8 isolate** (a lightweight sandbox, like a browser tab), not a container that has to boot.

## Run it

From this folder:

```bash
npx wrangler dev
```

Wrangler starts a local server, usually at `http://localhost:8787`.

Then, in another terminal (or a browser):

```bash
curl http://localhost:8787/
curl http://localhost:8787/edge
```

To stop it, press `Ctrl+C`.

## What each file is

- `worker.js` — the entire Worker. One `fetch` handler. This IS the server. ~25 lines.
- `wrangler.toml` — config: the entry file and one environment variable (`GREETING_NAME`).
- `package.json` — pins Wrangler to major version 4.

## What to notice

- **Instant start.** The first request is fast. There is no cold start to wait through — the isolate spins up in about a millisecond. Contrast with AWS Lambda (Node.js), where the first request after idle waits ~100–500ms while a container boots.
- **Routing lives in your code.** `/` and `/edge` are handled by reading `url.pathname`. No separate router or server framework needed.
- **Env vars come from config.** `env.GREETING_NAME` is injected from the `[vars]` block in `wrangler.toml`.
- **The `request.cf` object** is where Cloudflare puts edge metadata (country, city, data center) on the real network. Locally it is `undefined`, so the code falls back to fake `LOCAL` values — that fallback is the only "simulation" here.

## The interview line

> "Cloudflare Workers have effectively no cold start because they use V8 isolates instead of containers. Starting an isolate is like opening a browser tab, not booting a machine. That's the structural difference from Lambda — and I can run one locally with `wrangler dev` in seconds."
