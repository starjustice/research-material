const test = require("node:test");
const assert = require("node:assert");
const { lintDockerfile, verifyDeploy, cooldownOk, scan, gate } = require("./22-container-and-supply-chain-security");

const same = (value) => JSON.parse(JSON.stringify(value));
// "3:root-user" style lines are easier to read in a failing test than a list of objects.
const found = (text) => lintDockerfile(text).map((f) => f.line + ":" + f.rule);
// A tiny Dockerfile that has no problem at all, to put one bad line into.
const goodBase = "FROM node:24-alpine@sha256:abc123\n";
const user = "USER node\n";

// ---------- lintDockerfile: latest-tag ----------

test("lint: a clean Dockerfile has no findings", () => {
  const text = [
    "FROM node:24-alpine@sha256:abc123 AS build",
    "WORKDIR /app",
    "COPY package*.json ./",
    "RUN npm ci",
    "COPY . .",
    "RUN npm run build",
    "",
    "FROM node:24-alpine@sha256:abc123",
    "WORKDIR /app",
    "COPY --from=build /app/dist ./dist",
    "USER node",
    'CMD ["node", "dist/server.js"]',
  ].join("\n");
  assert.deepStrictEqual(lintDockerfile(text), []);
});

test("lint: an empty Dockerfile has no findings", () => {
  assert.deepStrictEqual(lintDockerfile(""), []);
  assert.deepStrictEqual(lintDockerfile("# only a comment\n\n"), []);
});

test("lint: the result items are plain { line, rule } objects", () => {
  assert.deepStrictEqual(lintDockerfile("FROM node:latest\nUSER node"), [{ line: 1, rule: "latest-tag" }]);
});

test("lint latest-tag: the tag latest is flagged", () => {
  assert.deepStrictEqual(found("FROM node:latest\nUSER node"), ["1:latest-tag"]);
});

test("lint latest-tag: no tag at all is flagged", () => {
  assert.deepStrictEqual(found("FROM node\nUSER node"), ["1:latest-tag"]);
  assert.deepStrictEqual(found("FROM ghcr.io/me/app\nUSER node"), ["1:latest-tag"]);
});

test("lint latest-tag: a real tag is fine", () => {
  assert.deepStrictEqual(found("FROM node:24-alpine\nUSER node"), []);
});

test("lint latest-tag: a registry port is not a tag", () => {
  assert.deepStrictEqual(found("FROM localhost:5000/app\nUSER node"), ["1:latest-tag"]);
  assert.deepStrictEqual(found("FROM localhost:5000/app:2.1\nUSER node"), []);
});

test("lint latest-tag: a digest pins the image, even next to latest", () => {
  assert.deepStrictEqual(found("FROM node@sha256:abc\nUSER node"), []);
  assert.deepStrictEqual(found("FROM node:latest@sha256:abc\nUSER node"), []);
});

test("lint latest-tag: scratch, a stage alias and a variable are skipped", () => {
  const text = "FROM node:24 AS build\nFROM build AS test\nFROM scratch\nARG BASE=node:24\nFROM $BASE\nUSER node";
  assert.deepStrictEqual(found(text), []);
});

test("lint latest-tag: --platform and AS do not confuse it", () => {
  assert.deepStrictEqual(found("FROM --platform=linux/amd64 node:latest AS build\nFROM node:24\nUSER node"), ["1:latest-tag"]);
  assert.deepStrictEqual(found("FROM --platform=linux/amd64 node AS build\nFROM node:24\nUSER node"), ["1:latest-tag"]);
});

test("lint latest-tag: the instruction word can be lower case", () => {
  assert.deepStrictEqual(found("from node:latest\nuser node"), ["1:latest-tag"]);
});

test("lint latest-tag: every stage is checked, and each gets its own line number", () => {
  const text = "FROM node AS build\nRUN echo hi\nFROM nginx:latest\nUSER nginx";
  assert.deepStrictEqual(found(text), ["1:latest-tag", "3:latest-tag"]);
});

// ---------- lintDockerfile: root-user ----------

