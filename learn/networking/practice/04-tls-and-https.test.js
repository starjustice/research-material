const test = require("node:test");
const assert = require("node:assert");
const {
  modPow, dhPublic, dhShared, validateHandshake, whatObserverSees,
  canReadRecordedTraffic, acceptEarlyData, checkClientCert, sessionKeySteps, describeLeg,
} = require("./04-tls-and-https");

// ---------- modPow ----------

test("modPow: 5 to the 6 mod 23 is 8", () => {
  assert.strictEqual(modPow(5, 6, 23), 8);
});

test("modPow: 2 to the 10 mod 1000 is 24", () => {
  assert.strictEqual(modPow(2, 10, 1000), 24);
});

test("modPow: exponent 0 gives 1", () => {
  assert.strictEqual(modPow(5, 0, 23), 1);
  assert.strictEqual(modPow(0, 0, 23), 1);
});

test("modPow: exponent 1 gives the base after the remainder", () => {
  assert.strictEqual(modPow(30, 1, 23), 7);
});

test("modPow: a base of 0 gives 0 for a positive exponent", () => {
  assert.strictEqual(modPow(0, 5, 23), 0);
});

test("modPow: the result is always smaller than mod", () => {
  for (let e = 0; e < 30; e++) assert.ok(modPow(7, e, 13) < 13);
});

test("modPow: big numbers stay exact (needs BigInt inside)", () => {
  assert.strictEqual(modPow(7, 123456789, 1000000007), 467332791);
  assert.strictEqual(modPow(3, 200, 1009), 985);
});

test("modPow: a huge intermediate number does not lose digits", () => {
  // 999999937 * 999999937 is more than 2 to the 53, so plain numbers would round it
  assert.strictEqual(modPow(999999937, 2, 1000000007), 4900);
});

// ---------- dhPublic and dhShared ----------

test("dhPublic: g 5, secret 6, p 23 gives 8", () => {
  assert.strictEqual(dhPublic(5, 6, 23), 8);
});

test("dhPublic: g 5, secret 15, p 23 gives 19", () => {
  assert.strictEqual(dhPublic(5, 15, 23), 19);
});

test("dhShared: their public 19 and my secret 6 give 2", () => {
  assert.strictEqual(dhShared(19, 6, 23), 2);
});

test("dhShared: their public 8 and my secret 15 give 2", () => {
  assert.strictEqual(dhShared(8, 15, 23), 2);
});

test("dhShared: it uses the secret as the exponent, not the public value", () => {
  assert.notStrictEqual(dhShared(19, 6, 23), dhShared(6, 19, 23));
});

test("dh: both sides get the same shared secret for many secrets", () => {
  for (let a = 1; a < 22; a += 3) {
    for (let b = 1; b < 22; b += 4) {
      const mine = dhShared(dhPublic(5, b, 23), a, 23);
      assert.strictEqual(typeof mine, "number");
      assert.strictEqual(mine, dhShared(dhPublic(5, a, 23), b, 23));
    }
  }
});

test("dh: works with a bigger prime", () => {
  const p = 1000000007;
  const a = 123456, b = 654321;
  const mine = dhShared(dhPublic(5, b, p), a, p);
  assert.strictEqual(typeof mine, "number");
  assert.strictEqual(mine, dhShared(dhPublic(5, a, p), b, p));
});

// ---------- sessionKeySteps ----------

test("sessionKeySteps: the numbers from the lesson", () => {
  assert.deepStrictEqual(sessionKeySteps(6, 15, 5, 23), {
    clientPublic: 8, serverPublic: 19, clientShared: 2, serverShared: 2, same: true,
  });
});

test("sessionKeySteps: swapping the secrets swaps the public values but keeps the shared secret", () => {
  const r = sessionKeySteps(15, 6, 5, 23);
  assert.strictEqual(r.clientPublic, 19);
  assert.strictEqual(r.serverPublic, 8);
  assert.strictEqual(r.clientShared, 2);
  assert.strictEqual(r.same, true);
});

test("sessionKeySteps: same is a boolean and matches the two shared values", () => {
  const r = sessionKeySteps(4, 9, 7, 101);
  assert.strictEqual(typeof r.same, "boolean");
  assert.strictEqual(r.same, r.clientShared === r.serverShared);
  assert.strictEqual(r.same, true);
});

// ---------- validateHandshake ----------

const FULL = ["ClientHello", "ServerHello", "EncryptedExtensions", "Certificate", "CertificateVerify", "Finished", "Finished"];
const MUTUAL = ["ClientHello", "ServerHello", "EncryptedExtensions", "CertificateRequest", "Certificate", "CertificateVerify", "Finished", "Certificate", "CertificateVerify", "Finished"];
const RESUMED = ["ClientHello", "ServerHello", "EncryptedExtensions", "Finished", "Finished"];

