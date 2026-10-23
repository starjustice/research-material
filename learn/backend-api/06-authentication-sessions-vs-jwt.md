# 06. Authentication: sessions vs JWT

> **Subject:** Backend and API · **Lesson:** 06 · **Made:** 2026-10-23 · **Status:** ready
> **You will be able to:** say where the "this is user 7" fact lives for a session and for a JWT, name what each one does better, and pick one for a real app.
> **Before this:** [Resolvers and the N+1 problem](05-resolvers-and-the-n-1-problem.md) · **Next:** [Access and refresh tokens](07-access-and-refresh-tokens.md)

## 1. The idea in one sentence

**Authentication** means checking who you are. HTTP forgets you after every request, so after login the server needs a way to know it is still you. A **session** keeps a note about you on the server. A **JWT** puts the note inside a signed token that you carry.

New words:

- **Session:** a note the server keeps about you. Your browser holds only a random id that points to the note.
- **Cookie:** a small piece of text the browser saves and sends back by itself with every request to that site.
- **JWT:** a signed note you carry. It is short for JSON Web Token. It has three parts: header, payload and signature.
- **Signature:** a stamp that only the server can make. If anyone changes the note, the stamp no longer fits.

Words you will hear: a session is **stateful** (the server remembers you). A JWT is **stateless** (the server remembers nothing).

The rule to remember: **a session keeps the facts on the server and gives you a ticket number. A JWT puts the facts in the token and gives you the whole note.**

## 2. The pictures

### 2a. The big picture

Both ways start with a right password. Notice what the server does next, and what the browser gets.

```mermaid
graph TB
    L["Login with the right password"] --> S["Session way"]
    L --> J["JWT way"]
    S --> S1["Server keeps a note"]
    S1 --> S2["Browser gets a random id in a cookie"]
    S2 --> S3["Each request the server looks the id up"]
    J --> J1["Server writes a note and signs it"]
    J1 --> J2["Browser gets the whole signed note"]
    J2 --> J3["Each request the server checks the stamp"]
```

### 2b. The problem, drawn

HTTP has no memory. Each request stands alone. Notice that the second request says nothing about the first one.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    B->>S: POST /login with email and password
    S-->>B: 200 OK, welcome Ana
    B->>S: GET /notes
    Note over S: The server does not remember the login
    S-->>B: 401, who are you
```

### 2c. How it works over time

The session way first. Notice the extra trip to the session store on every request.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    participant N as Session store
    B->>S: POST /login with email and password
    S->>N: save id a91f belongs to user 7
    S-->>B: Set-Cookie sid=a91f
    B->>S: GET /notes with Cookie sid=a91f
    S->>N: who is a91f
    N-->>S: user 7
    S-->>B: 200 OK, the notes of user 7
```

The JWT way. Notice that there is no store at all.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    B->>S: POST /login with email and password
    Note over S: Server writes sub 7 and role user into a token and signs it
    S-->>B: 200 OK, the token
    B->>S: GET /notes with Authorization Bearer token
    Note over S: Server checks the stamp and the time, no lookup
    S-->>B: 200 OK, the notes of user 7
```

### 2d. What is held right now

A snapshot after login. Notice which side holds the facts.

```mermaid
graph LR
    subgraph SESSION ["Session way"]
        SB["Browser holds only sid = a91f3c07"]
        SS["Server notebook: a91f3c07 means user 7 with role user"]
        SB -.->|points to| SS
    end
    subgraph JWT ["JWT way"]
        JB["Browser holds header, payload and signature"]
        JS["Server notebook: nothing. It only knows the SECRET"]
    end
```

This is a real token from the code in section 4. Anyone can decode the first two parts.

| Part | What you see | Decoded |
|---|---|---|
| Header | `eyJhbGciOiJIUzI1NiJ9` | `{"alg":"HS256"}` (which stamp method) |
| Payload | `eyJzdWIiOiI3Iiwicm9sZSI6InVzZXIifQ` | `{"sub":"7","role":"user"}` (the facts) |
| Signature | `qB7gXZpMqe4AVmsI2qEQhr_QRp4yTecAq71tNSfVkbk` | the stamp, made from header, payload and the secret |

### 2e. Right against wrong

**Wrong picture 1:** "A JWT is a locked box, so I can put secrets inside."

```mermaid
graph LR
    A["Wrong picture"] --> B["the signature hides the payload"]
    B --> C["so a password hash in the payload is safe"]
```

**Right picture 1:** the signature only stops changes. Anyone can read the payload.

```mermaid
graph LR
    A["Right picture"] --> B["the payload is only base64 text"]
    B --> C["anyone can read it"]
    C --> D["the stamp only proves nobody changed it"]
