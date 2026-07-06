# express-graphql-auth — minimal notes API with real JWT auth

A deliberately small app: **Express 5 + GraphQL Yoga 5 + Prisma 7 + SQLite**.
Two models (User, Note). Auth done properly: bcrypt hashing, short-lived JWT
access tokens, DB-backed refresh tokens with rotation, and ownership checks.

The full walkthrough lives in the study note:
`notes/express-graphql-auth-tutorial.md` (in this workspace).

## Run it

Requires Node 20+.

```bash
cp .env.example .env      # 1. env vars (JWT secret, sqlite path)
npm install               # 2. dependencies
npm run setup             # 3. prisma migrate dev + prisma generate
npm run dev               # 4. http://localhost:4000/graphql (GraphiQL opens in browser)
```

Prisma 7 note: `migrate dev` no longer runs `generate` automatically — that is
why `npm run setup` does both.

## Try the full auth flow in GraphiQL

Open http://localhost:4000/graphql and run these in order.

**1. Register** (returns both tokens right away):

```graphql
mutation {
  register(email: "ada@example.com", password: "correct-horse-battery", name: "Ada") {
    accessToken
    refreshToken
    user { id email }
  }
}
```

**2. Login** (same shape — use it when the tokens are gone):

```graphql
mutation {
  login(email: "ada@example.com", password: "correct-horse-battery") {
    accessToken
    refreshToken
  }
}
```

**3. Set the header.** In GraphiQL's bottom "Headers" tab, paste (use your real
token):

```json
{ "Authorization": "Bearer PASTE_ACCESS_TOKEN_HERE" }
```

**4. Who am I?**

```graphql
query { me { id email name } }
```

Remove the header and run it again — you get an `UNAUTHENTICATED` error. That
is the context + `requireUser` gate working.

**5. Create and list notes:**

```graphql
mutation {
  createNote(title: "First note", body: "GraphQL context is just per-request setup.") {
    id
    title
    createdAt
  }
}
```

```graphql
query { myNotes { id title author { email } } }
```

**6. Refresh** (after 15 minutes the access token dies; trade the refresh token
for a new pair — the old refresh token is deleted, so it works exactly once):

```graphql
mutation {
  refreshToken(token: "PASTE_REFRESH_TOKEN_HERE") {
    accessToken
    refreshToken
  }
}
```

Run it twice with the same token — the second call fails. That is rotation.

**7. Logout** (revokes the refresh token; the access token just expires):

```graphql
mutation { logout(token: "PASTE_REFRESH_TOKEN_HERE") }
```

**8. Ownership check.** Register a second user, set their token in the header,
and try to `deleteNote` with the first user's note id — you get `FORBIDDEN`.

## File map (reading order)

| File | What it does |
|---|---|
| `prisma/schema.prisma` | User, Note, RefreshToken models |
| `prisma.config.ts` | Prisma 7 CLI config (datasource url, migrations) |
| `src/db.ts` | One PrismaClient + SQLite driver adapter |
| `src/schema.ts` | GraphQL SDL (types, queries, mutations) |
| `src/auth.ts` | bcrypt, JWT sign/verify, refresh token issue/rotate/revoke |
| `src/context.ts` | Per-request context: Bearer token → userId; `requireUser` gate |
| `src/resolvers.ts` | The actual logic, including ownership checks |
| `src/server.ts` | Express app + Yoga mounted at /graphql |

## Switch to PostgreSQL

1. `prisma/schema.prisma`: `provider = "postgresql"`
2. `.env`: `DATABASE_URL="postgresql://user:pass@localhost:5432/notes"`
3. `src/db.ts`: swap the adapter — `npm i @prisma/adapter-pg`, then
   `new PrismaPg({ connectionString: process.env.DATABASE_URL })`
4. Re-run `npm run setup`.