test("validateHandshake: a full handshake in the right order", () => {
  assert.deepStrictEqual(validateHandshake([...FULL], "full"), { ok: true });
});

test("validateHandshake: a mutual handshake in the right order", () => {
  assert.deepStrictEqual(validateHandshake([...MUTUAL], "mutual"), { ok: true });
});

test("validateHandshake: a resumed handshake has no certificate", () => {
  assert.deepStrictEqual(validateHandshake([...RESUMED], "resumed"), { ok: true });
});

test("validateHandshake: the resumed list is wrong for mode full", () => {
  const r = validateHandshake([...RESUMED], "full");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.at, 3);
  assert.strictEqual(r.reason, "unexpected Finished after EncryptedExtensions");
});

test("validateHandshake: the full list is wrong for mode resumed", () => {
  const r = validateHandshake([...FULL], "resumed");
  assert.deepStrictEqual(r, { ok: false, reason: "unexpected Certificate after EncryptedExtensions", at: 3 });
});

test("validateHandshake: the full list is wrong for mode mutual", () => {
  const r = validateHandshake([...FULL], "mutual");
  assert.deepStrictEqual(r, { ok: false, reason: "unexpected Certificate after EncryptedExtensions", at: 3 });
});

test("validateHandshake: an empty list", () => {
  assert.deepStrictEqual(validateHandshake([], "full"), { ok: false, reason: "no messages", at: 0 });
});

test("validateHandshake: must start with ClientHello", () => {
  assert.deepStrictEqual(validateHandshake(["ServerHello", "ClientHello"], "full"), { ok: false, reason: "must start with ClientHello", at: 0 });
});

test("validateHandshake: a server flight before the ServerHello", () => {
  const r = validateHandshake(["ClientHello", "Certificate"], "full");
  assert.deepStrictEqual(r, { ok: false, reason: "unexpected Certificate after ClientHello", at: 1 });
});

test("validateHandshake: Certificate and CertificateVerify swapped", () => {
  const swapped = [...FULL];
  [swapped[3], swapped[4]] = [swapped[4], swapped[3]];
  assert.deepStrictEqual(validateHandshake(swapped, "full"), { ok: false, reason: "unexpected CertificateVerify after EncryptedExtensions", at: 3 });
});

test("validateHandshake: the list stops before the last Finished", () => {
  assert.deepStrictEqual(validateHandshake(FULL.slice(0, 6), "full"), { ok: false, reason: "handshake not finished", at: 6 });
});

test("validateHandshake: only a ClientHello is not finished", () => {
  assert.deepStrictEqual(validateHandshake(["ClientHello"], "full"), { ok: false, reason: "handshake not finished", at: 1 });
});

test("validateHandshake: an extra message at the end", () => {
  const r = validateHandshake([...FULL, "Certificate"], "full");
  assert.deepStrictEqual(r, { ok: false, reason: "unexpected Certificate after the handshake", at: 7 });
});

test("validateHandshake: mutual without the CertificateRequest", () => {
  const list = MUTUAL.filter((t) => t !== "CertificateRequest");
  const r = validateHandshake(list, "mutual");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.at, 3);
});

test("validateHandshake: the client Finished must come last in mutual", () => {
  const list = [...MUTUAL];
  [list[8], list[9]] = [list[9], list[8]];
  const r = validateHandshake(list, "mutual");
  assert.deepStrictEqual(r, { ok: false, reason: "unexpected Finished after Certificate", at: 8 });
});

test("validateHandshake: an unknown mode throws", () => {
  assert.throws(() => validateHandshake([...FULL], "quick"), /mode/);
});

test("validateHandshake: the first problem wins", () => {
  const r = validateHandshake(["ClientHello", "Finished", "Finished", "Finished"], "full");
  assert.strictEqual(r.at, 1);
});

test("validateHandshake: does not change its input", () => {
  const list = [...FULL];
  validateHandshake(list, "full");
  assert.deepStrictEqual(list, FULL);
});

// ---------- whatObserverSees ----------

test("whatObserverSees: TLS 1.3 without ECH", () => {
  assert.deepStrictEqual(whatObserverSees({ tlsVersion: "1.3", ech: false }), [
    "destination ip", "destination port", "message sizes", "message timing", "server name (SNI)",
  ]);
});

test("whatObserverSees: TLS 1.3 with ECH hides the server name", () => {
  assert.deepStrictEqual(whatObserverSees({ tlsVersion: "1.3", ech: true }), [
    "destination ip", "destination port", "message sizes", "message timing",
  ]);
});

test("whatObserverSees: TLS 1.2 also shows the certificate", () => {
  assert.deepStrictEqual(whatObserverSees({ tlsVersion: "1.2", ech: false }), [
    "destination ip", "destination port", "message sizes", "message timing", "server certificate", "server name (SNI)",
  ]);
});