```

**Wrong picture 2:** "Sessions kept in server memory work with any number of servers."

```mermaid
graph TB
    U["Ana logs in"] --> LB1["Load balancer"]
    LB1 -->|first request| A["Server A has her note"]
    LB1 -->|next request| B["Server B has no note"]
    B --> R["401, Ana looks logged out"]
```

**Right picture 2:** put the notebook in one shared place, or use a JWT.

```mermaid
graph TB
    A["Server A"] --> R["Shared store such as Redis"]
    B["Server B"] --> R
    R --> N["One notebook, both servers see the same note"]
```

### 2f. Which one should I pick?

A rough guide, not a law. Notice that the first question is about cancelling a login.

```mermaid
graph TB
    Q1["Must you block a user at once"] -->|yes| A["Sessions, or a short JWT with refresh tokens"]
    Q1 -->|not really| Q2["Many servers or many services"]
    Q2 -->|yes| B["JWT is easy, or sessions with a shared store"]
    Q2 -->|no| C["One web app on one site, a session in a cookie is simplest"]
```

## 3. Real life analogy

A **cloakroom** gives you a **numbered ticket** and keeps your coat. A **festival** gives you a **wristband** with your name and ticket type printed on it, and a hologram.

- The cloakroom is a **session**. The ticket means nothing alone. Staff check the shelf (the lookup). If you lose the ticket, the manager can throw it away.
- The festival wristband is a **JWT**. Guards read it and check the hologram. They do not call the office.
- Anyone can read the wristband. The hologram only proves it is real.
- If you are banned at noon, the cloakroom just throws your ticket away. A guard cannot cut a wristband off your arm. It works until the festival ends (the token runs out).

Where the analogy stops: a real wristband is checked by looking. A JWT is checked by maths, and the guard needs the same secret as the person who made it.

## 4. The smallest code that shows it

A session. The server keeps the note and the browser gets only the id.

```js
const { randomBytes } = require("node:crypto");
const sessions = new Map();                       // the server's notebook

function login(userId) {
  const id = randomBytes(16).toString("hex");     // random, means nothing
  sessions.set(id, { userId, role: "user" });     // the note stays on the server
  return id;                                      // the browser only gets the id
}
const sid = login(7);
console.log(sid.length);
console.log(sessions.get(sid));
sessions.delete(sid);                             // logout or ban: gone at once
console.log(sessions.get(sid));
```

**Output:**

```
32
{ userId: 7, role: 'user' }
undefined
```

A JWT. The server signs the note and keeps nothing. (A real app uses a library such as `jsonwebtoken`. This shows what the library does inside.)

```js
const { createHmac } = require("node:crypto");
const part = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const stamp = (text) => createHmac("sha256", "server-secret").update(text).digest("base64url");

const body = part({ alg: "HS256" }) + "." + part({ sub: "7", role: "user" });
const token = body + "." + stamp(body);           // header.payload.signature

const check = (t) => { const [h, p, s] = t.split("."); return stamp(h + "." + p) === s; };
console.log(check(token));

