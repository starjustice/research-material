const test = require("node:test");
const assert = require("node:assert");
const {
  envToConfig, mergeConfig, missingKeys, valueSeenBy, isSecretKey, redact, redactText, leakedIn, visibleFiles,
} = require("./09-config-and-secrets");

// ---------- envToConfig ----------

test("envToConfig: keeps names with the prefix and turns them into camelCase", () => {
  const env = { APP_PORT: "8080", APP_DB_HOST: "db.internal", APP_LOG_LEVEL: "debug" };
  assert.deepStrictEqual(envToConfig(env, "APP_"), { port: "8080", dbHost: "db.internal", logLevel: "debug" });
});

test("envToConfig: ignores names without the prefix", () => {
  const env = { PATH: "/usr/bin", HOME: "/root", MYAPP_PORT: "1", APP_PORT: "8080" };
  assert.deepStrictEqual(envToConfig(env, "APP_"), { port: "8080" });
});

test("envToConfig: the prefix must be at the start of the name", () => {
  assert.deepStrictEqual(envToConfig({ X_APP_PORT: "1" }, "APP_"), {});
});

test("envToConfig: values stay as text, even if they look like numbers or booleans", () => {
  const config = envToConfig({ APP_PORT: "3000", APP_DEBUG: "false" }, "APP_");
  assert.strictEqual(config.port, "3000");
  assert.strictEqual(config.debug, "false");
});

test("envToConfig: a name that is only the prefix is ignored, and an empty env gives an empty object", () => {
  assert.deepStrictEqual(envToConfig({ APP_: "x", APP__: "y" }, "APP_"), {});
  assert.deepStrictEqual(envToConfig({}, "APP_"), {});
});

test("envToConfig: an empty text value is kept", () => {
  assert.deepStrictEqual(envToConfig({ APP_NAME: "" }, "APP_"), { name: "" });
});

// ---------- mergeConfig ----------

test("mergeConfig: the file beats the defaults, and the environment beats the file", () => {
  const defaults = { port: "3000", logLevel: "info", region: "eu" };
  const file = { port: "4000", logLevel: "warn" };
  const env = { logLevel: "debug" };
  assert.deepStrictEqual(mergeConfig(defaults, file, env), { port: "4000", logLevel: "debug", region: "eu" });
});

test("mergeConfig: keys that only one source has are all kept", () => {
  assert.deepStrictEqual(mergeConfig({ a: 1 }, { b: 2 }, { c: 3 }), { a: 1, b: 2, c: 3 });
});

test("mergeConfig: the environment beats the defaults when the file is empty", () => {
  assert.deepStrictEqual(mergeConfig({ port: "3000" }, {}, { port: "9" }), { port: "9" });
});

test("mergeConfig: undefined does not override, but 0, false, null and empty text do", () => {
  const result = mergeConfig({ a: 1, b: 1, c: 1, d: 1, e: 1 }, { a: undefined, b: 0, c: false, d: null }, { e: "" });
  assert.deepStrictEqual(result, { a: 1, b: 0, c: false, d: null, e: "" });
});

test("mergeConfig: returns a new object and leaves the three inputs unchanged", () => {
  const defaults = { a: 1 }, file = { a: 2 }, env = { a: 3 };
  const result = mergeConfig(defaults, file, env);
  assert.deepStrictEqual(result, { a: 3 });
  assert.deepStrictEqual(defaults, { a: 1 });
  assert.deepStrictEqual(file, { a: 2 });
  assert.deepStrictEqual(env, { a: 3 });
  assert.notStrictEqual(result, defaults);
});

test("mergeConfig: a missing source (undefined) is fine", () => {
  assert.deepStrictEqual(mergeConfig({ a: 1 }, undefined, { b: 2 }), { a: 1, b: 2 });
});

// ---------- missingKeys ----------

test("missingKeys: lists the required keys that are not there, in the order of the required list", () => {
  const config = { port: "3000" };
  assert.deepStrictEqual(missingKeys(config, ["databaseUrl", "port", "apiKey"]), ["databaseUrl", "apiKey"]);
});

test("missingKeys: undefined, null and empty text count as missing", () => {
  const config = { a: undefined, b: null, c: "", d: "x" };
  assert.deepStrictEqual(missingKeys(config, ["a", "b", "c", "d"]), ["a", "b", "c"]);
});

test("missingKeys: 0 and false are real values, so they are not missing", () => {
  assert.deepStrictEqual(missingKeys({ retries: 0, debug: false }, ["retries", "debug"]), []);
});

test("missingKeys: nothing required, or everything there, gives an empty list", () => {
  assert.deepStrictEqual(missingKeys({}, []), []);
  assert.deepStrictEqual(missingKeys({ a: "1", b: "2" }, ["b", "a"]), []);
});

// ---------- valueSeenBy ----------

const buildEnv = { NEXT_PUBLIC_API_URL: "value-from-build", API_URL: "value-from-build" };
const runEnv = { NEXT_PUBLIC_API_URL: "value-from-run", API_URL: "value-from-run" };

