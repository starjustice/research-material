const test = require("node:test");
const assert = require("node:assert");
const {
  parseCaptainDefinition,
  updateOrder,
  rollout,
  routeTable,
  certsToRenew,
  survivesRedeploy,
  restoreReport,
} = require("./21-what-caprover-does-for-you");

const same = (value) => JSON.parse(JSON.stringify(value));

// ---------- parseCaptainDefinition ----------

test("captain-definition: a Dockerfile path is accepted", () => {
  assert.deepStrictEqual(parseCaptainDefinition('{"schemaVersion":2,"dockerfilePath":"./Dockerfile"}'), {
    source: "dockerfilePath",
    value: "./Dockerfile",
  });
});

test("captain-definition: a ready image is accepted", () => {
  assert.deepStrictEqual(parseCaptainDefinition('{"schemaVersion":2,"imageName":"nginx:stable-alpine"}'), {
    source: "imageName",
    value: "nginx:stable-alpine",
  });
});

test("captain-definition: inline Dockerfile lines are accepted", () => {
  const text = '{"schemaVersion":2,"dockerfileLines":["FROM node:24-alpine","CMD [\\"node\\", \\"app.js\\"]"]}';
  assert.deepStrictEqual(parseCaptainDefinition(text), {
    source: "dockerfileLines",
    value: ["FROM node:24-alpine", 'CMD ["node", "app.js"]'],
  });
});

test("captain-definition: a template such as node/24 is accepted, for each template name", () => {
  assert.deepStrictEqual(parseCaptainDefinition('{"schemaVersion":2,"templateId":"node/24"}'), {
    source: "templateId",
    value: "node/24",
  });
  for (const name of ["node", "php", "python-django", "ruby-rack"]) {
    const result = parseCaptainDefinition(JSON.stringify({ schemaVersion: 2, templateId: name + "/1" }));
    assert.strictEqual(result.source, "templateId");
    assert.strictEqual(result.value, name + "/1");
  }
});

test("captain-definition: the order of the keys does not matter", () => {
  const result = parseCaptainDefinition('{"dockerfilePath":"./Dockerfile","schemaVersion":2}');
  assert.deepStrictEqual(result, { source: "dockerfilePath", value: "./Dockerfile" });
});

test("captain-definition: text that is not JSON is rejected", () => {
  assert.throws(() => parseCaptainDefinition("{schemaVersion: 2"), /JSON object/);
  assert.throws(() => parseCaptainDefinition(""), /JSON object/);
});

test("captain-definition: JSON that is not an object is rejected", () => {
  assert.throws(() => parseCaptainDefinition("[]"), /JSON object/);
  assert.throws(() => parseCaptainDefinition("null"), /JSON object/);
  assert.throws(() => parseCaptainDefinition('"hello"'), /JSON object/);
});

test("captain-definition: schemaVersion must be the number 2", () => {
  assert.throws(() => parseCaptainDefinition('{"dockerfilePath":"./Dockerfile"}'), /schemaVersion/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":1,"dockerfilePath":"./Dockerfile"}'), /schemaVersion/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":"2","dockerfilePath":"./Dockerfile"}'), /schemaVersion/);
});

test("captain-definition: no choice is rejected", () => {
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2}'), /exactly one/);
});

test("captain-definition: two choices are rejected, there is no picking", () => {
  assert.throws(
    () => parseCaptainDefinition('{"schemaVersion":2,"dockerfilePath":"./Dockerfile","imageName":"nginx"}'),
    /exactly one/
  );
  assert.throws(
    () => parseCaptainDefinition('{"schemaVersion":2,"templateId":"node/24","dockerfileLines":["FROM node"]}'),
    /exactly one/
  );
});

test("captain-definition: a Dockerfile path may not leave the project", () => {
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"dockerfilePath":"../Dockerfile"}'), /inside the project/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"dockerfilePath":"./a/../../Dockerfile"}'), /inside the project/);
});

