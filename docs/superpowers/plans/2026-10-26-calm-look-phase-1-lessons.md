# Calm Look, Phase 1 (Lessons) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The lesson viewer (`viewer.html`) shows every note in the Calm look by default, with the placeholder bug fixed and wide diagrams readable.

**Architecture:** The spike already works: `calm.css` styles everything under `body.look-calm`, and `viewer.html` wraps each `##` section in a `.chunk` card. Phase 1 moves the pure logic into `viewer-helpers.js` (unit tested with `node:test`), fixes the two known bugs, checks 9 notes on 3 screen widths, then, only after the owner says go, flips the default.

**Tech Stack:** Plain HTML, CSS and JS on GitHub Pages. marked and mermaid from jsDelivr (already used). Google Fonts. `node:test` for helper tests (Node 24, no `package.json`).

**Spec:** `docs/superpowers/specs/2026-10-26-calm-look-design.md`

## Global Constraints

- Look: dark 2px borders, a small hard shadow, soft colors, rounded 12px corners, colored boxes for each kind of content, buttons that press down.
- Fonts: Lexend for body text, Space Grotesk for headings, from Google Fonts.
- Copy the look. No React, Next.js or Tailwind.
- Relative paths only. GitHub Pages serves the site under `/research-material/`, so `/calm.css` would break.
- Keep dark mode wherever it exists today. The viewer has none, so add none.
- Phase 1 touches only `viewer.html`, `calm.css` and new files. Hub, study route, speak, steppers and cheatsheets stay as they are.
- No sideways page scroll on a phone, no console errors, every diagram renders.
- Plain, simple English in anything the owner reads (for example the diagram hint).
- File names are lowercase with hyphens.
- Preview with the `static-hub` entry in `.claude/launch.json` (port 4173).

## Review Focus

1. A note with no `##` headings, or the "planned lesson" page (no file yet), still renders with no error. Test: Task 3.
2. A placeholder other than the two known ones (for example `<answer>`) must not swallow later sections, and a tag-looking line inside a code fence must stay as it is. Real lessons have such lines in code examples (`<View style=...>`, `<template>`, `<style scoped>`). Test: Task 1.
3. A diagram wider than a 320px phone scrolls inside its card and never makes the whole page scroll sideways. Test: Task 3.
4. A diagram that failed to render (no `svg`, or zero width) is skipped without an error. Test: Task 1 and Task 2.
5. A deep link like `#9-practice` lands on the card's heading, not above it. Test: Task 3.

## File Structure

- Create `viewer-helpers.js`: pure functions, no DOM. Loaded by `viewer.html`, and `require`d by the tests.
- Create `tests/viewer-helpers.test.js`: run with `node --test tests/`.
- Create `.gitignore`: one line, `.superpowers/` (mockup scratch files).
- Modify `viewer.html`: use the helpers, fit diagrams, then flip the default (Task 4).
- Modify `calm.css`: drop the spike's font switcher (Task 4).
- Already in the worktree, not yet committed: the spike edits to `viewer.html`, `calm.css`, and the two documents under `docs/superpowers/`.

---

### Task 1: Helpers and tests

**Files:**
- Create: `viewer-helpers.js`, `tests/viewer-helpers.test.js`, `.gitignore`

**Interfaces:**
- Produces (CommonJS `module.exports` in Node, `window.ViewerHelpers` in the browser):
  - `escapePlaceholders(md: string): string`
  - `sectionKind(title: string): string` (`""` when no kind fits)
  - `fitDiagram(naturalWidth: number, containerWidth: number, minScale = 0.8): { width: number | null, scrolls: boolean }`

- [ ] **Step 1: Commit the baseline.** Create `.gitignore` containing `.superpowers/`. Then: `git add .gitignore calm.css viewer.html docs && git commit -m "Add Calm look design, plan and lesson viewer spike"`. Add the repo's commit attribution lines.

- [ ] **Step 2: Write the failing tests** in `tests/viewer-helpers.test.js` (CommonJS, same style as `learn/database/practice/*.test.js`):

```js
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
```

