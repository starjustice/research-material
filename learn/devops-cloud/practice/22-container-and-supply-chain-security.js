// Lesson 22: Container and supply chain security. Write the five pieces below, then run:
//   node --test learn/devops-cloud/practice/22-container-and-supply-chain-security.test.js
//
// This is a small model of four checks that real tools do: a Dockerfile linter (like hadolint),
// the deploy check that cosign and an admission policy do, npm's wait-before-install setting,
// and a vulnerability scan with a pass or fail gate (like trivy with --exit-code 1).
// Plain JavaScript, no packages. Never change the inputs you are given.
//
//   lintDockerfile(text)
//       text is a whole Dockerfile. Return a list of { line, rule }, sorted by line number
//       (the first line is 1), and for the same line by rule name (a to z). The same rule is
//       reported once per line. Skip empty lines and lines that start with #. A line that ends
//       with a backslash continues on the next line: it is one instruction, and its line number
//       is the number of its first line. Instruction words are not case sensitive (from = FROM).
//
//       Seven rules:
//
//       "latest-tag"       a FROM line whose image has no tag, or the tag latest.
//                          Fine (no finding): an image with @sha256: in it, "scratch", a name that
//                          is an earlier stage alias (FROM build), an image with a $ in it.
//                          A registry port is not a tag: in localhost:5000/app the tag is missing.
//                          Ignore flags like --platform=linux/amd64 and ignore AS name at the end.
//       "root-user"        Look only at the LAST stage (from the last FROM to the end).
//                          No USER line in it: report the line of that last FROM, unless its image
//                          tag contains "nonroot" (like gcr.io/distroless/nodejs24-debian13:nonroot).
//                          Otherwise look at the last USER line: report it when the user is root or 0
//                          (also root:something or 0:0, root in any letter case).
//       "secret-in-env"    an ENV or ARG that names a secret. The name has PASSWORD, PASSWD, SECRET,
//                          TOKEN, APIKEY or API_KEY, PRIVATEKEY or PRIVATE_KEY, ACCESSKEY or
//                          ACCESS_KEY (letter case does not matter). ENV has two forms:
//                          "ENV NAME=value NAME2=value2" and "ENV NAME value". ENV counts only when the
//                          value is not empty. ARG always counts, with or without a default value.
//       "secret-file"      a COPY or ADD that has one of these as a source (look at the last part of
//                          the path): .env, .env.something, anything.pem, anything.key, id_rsa,
//                          id_ed25519, .npmrc. A COPY with --from=... copies from another stage: skip it.
//                          The last word of the line is the destination, not a source.
//       "npm-not-ci"       a RUN with "npm install" or "npm i" that names no package. Use npm ci.
//       "unpinned-package" a RUN that installs a package without a version:
//                            npm install or npm i with a package that has no @version (a scoped
//                              name like @scope/pkg also needs a second @; ignore names that start
//                              with . or / or that have :// in them)
//                            apt-get install or apt install with a package that has no =version
//                            apk add with a package that has no =version
//                          Words that start with - are flags, not packages. A RUN can hold several
//                          commands joined by &&, ; or ||. Look at each command on its own.
//       "curl-pipe-shell"  a RUN that pipes curl or wget into sh or bash (for example
//                          curl -fsSL https://x.test/i.sh | sh). Also with sudo before sh.
//
//   verifyDeploy(ref, signatures, policy)
//       The deploy gate. ref is an image name, for example "ghcr.io/me/app@sha256:aaa11" or
//       "ghcr.io/me/app:1.0". signatures is a list of { digest, identity, issuer }.
//       policy is { identity, issuer }. Return one of:
//         { ok: false, reason: "not-pinned" }    ref does not end with @sha256: and hex letters
//                                                (a tag can move, so you cannot sign a tag)
//         { ok: false, reason: "unsigned" }      no signature has this digest
//         { ok: false, reason: "wrong-signer" }  a signature has this digest, but none of them has
//                                                the exact identity AND the exact issuer of the policy
//         { ok: true }                           otherwise
//       Check in that order. The digest is the part after the @ (it starts with sha256:).
//
//   cooldownOk(publishedAt, now, minDays)
//       Like npm's min-release-age setting. publishedAt and now are date texts such as
//       "2026-11-19T10:00:00Z". Return true when the version was published MORE than minDays
//       days ago (a day is 24 hours; exactly minDays days is not enough, the npm docs say
//       "more than the given number of days ago"). When minDays is 0, null or undefined there
//       is no cooldown: return true, whatever the dates are. Otherwise a version published
//       in the future is never ok.
//
//   scan(sbom, advisories)
//       sbom is the list of what is in the image: [{ name, version }]. advisories is what the
//       scanner knows: [{ id, name, affected: ["1.0.0", "1.0.1"], fixed: "1.0.2", severity }]
//       (fixed may be null). severity is LOW, MEDIUM, HIGH or CRITICAL.
//       Return a list of { id, name, version, severity, fixed }: one for every package in the sbom
//       that has an advisory with the same name and its version in affected. The same name and
//       version in the sbom twice is counted once. Sort: CRITICAL first, then HIGH, MEDIUM, LOW.
//       Same severity: by name (a to z), then by id (a to z). A package with no advisory gives
//       nothing: a scanner only finds holes that it already knows.
//
//   gate(findings, failOn)
//       Like trivy --exit-code 1 --severity. Return 1 when some finding has a severity at least as
//       bad as failOn (LOW < MEDIUM < HIGH < CRITICAL), else 0. For example gate(f, "HIGH") fails on
//       HIGH and CRITICAL. Throw an Error when failOn is not one of the four names.

function lintDockerfile(text) {
  // TODO
}

function verifyDeploy(ref, signatures, policy) {
  // TODO
}

function cooldownOk(publishedAt, now, minDays) {
  // TODO
}

function scan(sbom, advisories) {
  // TODO
}

function gate(findings, failOn) {
  // TODO
}

module.exports = { lintDockerfile, verifyDeploy, cooldownOk, scan, gate };