test("lint root-user: no USER line means root, reported at the last FROM", () => {
  assert.deepStrictEqual(found("FROM node:24\nRUN echo hi"), ["1:root-user"]);
  assert.deepStrictEqual(found("# comment\n\nFROM node:24\nCMD [\"node\"]"), ["3:root-user"]);
});

test("lint root-user: USER root is flagged on the USER line", () => {
  assert.deepStrictEqual(found("FROM node:24\nUSER root\nCMD [\"node\"]"), ["2:root-user"]);
});

test("lint root-user: user 0, 0:0, root:root and ROOT are root too", () => {
  for (const u of ["0", "0:0", "root:root", "ROOT"]) {
    assert.deepStrictEqual(found("FROM node:24\nUSER " + u), ["2:root-user"], u);
  }
});

test("lint root-user: a normal user is fine, also with a group", () => {
  assert.deepStrictEqual(found("FROM node:24\nUSER node"), []);
  assert.deepStrictEqual(found("FROM node:24\nUSER 1000:1000"), []);
  assert.deepStrictEqual(found("FROM node:24\nUSER app:app"), []);
});

test("lint root-user: only the LAST USER line counts", () => {
  assert.deepStrictEqual(found("FROM node:24\nUSER root\nRUN apt-get update\nUSER node"), []);
  assert.deepStrictEqual(found("FROM node:24\nUSER node\nRUN echo hi\nUSER root"), ["4:root-user"]);
});

test("lint root-user: only the last stage matters", () => {
  const buildAsRoot = "FROM node:24 AS build\nUSER root\nFROM node:24\nUSER node";
  assert.deepStrictEqual(found(buildAsRoot), []);
  const runtimeNoUser = "FROM node:24 AS build\nUSER node\nFROM node:24\nCMD [\"node\"]";
  assert.deepStrictEqual(found(runtimeNoUser), ["3:root-user"]);
});

test("lint root-user: a nonroot base image tag runs as a normal user already", () => {
  assert.deepStrictEqual(found("FROM gcr.io/distroless/nodejs24-debian13:nonroot\nCMD [\"app.js\"]"), []);
  assert.deepStrictEqual(found("FROM gcr.io/distroless/nodejs24-debian13:nonroot\nUSER root"), ["2:root-user"]);
});

test("lint root-user: a Dockerfile with no FROM gives no root finding", () => {
  assert.deepStrictEqual(found("RUN echo hi"), []);
});

// ---------- lintDockerfile: secret-in-env ----------

test("lint secret-in-env: ENV with a secret name and a value is flagged", () => {
  assert.deepStrictEqual(found(goodBase + user + "ENV DB_PASSWORD=hunter2"), ["3:secret-in-env"]);
  assert.deepStrictEqual(found(goodBase + user + "ENV STRIPE_SECRET sk_live_123"), ["3:secret-in-env"]);
});

test("lint secret-in-env: every secret word is known, in any letter case", () => {
  for (const name of ["PASSWD", "API_KEY", "APIKEY", "api_key", "GITHUB_TOKEN", "PRIVATE_KEY", "PRIVATEKEY", "ACCESS_KEY", "ACCESSKEY", "CLIENT_SECRET"]) {
    assert.deepStrictEqual(found(goodBase + user + "ENV " + name + "=x"), ["3:secret-in-env"], name);
  }
});

test("lint secret-in-env: a normal ENV is fine", () => {
  assert.deepStrictEqual(found(goodBase + user + "ENV NODE_ENV=production PORT=3000"), []);
  assert.deepStrictEqual(found(goodBase + user + "ENV MONKEY=1"), []);
});

test("lint secret-in-env: ENV with an empty value is not flagged", () => {
  assert.deepStrictEqual(found(goodBase + user + "ENV API_KEY="), []);
});

test("lint secret-in-env: a secret in the second pair of one ENV line is found", () => {
  assert.deepStrictEqual(found(goodBase + user + "ENV NODE_ENV=production DB_PASSWORD=x"), ["3:secret-in-env"]);
});

test("lint secret-in-env: two secrets on one line give one finding", () => {
  assert.deepStrictEqual(found(goodBase + user + "ENV A_TOKEN=1 B_SECRET=2"), ["3:secret-in-env"]);
});

