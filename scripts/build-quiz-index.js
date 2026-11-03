#!/usr/bin/env node
// Writes quiz-index.json: the list of lessons that have a quiz. progress.html reads it, so it can show lessons you have not tried yet.
//
//   node scripts/build-quiz-index.js
//
// A quiz file is learn/<subject>/quiz/<lesson file name>.json, next to learn/<subject>/<lesson file name>.md.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function firstHeading(file) {
  const line = fs.readFileSync(file, "utf8").split("\n").find(l => l.startsWith("# "));
  return line ? line.slice(2).trim() : path.basename(file);
}

function buildIndex(root = ROOT) {
  const learn = path.join(root, "learn");
  const out = [];
  for (const subject of fs.readdirSync(learn).sort()) {
    const quizDir = path.join(learn, subject, "quiz");
    if (!fs.existsSync(quizDir)) continue;
    const readme = path.join(learn, subject, "README.md");
    const subjectTitle = fs.existsSync(readme) ? firstHeading(readme) : subject;
    for (const file of fs.readdirSync(quizDir).filter(f => f.endsWith(".json")).sort()) {
      const name = file.replace(/\.json$/, "");
      const lesson = path.join(learn, subject, name + ".md");
      if (!fs.existsSync(lesson)) throw new Error("quiz without a lesson: " + path.relative(root, path.join(quizDir, file)));
      const heading = firstHeading(lesson);
      const num = /^(\d+)\.\s*(.*)$/.exec(heading);
      const questions = JSON.parse(fs.readFileSync(path.join(quizDir, file), "utf8"));
      out.push({
        slug: `learn/${subject}/${name}`, subject, subjectTitle,
        num: num ? num[1] : "", title: num ? num[2] : heading, count: questions.length,
      });
    }
  }
  return out;
}

if (require.main === module) {
  const index = buildIndex();
  fs.writeFileSync(path.join(ROOT, "quiz-index.json"), JSON.stringify(index, null, 1) + "\n");
  console.log("quiz-index.json:", index.length, "lessons,", index.reduce((n, l) => n + l.count, 0), "questions");
}

module.exports = { buildIndex };
