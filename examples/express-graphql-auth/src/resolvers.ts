import { GraphQLError } from "graphql";
import { Prisma } from "./generated/prisma/client";
import type { Note, User } from "./generated/prisma/client";
import { requireUser, type Context } from "./context";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "./auth";

async function buildAuthPayload(user: User) {
  return {
    accessToken: signAccessToken(user.id),
    refreshToken: await issueRefreshToken(user.id),
    user,
  };
}

export const resolvers = {
  Query: {
    me: (_parent: unknown, _args: unknown, ctx: Context) => {
      const userId = requireUser(ctx);
      return ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    },

    myNotes: (_parent: unknown, _args: unknown, ctx: Context) => {
      const userId = requireUser(ctx);
      // Ownership is enforced HERE, in the query — not filtered afterwards.
      return ctx.prisma.note.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
      });
    },
  },

  Mutation: {
    register: async (
      _parent: unknown,
      args: { email: string; password: string; name?: string | null },
      ctx: Context,
    ) => {
      if (args.password.length < 8) {
        throw new GraphQLError("Password must be at least 8 characters.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      try {
        const user = await ctx.prisma.user.create({
          data: {
            email: args.email.toLowerCase().trim(),
            passwordHash: await hashPassword(args.password),
            name: args.name ?? null,
          },
        });
        return buildAuthPayload(user);
      } catch (e) {
        // P2002 = unique constraint violation. Catching it (instead of a
        // find-then-create check) avoids the race between two simultaneous
        // registrations — the DB constraint is the source of truth.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          throw new GraphQLError("An account with this email already exists.", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        throw e;
      }
    },

    login: async (
      _parent: unknown,
      args: { email: string; password: string },
      ctx: Context,
    ) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: args.email.toLowerCase().trim() },
      });
      // One identical error for "no such email" and "wrong password",
      // so attackers can't probe which emails have accounts.
      const valid = user && (await verifyPassword(args.password, user.passwordHash));
      if (!valid) {
        throw new GraphQLError("Invalid email or password.", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      return buildAuthPayload(user);
    },

    refreshToken: async (_parent: unknown, args: { token: string }, ctx: Context) => {
      const rotated = await rotateRefreshToken(args.token);
      if (!rotated) {
        throw new GraphQLError("Refresh token is invalid or expired. Log in again.", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: rotated.userId },
      });
      return {
        accessToken: signAccessToken(user.id),
        refreshToken: rotated.newToken,
        user,
      };
    },

    logout: async (_parent: unknown, args: { token: string }, _ctx: Context) => {
      await revokeRefreshToken(args.token);
      return true;
    },

    createNote: (
      _parent: unknown,
      args: { title: string; body: string },
      ctx: Context,
    ) => {
      const userId = requireUser(ctx);
      return ctx.prisma.note.create({
        data: { title: args.title, body: args.body, authorId: userId },
      });
    },

    deleteNote: async (_parent: unknown, args: { id: string }, ctx: Context) => {
      const userId = requireUser(ctx); // authentication: who are you?
      const note = await ctx.prisma.note.findUnique({ where: { id: args.id } });
      if (!note) {
        throw new GraphQLError("Note not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      // authorization: are you allowed? FORBIDDEN = "I know who you are,
      // and the answer is no" (403) — different from UNAUTHENTICATED (401).
      if (note.authorId !== userId) {
        throw new GraphQLError("You can only delete your own notes.", {
          extensions: { code: "FORBIDDEN", http: { status: 403 } },
        });
      }
      await ctx.prisma.note.delete({ where: { id: note.id } });
      return true;
    },
  },

  // Field resolvers: run only when the query actually selects the field.
  Note: {
    author: (note: Note, _args: unknown, ctx: Context) =>
      // Beware: for a list of N notes this runs N times (the N+1 problem).
      // At scale you'd batch with DataLoader. Fine at this size.
      ctx.prisma.user.findUniqueOrThrow({ where: { id: note.authorId } }),
    createdAt: (note: Note) => note.createdAt.toISOString(),
  },

  User: {
    notes: (user: User, _args: unknown, ctx: Context) =>
      ctx.prisma.note.findMany({ where: { authorId: user.id } }),
  },
};