test("lint secret-in-env: ARG with a secret name is always flagged", () => {
  assert.deepStrictEqual(found(goodBase + user + "ARG NPM_TOKEN"), ["3:secret-in-env"]);
  assert.deepStrictEqual(found(goodBase + user + "ARG NPM_TOKEN=abc"), ["3:secret-in-env"]);
  assert.deepStrictEqual(found(goodBase + user + "ARG NODE_VERSION=24"), []);
});

// ---------- lintDockerfile: secret-file ----------

test("lint secret-file: .env, .npmrc, keys and pem files are flagged", () => {
  for (const file of [".env", ".env.production", ".npmrc", "server.pem", "tls.key", "id_rsa", "id_ed25519", "config/.env", "./secrets/prod.pem"]) {
    assert.deepStrictEqual(found(goodBase + user + "COPY " + file + " /app/"), ["3:secret-file"], file);
  }
});

test("lint secret-file: ADD is checked too", () => {
  assert.deepStrictEqual(found(goodBase + user + "ADD .env /app/.env"), ["3:secret-file"]);
});

test("lint secret-file: normal files and COPY . . are fine", () => {
  assert.deepStrictEqual(found(goodBase + user + "COPY . ."), []);
  assert.deepStrictEqual(found(goodBase + user + "COPY package*.json ./"), []);
  assert.deepStrictEqual(found(goodBase + user + "COPY environment.js ./"), []);
  assert.deepStrictEqual(found(goodBase + user + "COPY key.js ./"), []);
});

test("lint secret-file: the destination is not a source", () => {
  assert.deepStrictEqual(found(goodBase + user + "COPY app.js .env"), []);
});

test("lint secret-file: COPY --from copies from another stage and is skipped", () => {
  assert.deepStrictEqual(found(goodBase + user + "COPY --from=build /app/.env /app/.env"), []);
});

test("lint secret-file: a flag like --chown is not a source", () => {
  assert.deepStrictEqual(found(goodBase + user + "COPY --chown=node:node .npmrc /app/"), ["3:secret-file"]);
});

// ---------- lintDockerfile: npm-not-ci ----------

test("lint npm-not-ci: npm install and npm i without a package are flagged", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install"), ["3:npm-not-ci"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm i"), ["3:npm-not-ci"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install --omit=dev"), ["3:npm-not-ci"]);
});

test("lint npm-not-ci: npm ci and npm run are fine", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm ci"), []);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm ci --omit=dev"), []);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm run build"), []);
});

test("lint npm-not-ci: it also finds npm install after &&", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN cd /app && npm install && npm run build"), ["3:npm-not-ci"]);
});

// ---------- lintDockerfile: unpinned-package ----------

test("lint unpinned-package: npm install of a package without a version is flagged", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install -g typescript"), ["3:unpinned-package"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm i express"), ["3:unpinned-package"]);
});

test("lint unpinned-package: an npm package with a version is fine", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install -g typescript@5.9.2"), []);
});

test("lint unpinned-package: a scoped npm package needs a second @", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install -g @angular/cli"), ["3:unpinned-package"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install -g @angular/cli@19.0.0"), []);
});

test("lint unpinned-package: a package with no version gives only this rule, not npm-not-ci", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install express"), ["3:unpinned-package"]);
});

test("lint unpinned-package: a local path is not a registry package", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install ./local-lib"), []);
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install /tmp/lib.tgz"), []);
});

test("lint unpinned-package: apt-get install needs =version", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get install -y curl"), ["3:unpinned-package"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get install -y --no-install-recommends curl=7.88.1-10"), []);
  assert.deepStrictEqual(found(goodBase + user + "RUN apt install -y git"), ["3:unpinned-package"]);
});

test("lint unpinned-package: one pinned package does not hide an unpinned one", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get install -y curl=7.88.1-10 git"), ["3:unpinned-package"]);
});

test("lint unpinned-package: apt-get update alone is fine", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get update"), []);
});

test("lint unpinned-package: apk add needs =version", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN apk add --no-cache curl"), ["3:unpinned-package"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN apk add --no-cache curl=8.5.0-r0"), []);
});

