// A minimal Cloudflare Worker. Runs locally with `npx wrangler dev` — no account needed.
// The whole thing is ONE fetch handler. That is the entire "server". No process stays alive
// between requests; each request runs in a fresh V8 isolate that starts in ~1ms (no cold start).

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route 1: /  -> greeting that reads an env var (set in wrangler.toml [vars])
    if (url.pathname === "/") {
      return Response.json({
        message: `Hello from ${env.GREETING_NAME} at the edge!`,
        tip: "Try /edge to see simulated location + latency info.",
      });
    }

    // Route 2: /edge -> show the "edge" metadata. On the real network, request.cf holds
    // the visitor's country, city, and colo (data center). Locally it is undefined, so we fake it.
    if (url.pathname === "/edge") {
      const cf = request.cf ?? { country: "LOCAL", city: "your-machine", colo: "DEV" };
      return Response.json({
        servedFrom: cf.colo,
        country: cf.country,
        city: cf.city,
        note: "V8 isolate — no container to boot, so no cold start.",
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
