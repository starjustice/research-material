// Every page type must use the Calm look. If you add a new stepper, cheatsheet or other page, this test fails
// until the page links calm.css and sets the body classes. Fix it with:  node scripts/calm-apply.js <page-class> <file>
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { calmHrefFor, hasOwnDarkMode } = require("../scripts/calm-apply.js");

const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set([".git", ".claude", ".superpowers", "node_modules", "docs", "tests"]);

function htmlFiles(dir = ROOT) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : htmlFiles(abs);
    return e.name.endsWith(".html") ? [path.relative(ROOT, abs).split(path.sep).join("/")] : [];
  });
}

const all = htmlFiles();
const GROUPS = [
  { name: "hub", pageClass: "page-hub", files: all.filter(f => f === "index.html") },
  { name: "record", pageClass: "page-speak", files: all.filter(f => f === "speak.html") },
];

function problemsFor(rel, pageClass) {
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const sheet = /<link[^>]+href="([^"]*sheet\.css)"/.exec(html);
  const sheetFile = sheet && path.resolve(ROOT, path.dirname(rel), sheet[1]);
  const sheetText = sheetFile && fs.existsSync(sheetFile) ? fs.readFileSync(sheetFile, "utf8") : "";
  const href = calmHrefFor(rel);
  const out = [];
  if (!html.includes(`<link rel="stylesheet" href="${href}">`)) out.push(`${rel}: missing <link href="${href}">`);
  const classes = ((/<body\b[^>]*\bclass="([^"]*)"/.exec(html) || [])[1] || "").split(/\s+/);
  if (!classes.includes("calm")) out.push(`${rel}: body needs class "calm"`);
  if (!classes.includes(pageClass)) out.push(`${rel}: body needs class "${pageClass}"`);
  const dark = hasOwnDarkMode(html, sheetText);
  if (dark !== classes.includes("can-dark")) out.push(`${rel}: can-dark should be ${dark} (it has${dark ? "" : " no"} dark mode)`);
  return out;
}

test("calm.css exists at the repo root", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "calm.css")));
});

for (const g of GROUPS) {
  test(`every ${g.name} page uses the Calm look (${g.files.length} files)`, () => {
    assert.ok(g.files.length > 0, `no files found for ${g.name}`);
    assert.deepStrictEqual(g.files.flatMap(f => problemsFor(f, g.pageClass)), []);
  });
}