- [ ] **Step 3: Run `node --test tests/`.** Expected: FAIL with `Cannot find module '../viewer-helpers'`.

- [ ] **Step 4: Implement `viewer-helpers.js`.** Rules:
  - `escapePlaceholders`: walk the lines, skip everything between ``` fences, and for a line that is only an opening tag (`/^<[A-Za-z][^<>]*>\s*$/`) whose element name is not a known HTML element (at least: details, summary, div, span, p, br, hr, a, img, ul, ol, li, table, tr, td, th, pre, code, kbd, mark, small, sub, sup, section, style, script, template, svg, iframe, video, button, input, label, form), replace `<` and `>` with `&lt;` and `&gt;`.
  - `sectionKind`: the spike's table from `viewer.html` (first regex that matches wins, case-insensitive), returning the kind name or `""`.
  - `fitDiagram`: if either input is not a positive finite number, or natural ≤ container, return `{ width: null, scrolls: false }`. Otherwise `scaled = natural * minScale`, return `{ width: Math.max(container, scaled), scrolls: scaled > container }`.
  - Export dual: `module.exports` when `module` exists, else `window.ViewerHelpers`.

- [ ] **Step 5: Run `node --test tests/`.** Expected: 6 tests pass, 0 fail.

- [ ] **Step 6: Commit** `viewer-helpers.js` and `tests/`.

### Task 2: Use the helpers in the viewer (still behind `&look=calm`)

**Files:**
- Modify: `viewer.html`

**Interfaces:**
- Consumes: `ViewerHelpers.escapePlaceholders`, `ViewerHelpers.sectionKind`, `ViewerHelpers.fitDiagram` from Task 1.

- [ ] **Step 1: Load the helpers.** Add `<script src="viewer-helpers.js"></script>` right after the mermaid script tag (relative path).

- [ ] **Step 2: Fix the placeholder bug for everyone.** Replace the spike's `calm ? md.replace(...) : md` with `marked.parse(ViewerHelpers.escapePlaceholders(md))`, with no `calm` condition.

- [ ] **Step 3: Use `sectionKind`** instead of the spike's inline `kinds` list. Set `chunk.dataset.kind` only when the result is not `""`.

- [ ] **Step 4: Fit diagrams, for every look.** After the mermaid render block and before the "Jump to a section" block: for each `.mermaid` element that contains an `svg`, read `natural = svg.viewBox.baseVal.width` and `container` = the element's inner width (clientWidth minus its left and right padding), call `fitDiagram(natural, container)`. When `width` is not null, set `svg.style.maxWidth = "none"` and `svg.style.width = width + "px"`. When `scrolls` is true, add class `scrolls` to the element and insert `<p class="swipe-hint">Swipe sideways to see the whole picture</p>` just before it. Skip silently when there is no `svg`.

- [ ] **Step 5: Add the hint style** in `viewer.html`'s own `<style>`, next to `.mermaid`: `.swipe-hint { font-size: .78rem; color: var(--muted); margin: 10px 0 -4px; }`.

- [ ] **Step 6: Verify.** `preview_start` with name `static-hub`. Open `http://localhost:4173/viewer.html?note=learn/database/01-sql-basics-and-query-order&look=calm`, first at 1100px wide and then at 375px (`resize_window`). Run this with `javascript_tool`:

```js
await new Promise(r => setTimeout(r, 3000));
({ unreadable: [...document.querySelectorAll('.mermaid svg')].filter(s => s.viewBox.baseVal.width > 0 && s.getBoundingClientRect().width / s.viewBox.baseVal.width < 0.79).length,
   sideways: document.documentElement.scrollWidth > innerWidth + 1,
   scrolling: document.querySelectorAll('.mermaid.scrolls').length, hints: document.querySelectorAll('.swipe-hint').length })
```
  Expected at both widths: `unreadable: 0`, `sideways: false`, `hints` equal to `scrolling`. At 375px, `scrolling` is at least 1 (the "big picture" diagram). `read_console_messages` with `onlyErrors: true` shows nothing. Open the same note without `&look=calm`: the old look is unchanged, the placeholder fix and diagram fit still apply.