test("whatObserverSees: TLS 1.2 with ECH still shows the certificate", () => {
  const list = whatObserverSees({ tlsVersion: "1.2", ech: true });
  assert.ok(list.includes("server certificate"));
  assert.ok(!list.includes("server name (SNI)"));
});

test("whatObserverSees: the list is sorted", () => {
  const list = whatObserverSees({ tlsVersion: "1.2", ech: false });
  assert.deepStrictEqual(list, [...list].sort());
});

test("whatObserverSees: never the page, the cookies or the body", () => {
  for (const v of ["1.2", "1.3"]) {
    for (const ech of [true, false]) {
      const text = whatObserverSees({ tlsVersion: v, ech }).join(" ");
      assert.ok(!/path|cookie|header|body|page/.test(text));
    }
  }
});

// ---------- canReadRecordedTraffic ----------

test("canReadRecordedTraffic: rsa and a leaked key opens the old recording", () => {
  assert.strictEqual(canReadRecordedTraffic("rsa", true), true);
});

test("canReadRecordedTraffic: rsa and no leak keeps it closed", () => {
  assert.strictEqual(canReadRecordedTraffic("rsa", false), false);
});

test("canReadRecordedTraffic: ecdhe stays closed even when the key leaks", () => {
  assert.strictEqual(canReadRecordedTraffic("ecdhe", true), false);
  assert.strictEqual(canReadRecordedTraffic("ecdhe", false), false);
});

test("canReadRecordedTraffic: an unknown key exchange throws", () => {
  assert.throws(() => canReadRecordedTraffic("des", true), /rsa or ecdhe/);
});

// ---------- acceptEarlyData ----------

test("acceptEarlyData: a fresh GET is fine", () => {
  assert.strictEqual(acceptEarlyData("GET", false), true);
});

test("acceptEarlyData: a fresh HEAD is fine", () => {
  assert.strictEqual(acceptEarlyData("HEAD", false), true);
});

test("acceptEarlyData: letter case does not matter", () => {
  assert.strictEqual(acceptEarlyData("get", false), true);
  assert.strictEqual(acceptEarlyData("Head", false), true);
});

test("acceptEarlyData: a POST is refused", () => {
  assert.strictEqual(acceptEarlyData("POST", false), false);
});

test("acceptEarlyData: PUT, PATCH and DELETE are refused", () => {
  for (const m of ["PUT", "PATCH", "DELETE", "post"]) assert.strictEqual(acceptEarlyData(m, false), false);
});

test("acceptEarlyData: a GET with a ticket that was used before is refused", () => {
  assert.strictEqual(acceptEarlyData("GET", true), false);
});

test("acceptEarlyData: returns real booleans", () => {
  assert.strictEqual(typeof acceptEarlyData("GET", false), "boolean");
  assert.strictEqual(typeof acceptEarlyData("POST", true), "boolean");
});

// ---------- checkClientCert ----------

test("checkClientCert: not required means ok, with or without a certificate", () => {
  assert.deepStrictEqual(checkClientCert(false, null, ["Demo Root"]), { ok: true });
  assert.deepStrictEqual(checkClientCert(false, "Evil CA", ["Demo Root"]), { ok: true });
});

test("checkClientCert: required and missing", () => {
  assert.deepStrictEqual(checkClientCert(true, null, ["Demo Root"]), { ok: false, alert: "certificate_required" });
});

test("checkClientCert: required and from an unknown issuer", () => {
  assert.deepStrictEqual(checkClientCert(true, "Evil CA", ["Demo Root"]), { ok: false, alert: "unknown_ca" });
});

test("checkClientCert: required and from a trusted issuer", () => {
  assert.deepStrictEqual(checkClientCert(true, "Demo Root", ["Demo Root", "Other"]), { ok: true });
});

test("checkClientCert: an empty trust list trusts nobody", () => {
  assert.deepStrictEqual(checkClientCert(true, "Demo Root", []), { ok: false, alert: "unknown_ca" });
});

test("checkClientCert: does not change the trust list", () => {
  const trusted = ["Demo Root"];
  checkClientCert(true, "Demo Root", trusted);
  assert.deepStrictEqual(trusted, ["Demo Root"]);
});

// ---------- describeLeg ----------

test("describeLeg: http", () => {
  assert.deepStrictEqual(describeLeg("http"), { port: 80, encrypted: false, proves: "nothing" });
});

test("describeLeg: https", () => {
  assert.deepStrictEqual(describeLeg("https"), { port: 443, encrypted: true, proves: "who you talk to" });
});

test("describeLeg: letter case does not matter", () => {
  assert.strictEqual(describeLeg("HTTPS").port, 443);
  assert.strictEqual(describeLeg("Http").encrypted, false);
});

test("describeLeg: another scheme throws", () => {
  assert.throws(() => describeLeg("ftp"), /http or https/);
});
