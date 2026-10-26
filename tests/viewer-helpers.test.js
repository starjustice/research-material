const test = require("node:test");
const assert = require("node:assert");
const { escapePlaceholders, sectionKind, fitDiagram } = require("../viewer-helpers");

test("escapePlaceholders shows a standalone placeholder as text", () => {
  assert.strictEqual(escapePlaceholders("a\n\n<write here>\n\n## Next"), "a\n\n&lt;write here&gt;\n\n## Next");
  assert.strictEqual(escapePlaceholders("<the explain-coach agent writes here>"), "&lt;the explain-coach agent writes here&gt;");
  assert.strictEqual(escapePlaceholders("<answer>"), "&lt;answer&gt;");
});

test("escapePlaceholders leaves real HTML alone", () => {
  for (const line of ["<details>", "<details open>", "<summary>Go deeper (optional)</summary>", "</details>", "<br>"])
    assert.strictEqual(escapePlaceholders(line), line);
});

test("escapePlaceholders leaves fenced code and inline text alone", () => {
  const fenced = "```html\n<write here>\n```";
  assert.strictEqual(escapePlaceholders(fenced), fenced);
  assert.strictEqual(escapePlaceholders("Type <write here> in a sentence"), "Type <write here> in a sentence");
});

test("sectionKind names the kind of each lesson section", () => {
  const cases = {
    "1. The idea in one sentence": "idea", "2. The pictures": "picture", "3. Real life analogy": "analogy",
    "4. The smallest code that shows it": "code", "5. What really happens, step by step": "trace",
    "6. Why it exists and what it costs": "why", "7. Common mistakes": "mistake", "8. Watch and play": "watch",
    "9. Practice": "practice", "10. Interview question": "interview", "11. Explain it back": "explain",
    "12. Review questions (day 1, 3, 7, 21)": "review", "Connected lessons": "", "How to get this lesson": "",
  };
  for (const [title, kind] of Object.entries(cases)) assert.strictEqual(sectionKind(title), kind, title);
});

test("fitDiagram leaves a diagram that fits, shrinks a little, scrolls a very wide one", () => {
  assert.deepStrictEqual(fitDiagram(500, 680), { width: null, scrolls: false });
  assert.deepStrictEqual(fitDiagram(680, 680), { width: null, scrolls: false });
  assert.deepStrictEqual(fitDiagram(800, 680), { width: 680, scrolls: false });
  assert.deepStrictEqual(fitDiagram(1500, 680), { width: 1200, scrolls: true });
});

test("fitDiagram ignores a diagram that failed to render", () => {
  for (const [n, c] of [[0, 680], [NaN, 680], [1500, 0], [undefined, 680]])
    assert.deepStrictEqual(fitDiagram(n, c), { width: null, scrolls: false });
});
