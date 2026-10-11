import "dotenv/config";
import express from "express";
import { createYoga, createSchema } from "graphql-yoga";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { buildContext, type Context } from "./context";

// GraphQL Yoga chosen over Apollo Server 5: one package, mounts as plain
// Express middleware, ships GraphiQL, and sets sane error defaults.
// (Apollo 5 also works but needs the separate @as-integrations/express5 package.)
const yoga = createYoga({
  schema: createSchema<Context>({ typeDefs, resolvers }),
  context: buildContext,
  // In production also consider: maskedErrors (on by default),
  // a rate limit on login/register, and disabling GraphiQL.
});

const app = express();

// Express still owns the app: health checks, webhooks, static files,
// REST endpoints — anything that isn't GraphQL.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// The entire GraphQL API hangs off one endpoint: /graphql
app.use(yoga.graphqlEndpoint, yoga);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`GraphiQL ready at http://localhost:${port}/graphql`);
});