test("captain-definition: a name that only contains two dots is not a parent folder", () => {
  const result = parseCaptainDefinition('{"schemaVersion":2,"dockerfilePath":"./docker/Dockerfile..prod"}');
  assert.deepStrictEqual(result, { source: "dockerfilePath", value: "./docker/Dockerfile..prod" });
});

test("captain-definition: image name and path must be text that is not empty", () => {
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"imageName":""}'), /must be text/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"imageName":5}'), /must be text/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"dockerfilePath":"  "}'), /must be text/);
});

test("captain-definition: dockerfileLines must be a non-empty list of text lines", () => {
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"dockerfileLines":[]}'), /dockerfileLines/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"dockerfileLines":"FROM node"}'), /dockerfileLines/);
  assert.throws(() => parseCaptainDefinition('{"schemaVersion":2,"dockerfileLines":["FROM node",5]}'), /dockerfileLines/);
});

test("captain-definition: templateId must be a known NAME/VERSION", () => {
  for (const bad of ["node", "node/", "/24", "java/21", "node/24/x", "Node/24"]) {
    assert.throws(
      () => parseCaptainDefinition(JSON.stringify({ schemaVersion: 2, templateId: bad })),
      /templateId/,
      "should reject " + bad
    );
  }
});

// ---------- updateOrder ----------

test("updateOrder: an app with no folder starts the new copy first", () => {
  assert.strictEqual(updateOrder([]), "start-first");
  assert.strictEqual(updateOrder(undefined), "start-first");
});

test("updateOrder: an app with a persistent directory stops the old copy first", () => {
  assert.strictEqual(updateOrder([{ path: "/app/uploads" }]), "stop-first");
  assert.strictEqual(updateOrder([{ path: "/a" }, { path: "/b" }]), "stop-first");
});

// ---------- rollout ----------

test("rollout: start-first with a health check and a working new copy has no gap", () => {
  assert.deepStrictEqual(
    rollout({ order: "start-first", healthCheck: true, bootSeconds: 15, newWorks: true }),
    { downtimeSeconds: 0, serving: "new" }
  );
});

test("rollout: start-first without a health check leaves a gap while the new copy boots", () => {
  assert.deepStrictEqual(
    rollout({ order: "start-first", healthCheck: false, bootSeconds: 8, newWorks: true }),
    { downtimeSeconds: 8, serving: "new" }
  );
});

test("rollout: stop-first has a gap, even with a health check", () => {
  assert.deepStrictEqual(
    rollout({ order: "stop-first", healthCheck: true, bootSeconds: 8, newWorks: true }),
    { downtimeSeconds: 8, serving: "new" }
  );
  assert.deepStrictEqual(
    rollout({ order: "stop-first", healthCheck: false, bootSeconds: 3, newWorks: true }),
    { downtimeSeconds: 3, serving: "new" }
  );
});

test("rollout: start-first with a health check keeps the old copy when the new one never works", () => {
  assert.deepStrictEqual(
    rollout({ order: "start-first", healthCheck: true, bootSeconds: 8, newWorks: false }),
    { downtimeSeconds: 0, serving: "old" }
  );
});

test("rollout: without a health check a broken new copy replaces the old one, and nothing serves", () => {
  assert.deepStrictEqual(
    rollout({ order: "start-first", healthCheck: false, bootSeconds: 8, newWorks: false }),
    { downtimeSeconds: Infinity, serving: "nothing" }
  );
  assert.deepStrictEqual(
    rollout({ order: "stop-first", healthCheck: true, bootSeconds: 8, newWorks: false }),
    { downtimeSeconds: Infinity, serving: "nothing" }
  );
});

test("rollout: a failed build touches nothing", () => {
  for (const order of ["start-first", "stop-first"]) {
    for (const healthCheck of [true, false]) {
      assert.deepStrictEqual(
        rollout({ order, healthCheck, bootSeconds: 8, newWorks: true, buildOk: false }),
        { downtimeSeconds: 0, serving: "old" }
      );
    }
  }
});

