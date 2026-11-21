// Lesson 04 (networking): TLS and HTTPS. Write the nine pieces below, then run:
//   node --test learn/networking/practice/04-tls-and-https.test.js
//
// This is a small model of how a TLS 1.3 connection works. No network is used. Numbers are tiny
// so you can follow them by hand. Real TLS uses huge numbers (or elliptic curves) instead.
//
//   modPow(base, exp, mod)
//       base to the power exp, then the remainder after dividing by mod. Whole numbers only.
//       Use BigInt inside so big numbers stay exact. Return a normal number.
//       modPow(5, 6, 23) is 8. modPow(2, 10, 1000) is 24. exp 0 gives 1 (when mod is more than 1).
//
//   dhPublic(g, secret, p)
//       The public value you send: g to the power secret, remainder after dividing by p.
//
//   dhShared(theirPublic, mySecret, p)
//       The shared secret: their public value to the power of your own secret, remainder after p.
//       Both sides get the same number. That is the whole trick.
//
//   validateHandshake(types, mode)
//       types is a list of message names in the order they were sent (both directions together).
//       mode is "full", "mutual" or "resumed". The right order for each:
//         full:    ClientHello, ServerHello, EncryptedExtensions, Certificate, CertificateVerify,
//                  Finished, Finished
//         mutual:  ClientHello, ServerHello, EncryptedExtensions, CertificateRequest, Certificate,
//                  CertificateVerify, Finished, Certificate, CertificateVerify, Finished
//         resumed: ClientHello, ServerHello, EncryptedExtensions, Finished, Finished
//       Return { ok: true } when the list is exactly right.
//       Otherwise return { ok: false, reason, at } where at is the index of the first problem:
//         an empty list: reason "no messages", at 0
//         the first message is not ClientHello: reason "must start with ClientHello", at 0
//         a message in the wrong place: reason "unexpected <type> after <previous type>", at its index
//         the list stops too early: reason "handshake not finished", at types.length
//         extra messages at the end: reason "unexpected <type> after the handshake", at its index
//       An unknown mode throws an Error.
//
//   whatObserverSees(options)
//       options: { tlsVersion: "1.2" or "1.3", ech: true or false }. Someone who watches the wire
//       (not the server, not the browser) sees these things. Return them as a sorted list of text:
//         always:               "destination ip", "destination port", "message sizes", "message timing"
//         when ech is false:    "server name (SNI)"
//         when tlsVersion is "1.2": "server certificate"
//       The page you asked for, the headers, the cookies and the body are never in the list.
//
//   canReadRecordedTraffic(keyExchange, serverKeyLeaked)
//       keyExchange is "rsa" (old TLS 1.2: the session key travels, locked with the server's
//       long term key) or "ecdhe" (a new throwaway key pair for every connection).
//       Someone recorded the encrypted traffic last year. Now the server's long term private key leaks.
//       serverKeyLeaked is true or false. Return true when the old recording can now be read.
//       Only "rsa" with a leaked key can. Any other keyExchange throws an Error.
//
//   acceptEarlyData(method, ticketUsedBefore)
//       0-RTT: the client sends a request in its very first message. An attacker can copy it and
//       send it again. Return true only when the method is GET or HEAD (any letter case) and the
//       ticket was not used before. Everything else (POST, PUT, PATCH, DELETE) returns false.
//
//   checkClientCert(requireClientCert, clientCertIssuer, trustedIssuers)
//       mTLS: the server may ask the client for a certificate too.
//       requireClientCert false: return { ok: true }.
//       requireClientCert true and clientCertIssuer is null: { ok: false, alert: "certificate_required" }.
//       Issuer not in trustedIssuers: { ok: false, alert: "unknown_ca" }. Otherwise { ok: true }.
//
//   sessionKeySteps(clientSecret, serverSecret, g, p)
//       Run the toy key exchange and return all the numbers:
//       { clientPublic, serverPublic, clientShared, serverShared, same } where same is a boolean.
//
//   describeLeg(scheme)
//       "http" or "https" (any letter case). Return { port, encrypted, proves } :
//         http:  { port: 80, encrypted: false, proves: "nothing" }
//         https: { port: 443, encrypted: true, proves: "who you talk to" }
//       Any other scheme throws an Error.

// Write your code here. Each function below is empty on purpose.
function modPow(base, exp, mod) {}
function dhPublic(g, secret, p) {}
function dhShared(theirPublic, mySecret, p) {}
function validateHandshake(types, mode) {}
function whatObserverSees(options) {}
function canReadRecordedTraffic(keyExchange, serverKeyLeaked) {}
function acceptEarlyData(method, ticketUsedBefore) {}
function checkClientCert(requireClientCert, clientCertIssuer, trustedIssuers) {}
function sessionKeySteps(clientSecret, serverSecret, g, p) {}
function describeLeg(scheme) {}

module.exports = { modPow, dhPublic, dhShared, validateHandshake, whatObserverSees, canReadRecordedTraffic, acceptEarlyData, checkClientCert, sessionKeySteps, describeLeg };
