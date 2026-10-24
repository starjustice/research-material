# Backend and API practice

One small exercise per lesson. Each has a stub file with `// TODO` and a test file. The stub fails until you write the answer.

Run a test from the folder that contains `learn/`:

```
node --test learn/backend-api/practice/06-sessions-vs-jwt.test.js
```

| Exercise | Lesson |
|---|---|
| `06-sessions-vs-jwt.js` | [Authentication: sessions vs JWT](../06-authentication-sessions-vs-jwt.md) |
| `07-access-and-refresh-tokens.js` | [Access and refresh tokens](../07-access-and-refresh-tokens.md) |
| `08-authorization.js` | [Authorization](../08-authorization.md) |
| `09-password-hashing.js` | [Password hashing](../09-password-hashing.md) |
| `10-validation-and-error-handling.js` | [Validation and error handling](../10-validation-and-error-handling.md) |
| `11-rate-limiting.js` | [Rate limiting](../11-rate-limiting.md) |
| `12-caching-in-apis.js` | [Caching in APIs](../12-caching-in-apis.md) |
| `13-webhooks-and-idempotency.js` | [Webhooks and idempotency](../13-webhooks-and-idempotency.md) |
| `14-hasura-when-and-when-not.js` | [Hasura: when and when not](../14-hasura-when-and-when-not.md) |
| `15-trpc.js` | [tRPC](../15-trpc.md) |
| `16-grpc.js` | [gRPC](../16-grpc.md) |
| `17-websockets-and-server-sent-events.js` | [WebSockets and Server-Sent Events](../17-websockets-and-server-sent-events.md) |
| `18-choosing-an-api-style.js` | [Choosing an API style](../18-choosing-an-api-style.md) |

Nothing to install. These use only built-in modules (`node:crypto`, `node:test` and `node:assert`), so Node 18 or newer is enough. Lessons 14, 15 and 18 use `Object.hasOwn`, which needs Node 16.9 or newer. (Lesson 09 mentions `crypto.argon2Sync`, which needs Node 24.7 or newer, but the exercise uses `scrypt`, which works everywhere.)

Try before you look at the answer in the lesson.
