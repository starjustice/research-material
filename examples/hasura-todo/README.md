# hasura-todo — Hasura in 10 Minutes

The smallest possible Hasura tour: two tables, one relationship, one row-level permission, one Action. Companion note: [notes/hasura-guide.md](../../notes/hasura-guide.md).

**You need:** Docker Desktop running. Nothing else.

## 1. Start Hasura + Postgres

```bash
cd examples/hasura-todo
docker compose up -d
```

## 2. Load the sample tables

```bash
docker compose exec postgres psql -U postgres -f /seed.sql
```

This creates `users` and `todos` (with a foreign key `todos.user_id → users.id`) and a few rows.

## 3. Open the console

Go to **http://localhost:8080** — admin secret: `myadminsecret`.

- **Data → default → public** → you'll see `users` and `todos` as "Untracked".
- Click **Track All** for tables, then **Track All** for the suggested relationships (Hasura found them from the foreign key).

That's it — you now have a full GraphQL API. You wrote zero resolvers.

## 4. Run your first nested query

Open the **API** tab and run:

```graphql
query {
  todos {
    title
    done
    user { name }
  }
}
```

Note what just happened: a nested query with a join, **no N+1** — Hasura compiled this into one SQL statement. (Check **Analyze** in the API tab to see the actual SQL.)

Try a filter too:

```graphql
query {
  todos(where: { done: { _eq: false } }, order_by: { id: desc }) {
    title
    user { name }
  }
}
```

## 5. Row-level permission — the killer feature

Now make users only see **their own** todos:

1. **Data → todos → Permissions** tab.
2. Type a new role name: `user`, click the **select** cell.
3. Row select permissions → **With custom check**:
   ```json
   { "user_id": { "_eq": "X-Hasura-User-Id" } }
   ```
4. Column permissions → toggle all columns → **Save**.

Test it in the **API** tab by adding two request headers:

| Header | Value |
|---|---|
| `x-hasura-role` | `user` |
| `x-hasura-user-id` | `1` |

Run the same `todos` query — you only get Andi's todos now. Change `x-hasura-user-id` to `2` — only Budi's. **The permission is compiled into the SQL WHERE clause; there is no code that could forget the check.**

(In production these headers come from a verified JWT, not typed by hand — see the auth section of the guide note.)

## 6. An Action — custom logic outside Hasura

Start the tiny handler on your laptop:

```bash
node handler.js
```

In the console: **Actions → Create**:

- Action definition:
  ```graphql
  type Query {
    shout(text: String!): ShoutResult
  }
  ```
- New type definition:
  ```graphql
  type ShoutResult {
    shouted: String!
  }
  ```
- Handler: `http://host.docker.internal:3000` (this is how the Hasura container reaches your laptop)
- **Create**, then run in the API tab:

```graphql
query { shout(text: "hasura") { shouted } }   # → "HASURA!"
```

That's the whole escape-hatch pattern: Hasura forwards the call (including session variables — check the handler's terminal) to your Node code, and the response joins the same graph.

## 7. Clean up

```bash
docker compose down -v
```

## What you just learned

1. **Track tables → instant CRUD API** (step 3–4)
2. **Compiler, not resolver** — nested query, one SQL, no N+1 (step 4, Analyze button)
3. **Permissions are WHERE clauses** configured per role (step 5)
4. **Actions = your code for the custom 20%** (step 6)
