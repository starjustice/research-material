const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const learn = path.join(__dirname, "..", "learn");
const lessons = [];
for (const subject of fs.readdirSync(learn)) {
  const dir = path.join(learn, subject);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (/^\d\d-.*\.md$/.test(f)) lessons.push(path.join(dir, f));
  }
}

test("there are lessons to check", () => {
  assert.ok(lessons.length > 100);
});

test("every lesson has a Quick summary above its first card", () => {
  for (const file of lessons) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(learn, file);
    const start = text.indexOf("<!-- quick-summary:start -->");
    const end = text.indexOf("<!-- quick-summary:end -->");
    assert.ok(start !== -1 && end > start, `${rel}: missing quick-summary markers (run python3 scripts/quick-summary.py)`);
    const block = text.slice(start, end);
    assert.ok(/^## Quick summary$/m.test(block), `${rel}: missing "## Quick summary" heading`);
    const bullets = block.split("\n").filter(l => l.startsWith("- "));
    assert.ok(bullets.length >= 3, `${rel}: Quick summary has fewer than 3 points`);
    const firstCard = text.search(/^## (?!Quick summary)/m);
    assert.ok(start < firstCard, `${rel}: Quick summary must come before the first card`);
  }
});

test("a generated Quick summary matches the lesson's Remember lines", () => {
  for (const file of lessons) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(learn, file);
    const block = text.slice(text.indexOf("<!-- quick-summary:start -->"), text.indexOf("<!-- quick-summary:end -->"));
    if (block.includes("<!-- quick-summary:manual -->")) continue;
    const remember = [...text.matchAll(/^> \*\*Remember:\*\*\s*(.+)$/gm)].map(m => m[1]);
    const bullets = block.split("\n").filter(l => l.startsWith("- ")).map(l => l.slice(2));
    assert.strictEqual(bullets.length, remember.length, `${rel}: Quick summary is out of date (run python3 scripts/quick-summary.py)`);
  }
});
