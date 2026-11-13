const test = require("node:test");
const assert = require("node:assert");
const { buildPlan, rebuildSeconds, imageSize, suggestOrder } = require("./02-docker-images-and-layers");

const CMD = 'CMD ["node", "dist/server.js"]';
const BAD = ["FROM node:24-alpine", "WORKDIR /usr/src/app", "COPY . .", "RUN npm ci", "RUN npm run build", CMD];
const GOOD = ["FROM node:24-alpine", "WORKDIR /usr/src/app", "COPY package*.json ./", "RUN npm ci", "COPY . .", "RUN npm run build", CMD];
const statuses = plan => plan.map(p => p.status);

test("the first build has no cache, so every line is REBUILT", () => {
  const plan = buildPlan([], GOOD, []);
  assert.deepStrictEqual(plan.map(p => p.line), GOOD);
  assert.deepStrictEqual(statuses(plan), Array(7).fill("REBUILT"));
});

test("nothing changed: every line is CACHED", () => {
  assert.deepStrictEqual(statuses(buildPlan(GOOD, GOOD, [])), Array(7).fill("CACHED"));
});

test("slow order: one source file changes and the install runs again", () => {
  assert.deepStrictEqual(
    statuses(buildPlan(BAD, BAD, ["src/server.ts"])),
    ["CACHED", "CACHED", "REBUILT", "REBUILT", "REBUILT", "REBUILT"]
  );
});

test("fast order: the same change keeps the install CACHED", () => {
  assert.deepStrictEqual(
    statuses(buildPlan(GOOD, GOOD, ["src/server.ts"])),
    ["CACHED", "CACHED", "CACHED", "CACHED", "REBUILT", "REBUILT", "REBUILT"]
  );
});

test("fast order: a new library changes package.json, so the install runs again", () => {
  assert.deepStrictEqual(
    statuses(buildPlan(GOOD, GOOD, ["package.json", "package-lock.json"])),
    ["CACHED", "CACHED", "REBUILT", "REBUILT", "REBUILT", "REBUILT", "REBUILT"]
  );
});

test("package*.json matches the lock file too, but not a file in a folder", () => {
  assert.strictEqual(buildPlan(GOOD, GOOD, ["package-lock.json"])[2].status, "REBUILT");
  assert.strictEqual(buildPlan(GOOD, GOOD, ["src/package.json"])[2].status, "CACHED");
  assert.strictEqual(buildPlan(GOOD, GOOD, ["README.md"])[2].status, "CACHED");
  assert.strictEqual(buildPlan(GOOD, GOOD, ["package/a.json"])[2].status, "CACHED");
});

test("COPY of a folder is changed by any file inside it, and by nothing else", () => {
  const old = ["FROM node:24-alpine", "COPY src ./src", "RUN npm run build"];
  assert.deepStrictEqual(statuses(buildPlan(old, old, ["src/deep/a.ts"])), ["CACHED", "REBUILT", "REBUILT"]);
  assert.deepStrictEqual(statuses(buildPlan(old, old, ["srcfile.txt"])), ["CACHED", "CACHED", "CACHED"]);
  assert.deepStrictEqual(statuses(buildPlan(old, old, ["docs/readme.md"])), ["CACHED", "CACHED", "CACHED"]);
});

test("words that start with -- are not sources", () => {
  const lines = ["FROM node:24-alpine", "COPY --chown=node:node package*.json ./", "RUN npm ci"];
  assert.deepStrictEqual(statuses(buildPlan(lines, lines, ["src/a.ts"])), ["CACHED", "CACHED", "CACHED"]);
  assert.deepStrictEqual(statuses(buildPlan(lines, lines, ["package.json"])), ["CACHED", "REBUILT", "REBUILT"]);
});

test("a changed file does nothing to a RUN line by itself", () => {
  const lines = ["FROM node:24-alpine", "RUN cat package.json now", "CMD [\"node\"]"];
  assert.deepStrictEqual(statuses(buildPlan(lines, lines, ["package.json"])), ["CACHED", "CACHED", "CACHED"]);
});

test("a changed line breaks the cache from that line to the end", () => {
  const next = ["FROM node:24-alpine", "WORKDIR /usr/src/app", "COPY package*.json ./", "RUN npm ci --omit=dev", "COPY . .", "RUN npm run build", CMD];
  assert.deepStrictEqual(
    statuses(buildPlan(GOOD, next, [])),
    ["CACHED", "CACHED", "CACHED", "REBUILT", "REBUILT", "REBUILT", "REBUILT"]
  );
});

test("a new base image tag rebuilds everything", () => {
  const next = ["FROM node:26-alpine", ...GOOD.slice(1)];
  assert.deepStrictEqual(statuses(buildPlan(GOOD, next, [])), Array(7).fill("REBUILT"));
});

test("a line added at the end is the only REBUILT one", () => {
  const next = [...GOOD, "USER node"];
  const s = statuses(buildPlan(GOOD, next, []));
  assert.deepStrictEqual(s, [...Array(7).fill("CACHED"), "REBUILT"]);
});