test("rollout: a missing buildOk means the build worked", () => {
  assert.deepStrictEqual(
    rollout({ order: "start-first", healthCheck: false, bootSeconds: 2, newWorks: true }),
    { downtimeSeconds: 2, serving: "new" }
  );
});

// ---------- routeTable ----------

test("routeTable: one app gets one route with its name and port", () => {
  const apps = [{ name: "shop", port: 3000, https: true, forceHttps: false }];
  assert.deepStrictEqual(routeTable(apps, "apps.example.com"), [
    { host: "shop.apps.example.com", upstream: "http://shop:3000", https: true, redirectToHttps: false },
  ]);
});

test("routeTable: a missing port means 80, and a missing https means no certificate", () => {
  assert.deepStrictEqual(routeTable([{ name: "blog" }], "apps.example.com"), [
    { host: "blog.apps.example.com", upstream: "http://blog:80", https: false, redirectToHttps: false },
  ]);
});

test("routeTable: forceHttps redirects only a host that has a certificate", () => {
  const apps = [
    { name: "a", port: 1, https: true, forceHttps: true },
    { name: "b", port: 2, https: false, forceHttps: true },
  ];
  const rows = routeTable(apps, "x.test");
  assert.strictEqual(rows.find((r) => r.host === "a.x.test").redirectToHttps, true);
  assert.strictEqual(rows.find((r) => r.host === "b.x.test").redirectToHttps, false);
});

test("routeTable: an app that is not on the web gets no route", () => {
  const apps = [
    { name: "worker", port: 9, web: false },
    { name: "shop", port: 3000 },
  ];
  const rows = routeTable(apps, "x.test");
  assert.deepStrictEqual(rows.map((r) => r.host), ["shop.x.test"]);
});

test("routeTable: extra domains point to the same app, each with its own certificate flag", () => {
  const apps = [
    {
      name: "shop",
      port: 3000,
      https: true,
      forceHttps: true,
      domains: [
        { host: "shop.example.org", https: true },
        { host: "www.example.org", https: false },
      ],
    },
  ];
  assert.deepStrictEqual(routeTable(apps, "x.test"), [
    { host: "shop.example.org", upstream: "http://shop:3000", https: true, redirectToHttps: true },
    { host: "shop.x.test", upstream: "http://shop:3000", https: true, redirectToHttps: true },
    { host: "www.example.org", upstream: "http://shop:3000", https: false, redirectToHttps: false },
  ]);
});

test("routeTable: rows are sorted by host and the input is not changed", () => {
  const apps = [
    { name: "zeta", port: 1, domains: [{ host: "a.example.org", https: false }] },
    { name: "alpha", port: 2 },
  ];
  const before = same(apps);
  const rows = routeTable(apps, "x.test");
  assert.deepStrictEqual(rows.map((r) => r.host), ["a.example.org", "alpha.x.test", "zeta.x.test"]);
  assert.deepStrictEqual(apps, before);
});

test("routeTable: no apps give no routes", () => {
  assert.deepStrictEqual(routeTable([], "x.test"), []);
});

// ---------- certsToRenew ----------

test("certsToRenew: only a certificate with less than 30 days left is renewed", () => {
  const certs = [
    { host: "a.x.test", daysLeft: 12 },
    { host: "b.x.test", daysLeft: 45 },
    { host: "c.x.test", daysLeft: 29 },
  ];
  assert.deepStrictEqual(certsToRenew(certs), ["a.x.test", "c.x.test"]);
});

test("certsToRenew: exactly 30 days left is not renewed yet", () => {
  assert.deepStrictEqual(certsToRenew([{ host: "a.x.test", daysLeft: 30 }]), []);
  assert.deepStrictEqual(certsToRenew([{ host: "a.x.test", daysLeft: 29 }]), ["a.x.test"]);
});

test("certsToRenew: an expired certificate is renewed too, and the order is kept", () => {
  const certs = [
    { host: "z.x.test", daysLeft: 5 },
    { host: "m.x.test", daysLeft: -2 },
    { host: "a.x.test", daysLeft: 80 },
  ];
  assert.deepStrictEqual(certsToRenew(certs), ["z.x.test", "m.x.test"]);
});