test("lint unpinned-package: commands joined by && are each checked", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*"), ["3:unpinned-package"]);
});

test("lint unpinned-package: commands joined by ; or || are each checked", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get update; apt-get install -y curl"), ["3:unpinned-package"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN apt-get update || apt-get install -y curl"), ["3:unpinned-package"]);
});

test("lint npm-not-ci: what comes after a pipe is not a package name", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install | tee install.log"), ["3:npm-not-ci"]);
});

test("lint unpinned-package: a line that ends with a backslash is one instruction", () => {
  const text = goodBase + user + "RUN apt-get update \\\n && apt-get install -y \\\n    curl \\\n && rm -rf /var/lib/apt/lists/*\nENV A=1";
  assert.deepStrictEqual(found(text), ["3:unpinned-package"]);
});

test("lint unpinned-package: two bad commands on one line give one finding", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install -g a && apt-get install -y b"), ["3:unpinned-package"]);
});

// ---------- lintDockerfile: curl-pipe-shell ----------

test("lint curl-pipe-shell: curl or wget piped into sh or bash is flagged", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN curl -fsSL https://x.test/i.sh | sh"), ["3:curl-pipe-shell"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN wget -qO- https://x.test/i.sh | bash"), ["3:curl-pipe-shell"]);
  assert.deepStrictEqual(found(goodBase + user + "RUN curl -fsSL https://x.test/i.sh | sudo bash"), ["3:curl-pipe-shell"]);
});

test("lint curl-pipe-shell: curl alone, or curl into a file, is fine", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN curl -fsSL https://x.test/a.tgz -o /tmp/a.tgz"), []);
  assert.deepStrictEqual(found(goodBase + user + "RUN curl -fsSL https://x.test/a.json | jq ."), []);
});

// ---------- lintDockerfile: order, lines and mixed cases ----------

test("lint: findings come sorted by line, then by rule name", () => {
  const text = [
    "FROM node:latest",
    "ENV DB_PASSWORD=x",
    "RUN npm install",
    "COPY .env ./",
  ].join("\n");
  assert.deepStrictEqual(found(text), ["1:latest-tag", "1:root-user", "2:secret-in-env", "3:npm-not-ci", "4:secret-file"]);
});

test("lint: two rules on the same line are listed by rule name", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN curl https://x.test | sh && apt-get install -y curl"), ["3:curl-pipe-shell", "3:unpinned-package"]);
});

test("lint: two rules on one line are sorted by rule name, not by the order they were found", () => {
  assert.deepStrictEqual(found(goodBase + user + "RUN npm install -g x && npm install"), ["3:npm-not-ci", "3:unpinned-package"]);
});

test("lint: a comment that ends with a backslash does not swallow the next line", () => {
  assert.deepStrictEqual(found("# a comment \\\nFROM node:latest\nUSER node"), ["2:latest-tag"]);
});

test("lint: comment lines and blank lines still count as lines", () => {
  const text = "# a comment\n\nFROM node:latest\n# another\nUSER node";
  assert.deepStrictEqual(found(text), ["3:latest-tag"]);
});

test("lint: a comment that looks like an instruction is ignored", () => {
  assert.deepStrictEqual(found(goodBase + user + "# RUN npm install"), []);
});

test("lint: the same Dockerfile text gives the same result twice", () => {
  const text = "FROM node:latest\nRUN npm install";
  assert.deepStrictEqual(lintDockerfile(text), lintDockerfile(text));
});

test("lint: the worked example from the lesson", () => {
  const text = [
    "FROM node:latest",
    "ENV DB_PASSWORD=hunter2",
    "COPY .env ./",
    "RUN apt-get update && apt-get install -y curl",
    "RUN npm install -g typescript",
    "RUN curl -fsSL https://example.test/i.sh | sh",
    'CMD ["node", "server.js"]',
  ].join("\n");
  assert.deepStrictEqual(found(text), [
    "1:latest-tag",
    "1:root-user",
    "2:secret-in-env",
    "3:secret-file",
    "4:unpinned-package",
    "5:unpinned-package",
    "6:curl-pipe-shell",
  ]);
});