test("valueSeenBy: a NEXT_PUBLIC_ name is frozen at build time, in the browser", () => {
  assert.strictEqual(valueSeenBy("browser", "NEXT_PUBLIC_API_URL", buildEnv, runEnv), "value-from-build");
});

test("valueSeenBy: a NEXT_PUBLIC_ name is also frozen at build time on the server", () => {
  assert.strictEqual(valueSeenBy("server", "NEXT_PUBLIC_API_URL", buildEnv, runEnv), "value-from-build");
});

test("valueSeenBy: other names are read from the run environment on the server", () => {
  assert.strictEqual(valueSeenBy("server", "API_URL", buildEnv, runEnv), "value-from-run");
});

test("valueSeenBy: the browser never sees other names, even when the server does", () => {
  assert.strictEqual(valueSeenBy("server", "API_URL", buildEnv, runEnv), "value-from-run");
  assert.strictEqual(valueSeenBy("browser", "API_URL", buildEnv, runEnv), undefined);
});

test("valueSeenBy: a missing name gives undefined", () => {
  assert.strictEqual(valueSeenBy("server", "API_URL", buildEnv, runEnv), "value-from-run");
  assert.strictEqual(valueSeenBy("server", "NOPE", buildEnv, runEnv), undefined);
  assert.strictEqual(valueSeenBy("browser", "NEXT_PUBLIC_NOPE", buildEnv, runEnv), undefined);
});

test("valueSeenBy: a NEXT_PUBLIC_ name set only at run time is not seen", () => {
  assert.strictEqual(valueSeenBy("browser", "NEXT_PUBLIC_LATE", { NEXT_PUBLIC_LATE: "b" }, { NEXT_PUBLIC_LATE: "x" }), "b");
  assert.strictEqual(valueSeenBy("browser", "NEXT_PUBLIC_LATE", {}, { NEXT_PUBLIC_LATE: "x" }), undefined);
});

test("valueSeenBy: the prefix must be at the start, and capital letters count", () => {
  assert.strictEqual(valueSeenBy("browser", "MY_NEXT_PUBLIC_X", { MY_NEXT_PUBLIC_X: "b" }, {}), undefined);
  assert.strictEqual(valueSeenBy("server", "next_public_x", { next_public_x: "b" }, { next_public_x: "r" }), "r");
});

// ---------- isSecretKey ----------

test("isSecretKey: names with password, secret, token, key or credential are secret", () => {
  for (const name of ["DB_PASSWORD", "API_TOKEN", "STRIPE_SECRET", "privateKey", "AWS_SECRET_ACCESS_KEY", "gcp_credentials", "dbPasswd"]) {
    assert.strictEqual(isSecretKey(name), true, name);
  }
});

test("isSecretKey: capital letters do not matter", () => {
  assert.strictEqual(isSecretKey("Api_Token"), true);
  assert.strictEqual(isSecretKey("PASSWORD"), true);
});

test("isSecretKey: harmless names are not secret", () => {
  for (const name of ["PORT", "LOG_LEVEL", "NODE_ENV", "region", "host", "author"]) {
    assert.strictEqual(isSecretKey(name), false, name);
  }
});

// ---------- redactText ----------

test("redactText: masks the value of a secret NAME=value pair", () => {
  assert.strictEqual(redactText("start API_TOKEN=not-a-real-secret port=3000"), "start API_TOKEN=*** port=3000");
});

test("redactText: masks several secret pairs in one line", () => {
  assert.strictEqual(redactText("DB_PASSWORD=a SESSION_SECRET=b"), "DB_PASSWORD=*** SESSION_SECRET=***");
});

test("redactText: leaves a harmless pair alone", () => {
  assert.strictEqual(redactText("PORT=3000 LOG_LEVEL=info"), "PORT=3000 LOG_LEVEL=info");
});

test("redactText: masks the password inside a URL, whatever the name is called", () => {
  assert.strictEqual(
    redactText("connecting to postgres://app:not-a-real-secret@db:5432/shop"),
    "connecting to postgres://app:***@db:5432/shop"
  );
  assert.strictEqual(
    redactText("DATABASE_URL=postgres://app:pw@db/x"),
    "DATABASE_URL=postgres://app:***@db/x"
  );
});

test("redactText: a URL without a password is not changed", () => {
  assert.strictEqual(redactText("GET https://example.com:8080/a@b ok"), "GET https://example.com:8080/a@b ok");
  assert.strictEqual(redactText("see https://example.com/docs"), "see https://example.com/docs");
});

test("redactText: a line with no secrets is returned the same", () => {
  assert.strictEqual(redactText("server started on port 3000"), "server started on port 3000");
});

// ---------- redact ----------

test("redact: secret keys get ***, other keys stay", () => {
  assert.deepStrictEqual(
    redact({ user: "ana", password: "not-a-real-secret", port: 3000 }),
    { user: "ana", password: "***", port: 3000 }
  );
});

test("redact: goes into nested objects and arrays", () => {
  const input = { db: { host: "h", apiKey: "k" }, list: [{ token: "t", id: 1 }, "plain"] };
  assert.deepStrictEqual(redact(input), { db: { host: "h", apiKey: "***" }, list: [{ token: "***", id: 1 }, "plain"] });
});

