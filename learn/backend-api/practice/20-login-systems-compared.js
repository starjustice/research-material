// Lesson 20: Login systems compared. Do the four tasks below, then run:
//   node --test learn/backend-api/practice/20-login-systems-compared.test.js
//
// Uses only built-in modules. Times are in seconds, like the exp claim in a token.
const crypto = require("node:crypto");

// 1. WRITE IT: pkceChallenge(verifier)
//    The "code challenge" for PKCE method S256 is: take the verifier text as ASCII bytes,
//    make a SHA-256 hash of it, and write the hash in base64url (no "=" padding).
//    The RFC 7636 example: the verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
//    gives the challenge "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM".
function pkceChallenge(verifier) {
  // TODO
}

// 2. WRITE IT: checkIdToken(claims, expected)
//    claims   = what the ID token says:  { iss, aud, exp, nonce, sub }
//    expected = what you know:           { issuer, clientId, nonce, now }
//    Check in this order. Return { ok: true }, or { ok: false, reason } with the first failing reason:
//      "issuer"    claims.iss is not exactly expected.issuer
//      "audience"  expected.clientId is not in claims.aud (aud is a string or an array of strings)
//      "expired"   expected.now is not before claims.exp
//      "nonce"     claims.nonce is not exactly expected.nonce (a missing nonce fails too)
//    Missing or broken input must give { ok: false, ... }, never an exception.
function checkIdToken(claims, expected) {
  // TODO
}

// 3. WRITE IT: redirectAllowed(uri, registered)
//    registered is the list of redirect URIs the app signed up with.
//    true only if uri is exactly equal to one of them (simple string comparison).
//    A URI that only starts with a registered one is NOT allowed. Never throw.
function redirectAllowed(uri, registered) {
  // TODO
}

// 4. THINK: for each situation write one word: "session", "api-key", "oauth", "oidc" or "saml".
const choices = {
  stayLoggedInOnMyOwnWebsite: "",          // a browser, my own server, my own users
  signInWithGoogleButton: "",              // I want to know who the user is, from another service
  partnerAppMayReadOneUsersFilesOnly: "",  // limited, user-approved access for another app
  buildScriptCallsMyApi: "",               // a program, no person present
  customerItSaysWeOnlySupportSaml: "",     // staff sign in with their company's own system
};

module.exports = { pkceChallenge, checkIdToken, redirectAllowed, choices };
