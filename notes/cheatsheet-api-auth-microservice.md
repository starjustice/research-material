# Cheat Sheet: API Request, Auth (JWT), Microservices

Personal reference notes (not part of the assessment submission). Examples in JavaScript/Express since that's the clearest mental model.

---

## 1. API Request Basics

### HTTP methods = CRUD

| Method | Purpose | Example |
|---|---|---|
| GET | Read data | `GET /api/pengajuan-kredit` (list), `GET /api/pengajuan-kredit/:id` (one) |
| POST | Create data | `POST /api/pengajuan-kredit` |
| PUT | Update data (replace) | `PUT /api/pengajuan-kredit/:id` |
| DELETE | Remove data | `DELETE /api/pengajuan-kredit/:id` |

### Anatomy of a request/response

```
Request:
  Method + Path   -> POST /api/pengajuan-kredit
  Headers         -> Authorization: Bearer <token>, Content-Type: application/json
  Body            -> { "plafon": 100000000, "bunga": 12, "tenor": 60 }

Response:
  Status code     -> 201 Created
  Headers         -> Content-Type: application/json
  Body            -> { "id": "...", "plafon": 100000000, ... }
```

### Common status codes

| Code | Meaning | When |
|---|---|---|
| 200 | OK | successful GET/PUT |
| 201 | Created | successful POST |
| 204 | No Content | successful DELETE, nothing to return |
| 400 | Bad Request | invalid input (failed validation) |
| 401 | Unauthorized | no/invalid/expired token |
| 403 | Forbidden | valid token, but not allowed to do this action |
| 404 | Not Found | resource doesn't exist |
| 429 | Too Many Requests | rate limit exceeded |
| 500 | Internal Server Error | unhandled exception on the server |

### Minimal Express route

```js
const express = require('express');
const app = express();
app.use(express.json()); // parses JSON request bodies into req.body

app.get('/api/pengajuan-kredit', (req, res) => {
  res.status(200).json([{ id: 1, plafon: 100000000 }]);
});

app.post('/api/pengajuan-kredit', (req, res) => {
  const { plafon, bunga, tenor } = req.body;
  if (!plafon || plafon <= 0) {
    return res.status(400).json({ message: 'Plafon harus lebih dari 0' });
  }
  res.status(201).json({ id: 1, plafon, bunga, tenor });
});

app.listen(3000);
```

---

## 2. Authentication (JWT)

### What a JWT is

`header.payload.signature` - three base64 parts separated by dots. The signature proves the payload wasn't tampered with and was issued by whoever holds the signing key.

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.KJQ5IbgseSpydhzJJ0ISHVyw0RFWFwuBahY-4elZ7wU
   ^ header             ^ payload            ^ signature
   (algorithm)           (claims: sub, exp)   (proof of authenticity)
```

### Login flow - issuing a token

```js
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'shared-secret'; // symmetric: same key used to sign AND verify

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== 'admin' || password !== 'admin123') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: username },              // payload/claims
    SECRET_KEY,                     // signing key
    { expiresIn: '1h', issuer: 'MyAuthService' }
  );

  res.json({ token });
});
```

### Middleware to protect routes - validating a token

```js
function requireAuth(req, res, next) {
  const header = req.headers.authorization; // "Bearer <token>"

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, SECRET_KEY, { issuer: 'MyAuthService' });
    req.user = decoded;  // attach identity for downstream handlers
    next();              // valid -> continue to the route handler
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.get('/api/pengajuan-kredit', requireAuth, (req, res) => {
  res.json({ calledBy: req.user.sub, data: [] });
});
```

**Key fact:** `jwt.verify()` never hits a database or calls another service. It's pure local cryptographic computation - that's the whole point of JWTs (stateless auth).

### Token valid vs user valid (important gotcha)

- `jwt.verify()` only proves: genuine signature + not expired + right issuer/audience.
- It does **NOT** know if the underlying user account was deleted/deactivated/banned *after* the token was issued.
- To catch that, add an extra check after `jwt.verify()`:

```js
function requireAuthWithUserCheck(req, res, next) {
  // ...jwt.verify() as above...
  const user = usersTable[decoded.sub];
  if (!user || !user.active) {
    return res.status(401).json({ message: 'User account is no longer active' });
  }
  req.user = decoded;
  next();
}
```

### Symmetric vs Asymmetric signing

| | Symmetric (HS256) | Asymmetric (RS256) |
|---|---|---|
| Keys | One shared secret | Private key (sign) + public key (verify) |
| Who can sign | Anyone with the secret | Only holder of the private key |
| Who can verify | Anyone with the secret | Anyone with the public key |
| Use case | Single service / simple setups | Multiple services verifying tokens from one Auth Service |

```js
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Auth Service: sign with PRIVATE key
const token = jwt.sign({ sub: 'admin' }, privateKey, { algorithm: 'RS256' });

