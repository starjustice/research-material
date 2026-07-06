import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Copy .env.example to .env first.");
}

export const ACCESS_TOKEN_TTL = "15m"; // short: limits damage if stolen
const REFRESH_TOKEN_TTL_DAYS = 7; // long: how long a login session survives

// ---------- Passwords ----------

// Cost 12 = 2^12 hashing rounds (~100–300ms). Slow ON PURPOSE:
// it makes brute-forcing a leaked hash table impractically expensive,
// while one login per user stays cheap. OWASP minimum for bcrypt is 10.
// (bcryptjs = pure JS, no native build step. The `bcrypt` package is a
// native binding — same API, slightly faster, needs compilation.)
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------- Access tokens (JWT) ----------

export function signAccessToken(userId: string): string {
  // "sub" (subject) is the standard JWT claim for "who this token is about".
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

// Returns the userId, or null for anything invalid (bad signature, expired,
// malformed). Invalid token = anonymous request; resolvers decide what needs auth.
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return typeof payload === "object" && typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

// ---------- Refresh tokens (opaque, DB-backed) ----------

// NOT a JWT — just 256 bits of randomness. Its power comes from the DB row,
// which is exactly what lets us revoke it (delete row = token dead).
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(token), // store the hash, never the token
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token; // the plain token goes to the client exactly once
}

// Rotation: each refresh token works exactly once. Using it deletes it
// and issues a replacement. A replayed (already-used) token finds no row.
export async function rotateRefreshToken(
  token: string,
): Promise<{ userId: string; newToken: string } | null> {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!row || row.expiresAt < new Date()) return null;
  await prisma.refreshToken.delete({ where: { id: row.id } });
  return { userId: row.userId, newToken: await issueRefreshToken(row.userId) };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  // deleteMany, not delete: revoking an unknown token must not throw.
  await prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(token) } });
}
