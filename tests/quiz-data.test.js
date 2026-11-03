// Every quiz file must be a valid quiz for a real lesson, and quiz-index.json must list them all.
// If the last test fails, run:  node scripts/build-quiz-index.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { validateQuiz } = require("../quiz-helpers");
const { buildIndex } = require("../scripts/build-quiz-index");

const ROOT = path.resolve(__dirname, "..");
const index = buildIndex(ROOT);

for (const lesson of index) {
  test(`${lesson.slug} quiz is valid`, () => {
    const list = JSON.parse(fs.readFileSync(path.join(ROOT, "learn", lesson.subject, "quiz", path.basename(lesson.slug) + ".json"), "utf8"));
    assert.deepStrictEqual(validateQuiz(list), []);
    assert.ok(list.length >= 4, "a quiz should have at least 4 questions");
    // Options are shuffled when shown, so "all of the above" would point at the wrong place.
    for (const item of list) {
      for (const o of item.options) assert.ok(!/^(all|none) of the above/i.test(o), `lazy option: ${o}`);
    }
  });
}

test("quiz-index.json lists every quiz", () => {
  const file = path.join(ROOT, "quiz-index.json");
  assert.ok(fs.existsSync(file), "quiz-index.json is missing: run node scripts/build-quiz-index.js");
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, "utf8")), index);
});