// Any other service: verify with PUBLIC key only (can verify, can never forge)
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

---

## 3. Microservices

### Monolith vs microservices

```
Monolith:                        Microservices:
+-------------------+            +-------+  +--------+  +----------+
|  One process      |            | Auth  |  | Kredit |  | Angsuran |
|  Auth + Kredit +   |    vs      |Service|  |Service |  | Service  |
|  Angsuran all in   |            +-------+  +--------+  +----------+
|  one app           |               separate processes, separate DBs,
+-------------------+                deployed/scaled independently
```

### API Gateway pattern

Single entry point in front of all services. Handles cross-cutting concerns so individual services don't have to:

```
Client -> Load Balancer -> API Gateway -> [Auth Service | Kredit Service | Angsuran Service]
                              |
                     rate limiting, TLS termination,
                     routing, JWT validation
```

### Service-to-service communication

```js
// Synchronous (need the answer right now) - plain HTTP call
const response = await fetch('http://kredit-service:4002/api/pengajuan-kredit/123');
const data = await response.json();

// Asynchronous (fire and forget / eventual processing) - message queue
// e.g. publish an event, another service consumes it later
await queue.publish('pengajuan.created', { id: 123, plafon: 100000000 });
```

### Each service should own its data

```
Auth Service    -> Auth DB       (users, credentials)
Kredit Service  -> Kredit DB     (pengajuan_kredit table) + Redis cache
Angsuran Service -> no DB needed (pure calculation, stateless)
```
Rule of thumb: never let two services share one database directly - that couples their deployments and schemas together, defeating the point of splitting them up.

### Auth in a microservices setup - who does what

```
Auth Service:
  - checks credentials at login
  - signs and issues JWT (holds the private/secret key)
  - (optional) handles refresh tokens, revocation list

Every other service (Kredit, Angsuran, or the Gateway):
  - receives the JWT on incoming requests
  - verifies it LOCALLY (shared secret, or public key)
  - NEVER calls back to Auth Service just to check a token
```

### Quick two-service demo (matches what we ran and tested live)

```js
// auth-service.js (port 4001) - issues tokens
app.post('/login', (req, res) => { /* ...check creds, jwt.sign()... */ });

// kredit-service.js (port 4002) - validates tokens independently
app.get('/pengajuan-kredit', requireAuth, (req, res) => { /* ... */ });
```
Proven live earlier: calling Kredit Service with a valid token from Auth Service works and returns data, with zero network traffic between the two services during validation - only during the original login.

---

## Quick reference: this project's actual mapping

| Concept above | Your real C# file |
|---|---|
| Express route | `Controllers/PengajuanKreditController.cs` |
| `requireAuth` middleware | `[Authorize]` + JWT Bearer middleware in `Program.cs` |
| `jwt.sign()` | `AuthController.Login()` |
| `jwt.verify()` config | `TokenValidationParameters` in `Program.cs` |
| Shared secret | `Jwt:Key` in `appsettings.json` |
| Route validation (`if (!plafon...)`) | `[Range]` attributes on DTOs |