const fake = part({ alg: "HS256" }) + "." + part({ sub: "7", role: "admin" }) + "." + token.split(".")[2];
console.log(check(fake));                         // role changed, old stamp
console.log(JSON.parse(Buffer.from(token.split(".")[1], "base64url")));
```

**Output:**

```
true
false
{ sub: '7', role: 'user' }
```

Look at the last two lines. The edited token is rejected. But the payload of the real token was readable by anyone.

## 5. What really happens, step by step

The same moments, side by side.

| Step | Session | JWT |
|---|---|---|
| 1. Login with a right password | Server makes a random id like `a91f3c07…`. It saves `{ userId: 7, role: user }` in its notebook. | Server builds the payload `{ sub: 7, role: user, exp }`. It signs it with the secret. |
| 2. Reply | `Set-Cookie: sid=a91f3c07…` | The token, in the body or in a cookie. |
| 3. Browser holds | Only the id. | The whole signed note. |
| 4. Next request | The browser adds the cookie by itself. | Your code adds `Authorization: Bearer <token>`, or the browser adds a cookie. |
| 5. Server checks | **Looks the id up** in the notebook. | **Makes the stamp again** and checks the time. No lookup. |
| 6. A second server | Needs the shared notebook. | Needs only the same secret (or a public key). |
| 7. Ban the user now | Delete the note. Blocked at once. | Nothing to delete. The token works until it runs out. |
| 8. User edits the note | Cannot. The id means nothing. | The stamp no longer fits, so 401. |

**Step through it yourself:** [open the sessions vs JWT stepper](visuals/06-sessions-vs-jwt.html). It has five short stories: log in with a session, log in with a JWT, two servers, ban a user now, and someone edits the token. Write your guess first, then press Next. The cookie value and the token parts in it are real.

## 6. Why it exists and what it costs

- **Problem without it:** HTTP forgets. Without a session or a token, the user would type the password on every request.
- **How a session solves it:** the server keeps the note and trusts only its own notebook. The browser holds a random id, so it holds no facts to steal or edit.
- **How a JWT solves it:** the facts travel inside the token and the stamp proves they are real. Any server with the secret can check it. No notebook is needed.

| | Session | JWT |
|---|---|---|
| Cancel a login now | Easy. Delete the note. | Hard. Wait for the end of the time limit, or keep a ban list (a notebook again). |
| Cost on each request | One lookup (fast if the store is Redis) | Only maths |
| Many servers | Needs a shared store | Needs only the secret |
| Size on the wire | Small id | Larger (the whole token) |
| Facts can go stale | No, the server reads fresh facts | Yes. If you change the role, the old token still says the old role until it runs out. |
| Cookie risk | A cookie is sent by the browser by itself, so another site can try to trick it (CSRF). Use `SameSite`. | Same risk if the token is in a cookie. A token in a header is not sent by itself. |
| Easy to get wrong | Medium | Higher. Weak secret, wrong algorithm rule, secrets in the payload. |

Simple rule: **if you can use sessions, sessions are simpler and safer. Pick a JWT when you really need many servers or many services to check a user without calling one shared place.** Most real apps end up in the middle: a short JWT plus a refresh token that can be cancelled. That is [lesson 07](07-access-and-refresh-tokens.md).

<details><summary>Go deeper (optional): cookie flags, session id rules and JWT rules</summary>

**Cookie flags** (MDN and OWASP agree):

- `HttpOnly`: JavaScript on the page cannot read the cookie. This blunts theft by injected scripts (XSS).
- `Secure`: the browser sends the cookie only over HTTPS.
- `SameSite=Lax` or `Strict`: the browser does not send the cookie on most requests started by another site. This helps against CSRF. OWASP says do not treat it as a full replacement for CSRF tokens.
- The `__Host-` name prefix makes the browser enforce `Secure`, `Path=/` and no `Domain`.

**Session id rules** (OWASP Session Management Cheat Sheet):

- Use at least 64 bits of randomness from a secure random generator. `randomBytes(16)` gives 128 bits.
- Make a **new id after login**. This stops session fixation (an attacker plants an id first, then waits for you to log in with it).
- Set both an **idle timeout** and an **absolute timeout**, and enforce them on the server.
- On logout, delete the session on the server. Clearing the cookie in the browser is not enough.
- Do not keep session ids or JWTs in `localStorage`. Any injected script can read them.

**JWT rules** (RFC 8725, the JWT best practices):

- Give the library a fixed list of allowed algorithms. Reject everything else. Never accept `alg: none` from the token itself.
- Check `exp` (when it ends). Check `iss` (who made it) and `aud` (who it is for) when you have several services.
- Use a long random secret, not a short word. For many services, sign with a private key (RS256 or ES256) so other services check with the public key and never hold the signing key.
- Compare stamps in constant time (`crypto.timingSafeEqual`). The `===` in section 4 is fine for a lesson but not for production.

**A note on the name:** many tutorials say "JWT sessions". That is a JWT used as a login ticket. It is not the same thing as a server session. Be exact in an interview.

</details>

## 7. Common mistakes

**Wrong:** secrets in the payload.

```js
jwt.sign({ id: user.id, email: user.email, passwordHash: user.passwordHash, role: user.role }, SECRET);
```

**Right:** only what the server needs, and a time limit.

```js
jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: "15m", algorithm: "HS256" });
```

**Why:** the payload is base64 text. Anyone who gets the token can read it.

**Wrong:** reading a token without checking it.

```js
const payload = jwt.decode(token);        // decode does NOT check the stamp
if (payload.role === "admin") { /* ... */ }
```

**Right:**

```js
const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });   // checks stamp and time
```

**Why:** `decode` only reads. Anyone can type any payload and your code would believe it. Use `verify`.

**Wrong:** sessions kept in the memory of each server, with two or more servers. Ana looks logged out at random (picture 2e).

**Right:** one shared store (Redis or the database), or a JWT.

**Wrong:** a JWT that lasts 30 days with no way to cancel it. A stolen token works for 30 days.

**Right:** a short token (about 15 minutes) plus a refresh token you can cancel. See [lesson 07](07-access-and-refresh-tokens.md).

**Wrong:** keeping the login token in `localStorage` because it is easy.

**Right:** an `HttpOnly`, `Secure`, `SameSite` cookie, or keep the short token in memory. **Why:** OWASP says any injected script can read `localStorage`.

## 8. Watch and play

Links checked on 2026-10-23. I opened every page, and I checked each video's title and channel. I did not watch the videos, so I did not check their length.

- **Video:** [Session vs Token Authentication in 100 Seconds](https://www.youtube.com/watch?v=UBUNrFtufWo) by Fireship. A very short recap. Watch it after the stepper.
- **Play with it:** [The sessions vs JWT stepper](visuals/06-sessions-vs-jwt.html) in this folder. Guess first, then press Next.
- **Play with it:** [jwt.io debugger](https://jwt.io/). Paste this token: `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3Iiwicm9sZSI6InVzZXIifQ.qB7gXZpMqe4AVmsI2qEQhr_QRp4yTecAq71tNSfVkbk`. You see the decoded header and payload. Then type `server-secret` in the secret box and it shows "Valid secret". Change one letter of the secret and it fails. I tried this on the page.
- **Play with it:** [Chrome DevTools, the Cookies pane](https://developer.chrome.com/docs/devtools/application/cookies). Open any site you are logged in to. Find its session cookie and look at the `HttpOnly`, `Secure` and `SameSite` columns.
- **Read:** [HTTP cookies on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies). Shows `Set-Cookie` going out and `Cookie` coming back.
- **Read:** [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). The rules for session ids, cookie flags and timeouts.
- **Read:** [RFC 8725, JWT best practices](https://www.rfc-editor.org/rfc/rfc8725.html). The checklist for using JWTs safely.

<details><summary>More links (optional)</summary>

- **Read:** [RFC 7519, the JWT standard](https://www.rfc-editor.org/rfc/rfc7519.html). Section 4.1 lists the claim names: `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`.
- **Read:** [OWASP Top 10:2025, A07 Authentication Failures](https://top10.owasp.org/2025/). The list page, where A07 is named "Authentication Failures".

</details>

## 9. Practice

**A. Predict the output** (write your answer before opening)

```js
const serverA = new Map();
const serverB = new Map();
serverA.set("abc", { userId: 7 });              // Ana logged in on server A
console.log(serverA.get("abc"));
console.log(serverB.get("abc"));                // her next request lands on server B
```

<details><summary>Answer</summary>

```
{ userId: 7 }
undefined
```

Each server has its own notebook. Server B has no note for `abc`, so Ana gets 401. This is picture 2e. A shared store fixes it.

</details>

**B. Fix the bug**

```js
function requireAdmin(req, res, next) {
  const payload = jwt.decode(req.headers.authorization.split(" ")[1]);
  if (payload.role !== "admin") return res.sendStatus(403);
  next();
}
```

<details><summary>Answer</summary>

`jwt.decode` does not check the stamp. A user can type any payload, including `role: "admin"`, and pass. Use `verify`, and handle a bad token:

```js
function requireAdmin(req, res, next) {
  try {
    const token = (req.headers.authorization || "").split(" ")[1];
    const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    if (payload.role !== "admin") return res.sendStatus(403);
    next();
  } catch {
    res.sendStatus(401);                         // bad stamp, expired, or missing
  }
}
```

Note the two codes: a bad or missing token is **401** (we do not know who you are). A good token with the wrong role is **403** (we know who you are, and you may not). Lesson 08 goes deeper.

</details>

**C. Write it yourself**

Open `practice/06-sessions-vs-jwt.js`. There are three tasks:

1. Write a **session store** with `create`, `get` and `destroy`, and a time limit.
2. Write `signToken` and `verifyToken` for a small JWT with the Node `crypto` module.
3. Fill in a small table: for each fact, is it a **session** thing or a **JWT** thing?

Run the tests from the folder that contains `learn/`:

```
node --test learn/backend-api/practice/06-sessions-vs-jwt.test.js
```

<details><summary>One possible answer</summary>

```js
function createSessionStore({ ttlMs = 60_000, now = () => Date.now() } = {}) {
  const sessions = new Map();
  return {
    create(data) {
      const id = randomBytes(16).toString("hex");
      sessions.set(id, { data, expiresAt: now() + ttlMs });
      return id;
    },
    get(id) {
      const s = sessions.get(id);
      if (!s) return null;
      if (now() >= s.expiresAt) { sessions.delete(id); return null; }
      return s.data;
    },
    destroy(id) { sessions.delete(id); },
  };
}
```

```js
const stamp = (text, secret) => createHmac("sha256", secret).update(text).digest("base64url");

