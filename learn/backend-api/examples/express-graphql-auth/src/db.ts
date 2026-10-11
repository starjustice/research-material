import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

// Prisma 7 requires a driver adapter: the Prisma client is pure TypeScript now,
// and the adapter is the piece that actually talks to the database.
//
// PostgreSQL swap (two lines):
//   import { PrismaPg } from "@prisma/adapter-pg";
//   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

// One PrismaClient for the whole process. Never create one per request —
// each client holds its own connection pool.
export const prisma = new PrismaClient({ adapter });