test("redact: a secret key hides everything below it, whatever the value is", () => {
  assert.deepStrictEqual(redact({ secret: { a: 1 }, token: 42, key: null }), { secret: "***", token: "***", key: "***" });
});

test("redact: masks a password inside a URL string value", () => {
  assert.deepStrictEqual(
    redact({ databaseUrl: "postgres://app:pw@db:5432/shop", home: "https://example.com" }),
    { databaseUrl: "postgres://app:***@db:5432/shop", home: "https://example.com" }
  );
});

test("redact: does not change the original object", () => {
  const input = { password: "p", nested: { token: "t" }, list: [{ key: "k" }] };
  const out = redact(input);
  assert.deepStrictEqual(input, { password: "p", nested: { token: "t" }, list: [{ key: "k" }] });
  assert.notStrictEqual(out, input);
  assert.notStrictEqual(out.nested, input.nested);
});

test("redact: numbers, null, undefined and plain text come back the same", () => {
  assert.strictEqual(redact(5), 5);
  assert.strictEqual(redact(null), null);
  assert.strictEqual(redact(undefined), undefined);
  assert.strictEqual(redact("hello"), "hello");
});

// ---------- leakedIn and visibleFiles ----------

const SECRET = "not-a-real-secret";
const badImage = [
  { cmd: "FROM alpine:3.22", files: { "/bin/sh": "binary" } },
  { cmd: "WORKDIR /app", files: {} },
  { cmd: "COPY .env app.js ./", files: { "/app/.env": "DB_PASSWORD=" + SECRET, "/app/app.js": "console.log(1)" } },
  { cmd: "RUN rm /app/.env", files: {}, removes: ["/app/.env"] },
  { cmd: "RUN |1 API_TOKEN=" + SECRET + " /bin/sh -c build", files: {} },
];
const goodImage = [
  { cmd: "FROM alpine:3.22", files: { "/bin/sh": "binary" } },
  { cmd: "COPY app.js ./", files: { "/app/app.js": "console.log(1)" } },
  { cmd: "RUN --mount=type=secret,id=api_token build", files: {} },
];

test("leakedIn: finds the layer that copied the file and the layer whose command holds the value", () => {
  assert.deepStrictEqual(leakedIn(badImage, SECRET), [3, 5]);
});

test("leakedIn: deleting the file in a later layer does not remove it from the layer that added it", () => {
  const beforeDelete = badImage.slice(0, 3);
  const afterDelete = badImage.slice(0, 4);
  assert.deepStrictEqual(leakedIn(beforeDelete, SECRET), [3]);
  assert.deepStrictEqual(leakedIn(afterDelete, SECRET), [3]);
});

test("leakedIn: a secret mount keeps the value out of every layer", () => {
  assert.deepStrictEqual(leakedIn(goodImage, SECRET), []);
});

test("leakedIn: looks for the exact text, and an empty image has no leaks", () => {
  assert.deepStrictEqual(leakedIn(badImage, "another-value"), []);
  assert.deepStrictEqual(leakedIn([], SECRET), []);
});

test("leakedIn: finds the text inside a longer file and inside any file of a layer", () => {
  const layers = [{ cmd: "COPY x /", files: { "/a": "nothing here", "/b": "line1\nTOKEN=" + SECRET + "\nline3" } }];
  assert.deepStrictEqual(leakedIn(layers, SECRET), [1]);
});

test("visibleFiles: the container no longer sees a removed file", () => {
  assert.deepStrictEqual(visibleFiles(badImage), ["/app/app.js", "/bin/sh"]);
});

test("visibleFiles: before the remove layer the file is visible", () => {
  assert.deepStrictEqual(visibleFiles(badImage.slice(0, 3)), ["/app/.env", "/app/app.js", "/bin/sh"]);
});

test("visibleFiles: a file can be added again after it was removed", () => {
  const layers = [
    { cmd: "a", files: { "/x": "1" } },
    { cmd: "b", files: {}, removes: ["/x"] },
    { cmd: "c", files: { "/x": "2" } },
  ];
  assert.deepStrictEqual(visibleFiles(layers), ["/x"]);
});

test("visibleFiles: inside one layer, the files are added first and then the removes are done", () => {
  const layers = [{ cmd: "a", files: { "/x": "1", "/y": "2" }, removes: ["/x"] }];
  assert.deepStrictEqual(visibleFiles(layers), ["/y"]);
});

test("visibleFiles: the list is sorted, and no layers means no files", () => {
  assert.deepStrictEqual(visibleFiles([{ cmd: "a", files: { "/z": "", "/a": "", "/m": "" } }]), ["/a", "/m", "/z"]);
  assert.deepStrictEqual(visibleFiles([]), []);
});

test("the story: the file is hidden, yet the secret still ships", () => {
  assert.ok(!visibleFiles(badImage).includes("/app/.env"));
  assert.ok(leakedIn(badImage, SECRET).includes(3));
});