// ---------- verifyDeploy ----------

const policy = { identity: "https://github.com/me/app/.github/workflows/release.yml@refs/heads/main", issuer: "https://token.actions.githubusercontent.com" };
const goodSig = (digest) => ({ digest, identity: policy.identity, issuer: policy.issuer });

test("verifyDeploy: a pinned image with the right signature is ok", () => {
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", [goodSig("sha256:aaa11")], policy), { ok: true });
});

test("verifyDeploy: a tag is refused, because a tag can move", () => {
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app:1.0", [goodSig("sha256:aaa11")], policy), { ok: false, reason: "not-pinned" });
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app", [], policy), { ok: false, reason: "not-pinned" });
});

test("verifyDeploy: a tag next to the digest is fine, the digest is used", () => {
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app:1.0@sha256:aaa11", [goodSig("sha256:aaa11")], policy), { ok: true });
});

test("verifyDeploy: no signature at all is unsigned", () => {
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", [], policy), { ok: false, reason: "unsigned" });
});

test("verifyDeploy: a signature for another digest does not count (the image changed)", () => {
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:bbb22", [goodSig("sha256:aaa11")], policy), { ok: false, reason: "unsigned" });
});

test("verifyDeploy: the wrong identity is a wrong signer", () => {
  const sig = { digest: "sha256:aaa11", identity: "https://github.com/evil/app/.github/workflows/release.yml@refs/heads/main", issuer: policy.issuer };
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", [sig], policy), { ok: false, reason: "wrong-signer" });
});

test("verifyDeploy: the wrong issuer is a wrong signer", () => {
  const sig = { digest: "sha256:aaa11", identity: policy.identity, issuer: "https://accounts.google.com" };
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", [sig], policy), { ok: false, reason: "wrong-signer" });
});

test("verifyDeploy: identity and issuer must both match in the SAME signature", () => {
  const sigs = [
    { digest: "sha256:aaa11", identity: policy.identity, issuer: "https://accounts.google.com" },
    { digest: "sha256:aaa11", identity: "someone-else", issuer: policy.issuer },
  ];
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", sigs, policy), { ok: false, reason: "wrong-signer" });
});

test("verifyDeploy: the identity must match exactly, not as a part of a longer name", () => {
  const sig = { digest: "sha256:aaa11", identity: policy.identity + "-fork", issuer: policy.issuer };
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", [sig], policy), { ok: false, reason: "wrong-signer" });
});

test("verifyDeploy: one good signature among bad ones is enough", () => {
  const sigs = [
    { digest: "sha256:aaa11", identity: "someone-else", issuer: policy.issuer },
    goodSig("sha256:bbb22"),
    goodSig("sha256:aaa11"),
  ];
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11", sigs, policy), { ok: true });
});

test("verifyDeploy: a digest that is not hex letters is not a pin", () => {
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:", [], policy), { ok: false, reason: "not-pinned" });
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@latest", [], policy), { ok: false, reason: "not-pinned" });
  assert.deepStrictEqual(verifyDeploy("ghcr.io/me/app@sha256:aaa11:latest", [goodSig("sha256:aaa11")], policy), { ok: false, reason: "not-pinned" });
});

test("verifyDeploy: it does not change its inputs", () => {
  const sigs = [goodSig("sha256:aaa11")];
  const before = same(sigs);
  const p = same(policy);
  verifyDeploy("ghcr.io/me/app@sha256:aaa11", sigs, p);
  assert.deepStrictEqual(sigs, before);
  assert.deepStrictEqual(p, policy);
});

// ---------- cooldownOk ----------

const NOW = "2026-11-19T12:00:00Z";

test("cooldownOk: a version published 2 hours ago is not ok with a 7 day cooldown", () => {
  assert.strictEqual(cooldownOk("2026-11-19T10:00:00Z", NOW, 7), false);
});

test("cooldownOk: a version published 8 days ago is ok with a 7 day cooldown", () => {
  assert.strictEqual(cooldownOk("2026-11-11T12:00:00Z", NOW, 7), true);
});