test("certsToRenew: nothing to do gives an empty list", () => {
  assert.deepStrictEqual(certsToRenew([]), []);
  assert.deepStrictEqual(certsToRenew([{ host: "a.x.test", daysLeft: 60 }]), []);
});

// ---------- survivesRedeploy ----------

test("survivesRedeploy: a file inside a mounted folder survives", () => {
  assert.strictEqual(survivesRedeploy(["/app/uploads"], "/app/uploads/photo.png"), true);
  assert.strictEqual(survivesRedeploy(["/app/uploads"], "/app/uploads/2026/photo.png"), true);
});

test("survivesRedeploy: the mounted folder itself survives", () => {
  assert.strictEqual(survivesRedeploy(["/app/uploads"], "/app/uploads"), true);
});

test("survivesRedeploy: a file outside every mounted folder is gone", () => {
  assert.strictEqual(survivesRedeploy(["/app/uploads"], "/app/tmp/cache.json"), false);
  assert.strictEqual(survivesRedeploy([], "/app/uploads/photo.png"), false);
});

test("survivesRedeploy: a folder that only starts with the same letters is a different folder", () => {
  assert.strictEqual(survivesRedeploy(["/app/uploads"], "/app/uploads2/photo.png"), false);
  assert.strictEqual(survivesRedeploy(["/app/uploads"], "/app/uploads-old"), false);
  assert.strictEqual(survivesRedeploy(["/app/data"], "/app/database/x"), false);
});

test("survivesRedeploy: a slash at the end of the mount changes nothing", () => {
  assert.strictEqual(survivesRedeploy(["/app/uploads/"], "/app/uploads/photo.png"), true);
  assert.strictEqual(survivesRedeploy(["/app/uploads/"], "/app/uploads"), true);
  assert.strictEqual(survivesRedeploy(["/app/uploads/"], "/app/uploads2/photo.png"), false);
});

test("survivesRedeploy: any one of several mounts is enough", () => {
  const mounts = ["/var/lib/postgresql/data", "/app/uploads"];
  assert.strictEqual(survivesRedeploy(mounts, "/app/uploads/a.png"), true);
  assert.strictEqual(survivesRedeploy(mounts, "/var/lib/postgresql/data/base/1"), true);
  assert.strictEqual(survivesRedeploy(mounts, "/var/lib/other"), false);
});

// ---------- restoreReport ----------

test("restoreReport: with both backups, settings and data come back, images do not", () => {
  assert.deepStrictEqual(restoreReport({ configBackup: true, dataBackup: true, registry: false }), {
    settingsBack: true,
    certificatesBack: true,
    imagesBack: false,
    dataBack: true,
  });
});

test("restoreReport: the configuration backup never has your data", () => {
  assert.deepStrictEqual(restoreReport({ configBackup: true, dataBackup: false, registry: false }), {
    settingsBack: true,
    certificatesBack: true,
    imagesBack: false,
    dataBack: false,
  });
});

test("restoreReport: your own data backup does not bring back the settings", () => {
  assert.deepStrictEqual(restoreReport({ configBackup: false, dataBackup: true, registry: false }), {
    settingsBack: false,
    certificatesBack: false,
    imagesBack: false,
    dataBack: true,
  });
});

test("restoreReport: with no backup nothing comes back", () => {
  assert.deepStrictEqual(restoreReport({ configBackup: false, dataBackup: false, registry: false }), {
    settingsBack: false,
    certificatesBack: false,
    imagesBack: false,
    dataBack: false,
  });
});

test("restoreReport: images come back only with the config backup and the registry", () => {
  assert.strictEqual(restoreReport({ configBackup: true, dataBackup: false, registry: true }).imagesBack, true);
  assert.strictEqual(restoreReport({ configBackup: false, dataBackup: true, registry: true }).imagesBack, false);
  assert.strictEqual(restoreReport({ configBackup: true, dataBackup: true, registry: false }).imagesBack, false);
});