- [ ] **Step 7: Commit** `viewer.html`.

### Task 3: Check nine notes, then the owner checkpoint

**Files:** none changed unless a check fails. Fix what fails, in the file that owns it, and commit each fix on its own.

- [ ] **Step 1: List.** Each URL is `http://localhost:4173/viewer.html?note=<note>&look=calm`:
  - `learn/database/01-sql-basics-and-query-order`
  - `learn/javascript/01-variables-scope-and-hoisting`
  - `learn/backend-api/01-http-basics` (has the placeholder bug)
  - `learn/react-native/11-flexbox-layout` (code heavy)
  - `learn/system-design/07-consistency-and-cap` (the longest, about 6,500 words)
  - `learn/database/README` (a lesson table)
  - `my-learning/learner-profile` (few numbered sections)
  - `interview/companies/paypay/paypay-frontend-interview-prep` (not a lesson)
  - `learn/database/06-keys-and-relationships` (no file yet, so the "planned" page)

- [ ] **Step 2: Run this on each** at 375px wide. Also run it at 1100px for the first five, and at 320px for `01-sql-basics...` and `07-consistency-and-cap`:

```js
await new Promise(r => setTimeout(r, 3000));
({ h2Outside: [...document.querySelectorAll('article h2')].filter(h => h.parentElement.className !== 'chunk').length,
   diagrams: document.querySelectorAll('.mermaid svg').length + '/' + document.querySelectorAll('.mermaid').length,
   sideways: document.documentElement.scrollWidth > innerWidth + 1, error: !!document.querySelector('.error') })
```
  Expected every time: `h2Outside: 0`, diagrams `n/n`, `sideways: false`, `error: false`, and `read_console_messages` with `onlyErrors: true` empty.

- [ ] **Step 3: Deep link.** Open `...01-sql-basics-and-query-order&look=calm#9-practice`. Run `document.getElementById('9-practice').getBoundingClientRect().top`. Expected: between 0 and 140.

- [ ] **Step 4: Screenshot for the owner**, at 1100px unless noted: the top of `01-sql-basics...`, the "2. The pictures" section of `07-consistency-and-cap`, and the same page at 375px.

- [ ] **Step 5: STOP. Owner checkpoint.** Give the owner the screenshots and the links. Ask whether to make Calm the default for all lessons. Do not start Task 4 until they say go. If they ask for changes, make them and repeat Step 2 on the affected notes.

### Task 4: Make Calm the default (only after the owner says go)

**Files:**
- Modify: `viewer.html`, `calm.css`

- [ ] **Step 1: Default on.** In `viewer.html`: set `<body class="no-side look-calm">`; replace the head script with static tags, `<link rel="stylesheet" href="calm.css">` and the Google Fonts tags for Lexend (400, 600, 800) and Space Grotesk (700) with `display=swap` and a preconnect; delete the `calm`, `fontParam`, `font`, `lookQ` constants and the `if (calm)` gate around the section cards; make `noteHref` and the relative-link rewrite plain again (no `lookQ`).

- [ ] **Step 2: Tidy `calm.css`.** Delete the `data-font` rules for atkinson, dmsans and system. Keep Lexend and Space Grotesk. Update the top comment: it now loads for every note.

- [ ] **Step 3: Verify.** Open the plain address, with no parameters, for `learn/database/01-sql-basics-and-query-order`, `learn/system-design/07-consistency-and-cap` and `learn/database/06-keys-and-relationships`. Expected: `document.body.classList.contains('look-calm')` is `true`, `document.fonts.check('16px Lexend')` is `true`, and the Task 3 Step 2 snippet passes. An old bookmark with `&look=calm&font=atkinson` still opens in Lexend with no error. `git diff --stat 7d764a6` lists only `.gitignore`, `calm.css`, `docs/`, `tests/viewer-helpers.test.js`, `viewer-helpers.js` and `viewer.html`.

- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.

- [ ] **Step 5: Commit**, then use superpowers:finishing-a-development-branch to land it. The repo rule is to work on `main`, and pushing to `main` updates the live site, so ask the owner before pushing.
