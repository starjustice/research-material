# Backend and API: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews · **Stack:** Express, GraphQL, Prisma, Hasura

This page is a short map of the 21 backend and API lessons. It tells you which ones to learn first and gives you the sentence to say out loud. If a lesson feels hard, read the line here first, then open the lesson.

**How to read the stars.** This ranking is my judgement of how often interviewers ask each topic, so treat it as a guide, not a rule.

- ★★★ Almost every backend interview asks this. Learn these first.
- ★★ Often asked in senior rounds. Learn these second.
- ★ Asked when the interviewer wants depth or a specific tool.

## ★★★ Learn these first

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [01 HTTP basics](01-http-basics.md) | A request and an answer both have a first line, headers, an empty line and a body. GET reads, POST makes. 4xx means the client must change something. 5xx means the server has the problem. | 401 is "who are you". 403 is "I know you, and no". |
| [02 REST design](02-rest-api-design.md) | Nouns in the path, the method is the verb. Plural, lowercase, id in the path, one level of nesting. Page long lists with a cursor, not an offset. | A repeated POST makes a second thing. Say how you make it safe (lesson 13). |
| [03 Express middleware](03-express-middleware.md) | A request walks down the line in the order you added the functions. Each one calls `next()` or sends the answer. Error middleware has four parameters and goes last. | Calling neither `next()` nor `send` hangs the request. Calling both sends twice. |
| [05 Resolvers and N+1](05-resolvers-and-the-n-1-problem.md) | N+1 is one query for the list, then one more per item. DataLoader batches them into one query. | Create a new DataLoader for every request, never share one. |
| [06 Sessions vs JWT](06-authentication-sessions-vs-jwt.md) | A session keeps facts on the server and gives you a ticket number. A JWT carries the facts in the token. If sessions are enough, they are simpler and safer. | A JWT is signed, not locked. Anyone can read the payload. |
| [07 Access and refresh tokens](07-access-and-refresh-tokens.md) | The access token is short and used often. The refresh token is long, lives in the database, works once, and is rotated. If a used one comes back, cancel the whole family. | Store only the hash of the refresh token. |
| [08 Authorization](08-authorization.md) | Three questions in order: who, which role, which row. Deny by default. The owner is part of the database query. | IDOR: a user changes the id in the URL and sees someone else's data. The server checks every request. The button is only a hint. |
| [09 Password hashing](09-password-hashing.md) | One way, salted and slow. Use argon2id (then scrypt, then bcrypt for old systems). Never plain text, never encryption, never SHA-256. | A new random salt for each password. Slow on purpose, so guessing costs a thief a lot. |
| [13 Webhooks and idempotency](13-webhooks-and-idempotency.md) | Check the signature on the raw bytes, save the event id, answer fast, do the work later, and make the work safe to repeat. | Write first and let a unique rule in the database say who is first. A slow answer looks like a failure to the sender. |

## ★★ Learn these second

| Lesson | Say this in the interview | Common trap |
|---|---|---|
| [04 GraphQL basics](04-graphql-basics.md) | The client lists the fields it wants and gets that shape back. One URL, `Query` and `Mutation` are the doors. | A wrong field rejects the whole query. Know when you would not use it. |
| [10 Validation and errors](10-validation-and-error-handling.md) | Never trust input, never show the insides. One schema (like Zod) checks everything and then you use the clean data. The client gets a short message, you keep the details. | After validating, use `r.data`. Never use `req.body` again. |
| [11 Rate limiting](11-rate-limiting.md) | Count requests per caller. Over the limit gives `429` and a time to retry. Token bucket is a good default. | Several servers need the count in one shared place like Redis. A fixed window lets through double at its edge. |
| [12 Caching in APIs](12-caching-in-apis.md) | A cache trades freshness for speed, so decide how old is fine. ETag and `304` save bandwidth. | `no-cache` means "check before use". `no-store` means "never save". Private data needs the user id in the cache key. |
| [14 Hasura](14-hasura-when-and-when-not.md) | Let Hasura do plain CRUD and row filters. Keep money rules, other services and many step logic in your own code (Actions). | Do not say you used Hasura in a project unless you did. See the note at the bottom. |
| [18 Choosing an API style](18-choosing-an-api-style.md) | Ask who calls and what they need. REST: the server picks the fields. GraphQL: the client picks. tRPC: the procedure picks. gRPC: the `.proto` picks. | Do not choose by what is new. Say the cost of your choice. |
| [20 Login systems compared](20-login-systems-compared.md) | OAuth is permission. OIDC is login, built on OAuth. SAML is company login in XML. An API key is a password for a program. | OAuth alone does not tell the app who the user is. Check `iss`, `aud`, `exp`, `nonce` and the signature. |
| [21 What the browser can see](21-what-the-browser-can-see.md) | You cannot hide a request from the Network tab. Keep the key on the server, call third parties from there, check the login and the rate on every request, and send only the needed fields. | Scrambling or encrypting in the browser. The key and the code ship to the user too. |

## ★ Depth, or only if the job needs it

| Lesson | The one idea |
|---|---|
| [15 tRPC](15-trpc.md) | The router is the contract and the client imports its type. Types vanish at run time, so still validate input (Zod). |
| [16 gRPC](16-grpc.md) | A `.proto` file is the one contract. Number every field and never reuse a number. Always set a deadline. The HTTP status is 200 even on failure, so read `grpc-status`. |
| [17 WebSockets and SSE](17-websockets-and-server-sent-events.md) | Polling for rare news, SSE for one way pushes, WebSocket when both sides talk. Plan for reconnects. |
| [19 Access control models](19-access-control-models.md) | A role answers for a kind of user, a list for one item, a rule from facts. The default is no. |

## The 7 questions most likely to come up

1. "What happens when a request hits your Express app? How do you handle errors in one place?" (03, 10)
2. "Sessions or JWT? Why access and refresh tokens?" (06, 07)
3. "What is the N+1 problem and how do you fix it?" (05)
4. "How do you stop a user from reading another user's data?" (08)
5. "How do you store passwords?" (09)
6. "A webhook arrives twice. What happens?" (13)
7. "Can you hide an API call from the browser? How do you protect a secret key?" (21)

## Practice

- Lessons have quizzes in `learn/backend-api/quiz/`.
- The full worked example is [Express, GraphQL and Prisma with real auth](express-graphql-auth-tutorial.md). The one page [API, JWT, microservice cheat sheet](cheatsheet-api-auth-microservice.md) is a good last read before an interview.

## Honest notes

- This page only compresses the lessons' "Remember" lines. If it disagrees with a lesson, the lesson is right.
- The Hasura guide and the DBO case study do not agree on whether DBO used Hasura. Never claim it. Say only facts from your own project.