function signToken(payload, secret, { expiresInSeconds = 900, now = () => Date.now() } = {}) {
  const exp = Math.floor(now() / 1000) + expiresInSeconds;
  const body = encode({ alg: "HS256", typ: "JWT" }) + "." + encode({ ...payload, exp });
  return body + "." + stamp(body, secret);
}

function verifyToken(token, secret, { now = () => Date.now() } = {}) {
  try {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    if (decode(h).alg !== "HS256") return null;            // never trust alg "none"
    const good = Buffer.from(stamp(h + "." + p, secret));
    const got = Buffer.from(s);
    if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
    const payload = decode(p);
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now()) return null;
    return payload;
  } catch {
    return null;                                           // garbage in, null out
  }
}
```

Why the length check: `timingSafeEqual` throws if the two buffers have different lengths. Why `try`: a broken token must give `null`, not crash the server.

The table answers are: block at once = session, no lookup on each request = JWT, shared store for many servers = session, anyone can read the content = JWT, browser holds only a random id = session, facts can go stale = JWT.

</details>

## 10. Interview question

**Q:** "Sessions or JWT for authentication? How do you choose?"

<details><summary>A strong answer, in four parts</summary>

1. **Problem:** HTTP forgets the user after each request. The server needs a way to know who is calling, without asking for the password every time.
2. **How it works:** with a **session**, the server keeps a note and the browser holds a random id in a cookie. Each request is one lookup. With a **JWT**, the server signs a note with the facts inside (user id, role, expiry) and the client carries it. The server only checks the stamp and the time, so it keeps nothing.
3. **Tradeoff:** sessions are easy to cancel and the facts stay fresh, but many servers need a shared store. A JWT scales across servers and services with no lookup, but you cannot take it back before it expires, the payload is readable, and the facts can go stale. So I pick sessions for a simple web app on one site. I pick a JWT when many services must check users. I keep the JWT short (about 15 minutes) and pair it with a refresh token I can cancel.
4. **My example:** in your DBO case study, a separate **Auth service** owns login and issues the **JWT**, and the **API service** only checks it, so the API tier stays stateless. That is a true fact from your own notes. Your notes do not say how long DBO tokens last or whether it has refresh tokens. Add that if it is true, because an interviewer will ask.

</details>

## 11. Explain it back

Close this file. Press the **Record my explanation** button under this heading and explain the difference out loud, like to a new junior, in 4 parts: problem, how it works, tradeoff, my example. Use the words "notebook" and "stamp". Then save the transcript into `my-learning/recordings/`, or write your best version below. Run `/explain-check sessions vs jwt` or ask the `explain-coach` agent to review it.

### My explanation

<write here>

### Coach feedback

<the explain-coach agent writes here>

## 12. Review questions (day 1, 3, 7, 21)

1. Where is the "this is user 7" fact kept in a session? Where is it kept in a JWT?
2. An admin bans a user. Why is a session blocked at once but a JWT is not?
3. Your app moves from one server to three. What breaks with sessions in memory, and what are two fixes?
4. Draw the picture from section 2c from memory: the two time lines, with the session store in only one of them.

<details><summary>Answers</summary>

1. In a session, on the **server**, in its notebook. The browser holds only a random id. In a JWT, **inside the token** that the client carries. The server keeps nothing.
2. A session has a note on the server, so the admin deletes it and the next request finds nothing. A JWT is a note the user carries. The server holds nothing to delete, so the token works until its time limit ends.
3. Each server has its own notebook, so a request that lands on another server finds no note and gets 401. Fix 1: one **shared store** (Redis or the database). Fix 2: use a **JWT**, where every server only needs the secret.
4. Session: browser, server, store. Login saves the id in the store. Each request goes server to store and back. JWT: browser and server only. Login signs the token. Each request is a check of the stamp and time, with no store.

</details>

## Connected lessons

- [Access and refresh tokens](07-access-and-refresh-tokens.md): the next lesson. It fixes the biggest problem here, that you cannot cancel a JWT.
- [Authorization](08-authorization.md): once the server knows who you are, it must decide what you may do.
- [Password hashing](09-password-hashing.md): how the password is checked safely before the session or token is made.
- [Hasura: when and when not](14-hasura-when-and-when-not.md): Hasura reads a JWT and takes the role and user id from its claims.
- [Express middleware](03-express-middleware.md): the place where the cookie or token is checked before your route runs.
