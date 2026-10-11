# Backend and API

HTTP, REST and GraphQL APIs, Express, authentication and authorization, and Hasura.

**Why it matters in interviews:** Backend rounds ask you to walk through a request end to end, design an endpoint, and explain JWT and refresh tokens. Your DBO and Skyworx work lives here.

## The map

How the lessons connect. Learn left to right.

```mermaid
graph LR
    A["HTTP"] --> B["REST design"]
    A --> C["GraphQL"]
    B --> D["Express middleware"]
    D --> E["Authentication"]
    E --> F["Authorization"]
    C --> G["Resolvers and N+1"]
```

## Lessons, one concept per file

Each lesson is one small file made from [the lesson template](../../templates/lesson-template.md): picture first, a code trace, practice, links to watch and play, and an explain it back section.

Status: `planned` (not written yet), `ready` (written, not studied), `learning`, `can explain` (passed explain-check).

### Basics

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 01 | HTTP basics `01-http-basics.md` | methods, status codes, headers, what a request and response look like | planned |
| 02 | REST API design `02-rest-api-design.md` | resources, naming, pagination, versioning, idempotency | planned |
| 03 | Express middleware `03-express-middleware.md` | the request pipeline, next(), error middleware | planned |

### GraphQL

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 04 | GraphQL basics `04-graphql-basics.md` | schema, query, mutation, how it differs from REST | planned |
| 05 | Resolvers and the N+1 problem `05-resolvers-and-the-n-1-problem.md` | how resolvers run and why DataLoader exists | planned |

### Auth

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 06 | Authentication: sessions vs JWT `06-authentication-sessions-vs-jwt.md` | where the state lives, pros and cons | planned |
| 07 | Access and refresh tokens `07-access-and-refresh-tokens.md` | why two tokens, rotation, where to store them | planned |
| 08 | Authorization `08-authorization.md` | roles, permissions, row level rules | planned |
| 09 | Password hashing `09-password-hashing.md` | bcrypt and argon2, why not plain hashing | planned |

### Senior level

| # | Lesson | You will understand | Status |
|---|---|---|---|
| 10 | Validation and error handling `10-validation-and-error-handling.md` | validating input at the edge, consistent error shapes | planned |
| 11 | Rate limiting `11-rate-limiting.md` | token bucket, sliding window | planned |
| 12 | Caching in APIs `12-caching-in-apis.md` | HTTP caching, ETags, Redis | planned |
| 13 | Webhooks and idempotency `13-webhooks-and-idempotency.md` | verify, dedupe, queue, acknowledge | planned |
| 14 | Hasura: when and when not `14-hasura-when-and-when-not.md` | permissions, actions, limits | planned |

**To make the next lesson:** in a chat with this folder open, say `/learn backend-api 01` to learn it live with Claude, or ask "make lesson backend-api 01" and the `research-material` agent writes the file. When a lesson file exists, its row becomes a link and the status changes to `ready`.

## Guides already here

Longer guides that cover many concepts at once. Good for revision after the lessons.

- [Express, GraphQL and Prisma with real auth (tutorial)](express-graphql-auth-tutorial.md)
- [Cheat sheet: API request, JWT, microservices](cheatsheet-api-auth-microservice.md)
- [Hasura: what it is and when to choose it](hasura-guide.md)

## Visual cheatsheets

Open in the browser. Everything visible on one page.

- [Express, GraphQL and auth visual cheatsheet](express-graphql-auth-tutorial-cheatsheet.html)
- [Hasura visual cheatsheet](hasura-guide-cheatsheet.html)

## Examples to run

- [examples/express-graphql-auth/](examples/express-graphql-auth/) - Express, GraphQL, Prisma app with register, login and refresh tokens
- [examples/hasura-todo/](examples/hasura-todo/) - Hasura todo app with Docker Compose

## Watch and play

Trusted places to see the ideas, not only read them. Each lesson adds its own checked video and visualizer links.

- [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) - HTTP explained with diagrams
- [GraphQL Learn](https://graphql.org/learn/) - official GraphQL introduction
- [jwt.io](https://jwt.io/) - paste a token and see its header, payload and signature
- [roadmap.sh Backend](https://roadmap.sh/backend) - visual map of backend topics
