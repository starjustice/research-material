const test = require("node:test");
const assert = require("node:assert");
const { addCalm, calmHrefFor, hasOwnDarkMode } = require("../scripts/calm-apply.js");

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>T</title>
<style>body{margin:0}</style>
</head>
<body>
<h1>Hi</h1>
</body>
</html>
`;
const LINK = '<link rel="stylesheet" href="../../../calm.css">\n';
const opts = { calmHref: "../../../calm.css", pageClass: "page-step", dark: false };

test("addCalm puts one calm.css link just before </head>", () => {
  const out = addCalm(PAGE, opts);
  assert.ok(out.includes(`${LINK}</head>`));
  assert.strictEqual(out.split("calm.css").length - 1, 1);
});

test("addCalm sets the body classes, plus can-dark only when the page has dark mode", () => {
  assert.ok(addCalm(PAGE, opts).includes('<body class="calm page-step">'));
  assert.ok(addCalm(PAGE, { ...opts, dark: true }).includes('<body class="calm page-step can-dark">'));
});

test("addCalm keeps other body attributes and merges an existing class", () => {
  assert.ok(addCalm(PAGE.replace("<body>", '<body data-x="1">'), opts).includes('<body class="calm page-step" data-x="1">'));
  assert.ok(addCalm(PAGE.replace("<body>", '<body class="old">'), opts).includes('<body class="calm page-step old">'));
});

test("addCalm is idempotent", () => {
  const once = addCalm(PAGE, opts);
  assert.strictEqual(addCalm(once, opts), once);
});

test("addCalm only adds: removing the link and the class gives back the input", () => {
  const out = addCalm(PAGE, opts);
  assert.strictEqual(out.replace(LINK, "").replace('<body class="calm page-step">', "<body>"), PAGE);
});

test("calmHrefFor counts the folders between the page and the repo root", () => {
  assert.strictEqual(calmHrefFor("index.html"), "calm.css");
  assert.strictEqual(calmHrefFor("learn/system-design/x-cheatsheet.html"), "../../calm.css");
  assert.strictEqual(calmHrefFor("learn/database/visuals/a.html"), "../../../calm.css");
});

test("hasOwnDarkMode looks in the page and in the shared sheet text", () => {
  assert.strictEqual(hasOwnDarkMode("<style>@media (prefers-color-scheme: dark) { a{} }</style>"), true);
  assert.strictEqual(hasOwnDarkMode("<style>a{}</style>", "@media (prefers-color-scheme: dark){:root{}}"), true);
  assert.strictEqual(hasOwnDarkMode("<style>a{}</style>", "a{}"), false);
});