test("cooldownOk: exactly 7 days is not enough, it must be more than 7 days", () => {
  assert.strictEqual(cooldownOk("2026-11-12T12:00:00Z", NOW, 7), false);
  assert.strictEqual(cooldownOk("2026-11-12T11:59:59Z", NOW, 7), true);
});

test("cooldownOk: 6 days and 23 hours is not ok", () => {
  assert.strictEqual(cooldownOk("2026-11-12T13:00:00Z", NOW, 7), false);
});

test("cooldownOk: no cooldown means every version is ok", () => {
  assert.strictEqual(cooldownOk("2026-11-19T11:59:59Z", NOW, 0), true);
  assert.strictEqual(cooldownOk("2026-11-19T11:59:59Z", NOW, null), true);
  assert.strictEqual(cooldownOk("2026-11-19T11:59:59Z", NOW, undefined), true);
});

test("cooldownOk: a version from the future is never ok", () => {
  assert.strictEqual(cooldownOk("2026-11-20T12:00:00Z", NOW, 7), false);
  assert.strictEqual(cooldownOk("2026-11-20T12:00:00Z", NOW, 1), false);
  assert.strictEqual(cooldownOk("2026-11-30T12:00:00Z", NOW, 1), false);
});

test("cooldownOk: a one day cooldown works the same way", () => {
  assert.strictEqual(cooldownOk("2026-11-18T11:00:00Z", NOW, 1), true);
  assert.strictEqual(cooldownOk("2026-11-18T13:00:00Z", NOW, 1), false);
});

test("cooldownOk: time zones in the text are understood", () => {
  assert.strictEqual(cooldownOk("2026-11-11T20:00:00+09:00", NOW, 7), true);
  assert.strictEqual(cooldownOk("2026-11-12T22:00:00+09:00", NOW, 7), false);
});

// ---------- scan and gate ----------

const advisories = [
  { id: "CVE-1", name: "libcurl", affected: ["8.5.0", "8.5.1"], fixed: "8.6.0", severity: "HIGH" },
  { id: "CVE-2", name: "libcurl", affected: ["8.5.0"], fixed: "8.5.1", severity: "CRITICAL" },
  { id: "CVE-3", name: "zlib", affected: ["1.2.13"], fixed: "1.3.1", severity: "LOW" },
  { id: "CVE-4", name: "express", affected: ["4.17.0"], fixed: null, severity: "MEDIUM" },
  { id: "CVE-5", name: "bad-worm", affected: ["3.0.1"], fixed: "3.0.2", severity: "CRITICAL" },
];

test("scan: a package with an advisory for its version is found", () => {
  const result = scan([{ name: "zlib", version: "1.2.13" }], advisories);
  assert.deepStrictEqual(result, [{ id: "CVE-3", name: "zlib", version: "1.2.13", severity: "LOW", fixed: "1.3.1" }]);
});

test("scan: a version that is not in affected is clean", () => {
  assert.deepStrictEqual(scan([{ name: "zlib", version: "1.3.1" }], advisories), []);
});

test("scan: a package without any advisory gives nothing (a scanner only knows known holes)", () => {
  assert.deepStrictEqual(scan([{ name: "bad-worm", version: "3.0.1" }], []), []);
  assert.deepStrictEqual(scan([{ name: "unknown", version: "1.0.0" }], advisories), []);
});

test("scan: the same package is found once the scanner learns about it", () => {
  const sbom = [{ name: "bad-worm", version: "3.0.1" }];
  assert.strictEqual(scan(sbom, advisories.slice(0, 4)).length, 0);
  assert.strictEqual(scan(sbom, advisories).length, 1);
});

test("scan: one package can have two findings, the worst one first", () => {
  const result = scan([{ name: "libcurl", version: "8.5.0" }], advisories);
  assert.deepStrictEqual(result.map((f) => f.id), ["CVE-2", "CVE-1"]);
});

test("scan: only the advisories for the installed version are listed", () => {
  const result = scan([{ name: "libcurl", version: "8.5.1" }], advisories);
  assert.deepStrictEqual(result.map((f) => f.id), ["CVE-1"]);
});

