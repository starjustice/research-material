import { GraphQLError } from "graphql";
import { prisma } from "./db";
import { verifyAccessToken } from "./auth";

export interface Context {
  prisma: typeof prisma;
  // null = anonymous request. Resolvers that need auth call requireUser().
  userId: string | null;
}

// Runs once per HTTP request, BEFORE any resolver.
// This is GraphQL's equivalent of Express auth middleware.
// Note: it never throws on a bad token — it just leaves userId as null,
// so public operations (register, login) still work without a header.
export function buildContext({ request }: { request: Request }): Context {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const userId = token ? verifyAccessToken(token) : null;
  return { prisma, userId };
}

// The auth gate. UNAUTHENTICATED = "I don't know who you are" (401).
export function requireUser(ctx: Context): string {
  if (!ctx.userId) {
    throw new GraphQLError("Not authenticated. Send a valid Bearer token.", {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
  return ctx.userId;
}