test("a changed file with no matching COPY changes nothing", () => {
  assert.deepStrictEqual(statuses(buildPlan(BAD, BAD, [])), Array(6).fill("CACHED"));
});

test("buildPlan does not change the lists it is given", () => {
  const old = [...GOOD], next = [...GOOD], files = ["src/server.ts"];
  const plan = buildPlan(old, next, files);
  assert.strictEqual(plan.length, 7);
  assert.strictEqual(plan[6].status, "REBUILT");
  assert.deepStrictEqual(old, GOOD);
  assert.deepStrictEqual(next, GOOD);
  assert.deepStrictEqual(files, ["src/server.ts"]);
});

test("rebuildSeconds counts only the REBUILT lines (the lesson run: 5.5 s against 2.7 s)", () => {
  const seconds = { "RUN npm ci": 2.8, "RUN npm run build": 2.7 };
  assert.strictEqual(rebuildSeconds(buildPlan(BAD, BAD, ["src/server.ts"]), seconds), 5.5);
  assert.strictEqual(rebuildSeconds(buildPlan(GOOD, GOOD, ["src/server.ts"]), seconds), 2.7);
  assert.strictEqual(rebuildSeconds(buildPlan(GOOD, GOOD, []), seconds), 0);
});

test("rebuildSeconds treats a line that is not in the list as 0 seconds and rounds to one decimal", () => {
  const plan = [{ line: "A", status: "REBUILT" }, { line: "B", status: "REBUILT" }, { line: "C", status: "REBUILT" }];
  assert.strictEqual(rebuildSeconds(plan, { A: 0.1, B: 0.2 }), 0.3);
});

test("imageSize adds up the layers", () => {
  const layers = [{ line: "base", mb: 9.3 }, { line: "node", mb: 161 }, { line: "apk", mb: 5.5 }, { line: "RUN npm ci", mb: 62.3 }, { line: "RUN npm run build", mb: 1.4 }];
  assert.strictEqual(imageSize(layers), 239.5);
  assert.strictEqual(imageSize([]), 0);
});

test("imageSize rounds to one decimal", () => {
  assert.strictEqual(imageSize([{ line: "a", mb: 0.1 }, { line: "b", mb: 0.2 }]), 0.3);
});

test("a delete layer does not make the image smaller (the 50 MB file stays)", () => {
  const twoLines = [{ line: "FROM alpine:3.22", mb: 9.2 }, { line: "RUN make-a-50-mb-file", mb: 50 }, { line: "RUN rm /big.bin", mb: 0 }];
  const oneLine = [{ line: "FROM alpine:3.22", mb: 9.2 }, { line: "RUN make-and-remove-the-file", mb: 0 }];
  assert.strictEqual(imageSize(twoLines), 59.2);
  assert.strictEqual(imageSize(oneLine), 9.2);
});

test("suggestOrder moves the dependency install above COPY . .", () => {
  assert.deepStrictEqual(suggestOrder(BAD), [
    "FROM node:24-alpine", "WORKDIR /usr/src/app", "COPY package*.json ./", "RUN npm ci", "COPY . .", "RUN npm run build", CMD,
  ]);
});

test("suggestOrder works with npm install, and keeps lines in between", () => {
  const lines = ["FROM node:24-alpine", "COPY . .", "RUN echo hi", "RUN npm install --omit=dev", "CMD [\"node\"]"];
  assert.deepStrictEqual(suggestOrder(lines), [
    "FROM node:24-alpine", "COPY package*.json ./", "RUN npm install --omit=dev", "COPY . .", "RUN echo hi", "CMD [\"node\"]",
  ]);
});

test("suggestOrder leaves a Dockerfile that is already in the fast order alone", () => {
  assert.deepStrictEqual(suggestOrder(GOOD), GOOD);
});

test("suggestOrder leaves a Dockerfile with no install line alone", () => {
  const lines = ["FROM nginx", "COPY . /usr/share/nginx/html"];
  assert.deepStrictEqual(suggestOrder(lines), lines);
});

test("suggestOrder returns a new list and does not change the old one", () => {
  const copy = [...BAD];
  const out = suggestOrder(copy);
  assert.strictEqual(out.length, 7);
  assert.strictEqual(out[2], "COPY package*.json ./");
  assert.deepStrictEqual(copy, BAD);
  assert.notStrictEqual(out, copy);
  const same = suggestOrder(GOOD);
  assert.deepStrictEqual(same, GOOD);
  assert.notStrictEqual(same, GOOD);
});

test("the plan of the suggested order has the same cache story as the lesson", () => {
  const fixed = suggestOrder(BAD);
  const plan = buildPlan(fixed, fixed, ["src/server.ts"]);
  assert.deepStrictEqual(plan[3], { line: "RUN npm ci", status: "CACHED" });
  assert.deepStrictEqual(plan[4], { line: "COPY . .", status: "REBUILT" });
});