test("scan: a fixed value of null is kept as null", () => {
  assert.strictEqual(scan([{ name: "express", version: "4.17.0" }], advisories)[0].fixed, null);
});

test("scan: sorted by severity, then name, then id", () => {
  const sbom = [
    { name: "zlib", version: "1.2.13" },
    { name: "express", version: "4.17.0" },
    { name: "libcurl", version: "8.5.0" },
    { name: "bad-worm", version: "3.0.1" },
  ];
  assert.deepStrictEqual(scan(sbom, advisories).map((f) => f.id), ["CVE-5", "CVE-2", "CVE-1", "CVE-4", "CVE-3"]);
});

test("scan: same severity is sorted by name, then id", () => {
  const adv = [
    { id: "B-2", name: "beta", affected: ["1"], fixed: null, severity: "HIGH" },
    { id: "B-1", name: "beta", affected: ["1"], fixed: null, severity: "HIGH" },
    { id: "A-1", name: "alpha", affected: ["1"], fixed: null, severity: "HIGH" },
  ];
  const result = scan([{ name: "beta", version: "1" }, { name: "alpha", version: "1" }], adv);
  assert.deepStrictEqual(result.map((f) => f.id), ["A-1", "B-1", "B-2"]);
});

test("scan: the same name and version twice in the sbom is counted once", () => {
  const sbom = [{ name: "zlib", version: "1.2.13" }, { name: "zlib", version: "1.2.13" }];
  assert.strictEqual(scan(sbom, advisories).length, 1);
});

test("scan: two versions of one package are two separate checks", () => {
  const sbom = [{ name: "libcurl", version: "8.5.0" }, { name: "libcurl", version: "8.5.1" }];
  assert.strictEqual(scan(sbom, advisories).length, 3);
});

test("scan: an empty sbom or empty advisories give an empty list", () => {
  assert.deepStrictEqual(scan([], advisories), []);
  assert.deepStrictEqual(scan([{ name: "zlib", version: "1.2.13" }], []), []);
});

test("scan: it does not change its inputs", () => {
  const sbom = [{ name: "libcurl", version: "8.5.0" }, { name: "zlib", version: "1.2.13" }];
  const sbomBefore = same(sbom);
  const advBefore = same(advisories);
  scan(sbom, advisories);
  assert.deepStrictEqual(sbom, sbomBefore);
  assert.deepStrictEqual(advisories, advBefore);
});

test("gate: fails when a finding is at least as bad as failOn", () => {
  const findings = scan([{ name: "libcurl", version: "8.5.1" }], advisories); // one HIGH
  assert.strictEqual(gate(findings, "HIGH"), 1);
  assert.strictEqual(gate(findings, "MEDIUM"), 1);
  assert.strictEqual(gate(findings, "LOW"), 1);
});

test("gate: passes when every finding is less bad than failOn", () => {
  const findings = scan([{ name: "libcurl", version: "8.5.1" }], advisories); // one HIGH
  assert.strictEqual(gate(findings, "CRITICAL"), 0);
});

test("gate: no findings always passes", () => {
  for (const level of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) assert.strictEqual(gate([], level), 0);
});

test("gate: failOn HIGH fails on HIGH and CRITICAL but not on MEDIUM or LOW", () => {
  assert.strictEqual(gate([{ severity: "CRITICAL" }], "HIGH"), 1);
  assert.strictEqual(gate([{ severity: "HIGH" }], "HIGH"), 1);
  assert.strictEqual(gate([{ severity: "MEDIUM" }], "HIGH"), 0);
  assert.strictEqual(gate([{ severity: "LOW" }], "HIGH"), 0);
});

test("gate: one bad finding among many mild ones still fails", () => {
  assert.strictEqual(gate([{ severity: "LOW" }, { severity: "LOW" }, { severity: "CRITICAL" }], "CRITICAL"), 1);
});

test("gate: an unknown severity name is an error", () => {
  assert.throws(() => gate([], "SEVERE"), /unknown severity/);
  assert.throws(() => gate([{ severity: "HIGH" }], "high"), /unknown severity/);
  assert.throws(() => gate([], undefined), /unknown severity/);
});
