// Prisma 7: CLI configuration moved out of schema.prisma into this file.
// Env vars are NOT auto-loaded anymore, so we import dotenv explicitly.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 moved the datasource url here (schema.prisma keeps only the provider).
    url: env("DATABASE_URL"),
  },
});
