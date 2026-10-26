# Calm look, phases 2 to 4 (everything except the lesson viewer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every remaining page type the Calm look (hub, speak, 62 steppers, 32 cheatsheets, study route) so the whole site feels like one product, without breaking any stepper, diagram, dark mode or phone layout.

**Architecture:** One shared `calm.css` (already used by `viewer.html`) gets one section per page type, each scoped under `body.calm.page-<type>`. A small Node script adds the `<link>` and the body classes to the static pages. A node:test guard test checks that every page of a type has them, so a new page cannot ship without the Calm look. Pages keep their own inline CSS and their own meaning colors; Calm adds shape (borders, shadow, radius, font, buttons), not new meanings.

**Tech Stack:** Plain HTML/CSS, Node 24 (`node --test tests/*.test.js`), Python (`scripts/build-hub.py`), Browser pane for visual checks.

**Spec:** `docs/superpowers/specs/2026-10-26-calm-look-design.md` (phases 2 to 4). Two facts in the spec were wrong when checked on 2026-10-26: only the 17 cheatsheets that link `sheet.css` have dark mode (the other 15 have none), and the two `sheet.css` copies differ only in one comment.

## Global Constraints

- Relative links only: GitHub Pages serves under `/research-material/` (from `learn/x/visuals/y.html` the link is `../../../calm.css`).
- Calm rules are scoped under `body.calm.page-<type>` (viewer keeps `body.look-calm`). The plain viewer look must not change.
- Do not override a page's meaning colors (`--keep`, `--drop`, `--bad`, `--green`, `--pink` and the like). Calm may change `--radius`, borders, shadows, fonts, buttons.
- A page that has dark mode today keeps it. A page without dark mode does not get one. Pages with dark mode get the class `can-dark`.
- Fonts: Lexend (body) and Space Grotesk (headings), loaded by `@import` at the top of `calm.css` (same Google Fonts URL the viewer uses).
- No change to any element id, class name used by page JavaScript, or DOM structure of a stepper. Only `<head>` gets one `<link>` and `<body>` gets a `class`.
- Plain simple English in anything the owner reads. Commit on this branch per task. Do not push to `origin/main` without the owner's yes.
- Test command: `node --test tests/*.test.js` (plain `tests/` fails on Node 24).

## Review Focus

- A stepper's meaning colors are unchanged (`.st.past` green, `.st.now` blue, `.tv.true`, `.tv.false`, `.result.bad`): compare computed colors before and after on three pages.
- Phone width (375px): no page-level sideways scroll on any of the 94 pages after the change.
- Dark mode pages (27 steppers, 17 sheets, hub): text stays readable, borders stay visible, no white boxes left behind.
- Stepper controls still work after the restyle (Next, Back, Auto, Reset, tabs, predict input) on one page per subject.
- Google Fonts blocked or slow: the page still lays out with system fonts (no layout break).

## File map

- Modify `calm.css`: add `@import` fonts, shared tokens for `body.calm`, then sections `page-hub`, `page-speak`, `page-step`, `page-sheet`, `page-study`.
- Create `scripts/calm-apply.js`: pure `addCalm(html, opts)`, `calmHrefFor(pagePath)`, `hasOwnDarkMode(html, sheetText)`, plus a CLI that edits files in place.
- Create `tests/calm-apply.test.js` (unit tests) and `tests/calm-pages.test.js` (guard test over the real pages).
- Modify `scripts/build-hub.py` (hub), `speak.html`, `study.html`, the 62 stepper pages, the 32 cheatsheets, `learn/*/sheet.css` (merge to one root `sheet.css`).
- Modify `.claude/agents/research-material.md`, `.claude/skills/learn/SKILL.md`, `templates/*.md` so new pages start in Calm.

---

### Task 1: Foundation: shared tokens and the apply script

**Files:**
- Modify: `calm.css`
- Create: `scripts/calm-apply.js`, `tests/calm-apply.test.js`

**Interfaces:**
- Produces: `addCalm(html: string, { calmHref: string, pageClass: string, dark: boolean }) => string`; `calmHrefFor(pagePath: string) => string`; `hasOwnDarkMode(html: string, sheetText?: string) => boolean`; CLI `node scripts/calm-apply.js <pageClass> <file...>` (dark mode and sheet text found by the script itself).
- Produces CSS: tokens on `body.calm` (`--edge`, `--line`, `--shadow`, `--shadow-s`, `--r`, `--font-body`, `--font-head`, `--c-blue|yellow|violet|green|pink|orange`), dark overrides on `body.calm.can-dark`.

- [ ] **Step 1: Write the failing tests** in `tests/calm-apply.test.js` (node:test, CommonJS). Cases, each its own `test(...)`: `addCalm` puts exactly one `<link rel="stylesheet" href="../../../calm.css">` just before `</head>`; sets `<body class="calm page-step">`; adds ` can-dark` when `dark` is true; keeps other `<body>` attributes; second run returns the same string (idempotent); removing the link and the class gives back the input exactly; `calmHrefFor("learn/database/visuals/a.html") === "../../../calm.css"`, `calmHrefFor("index.html") === "calm.css"`, `calmHrefFor("learn/system-design/x-cheatsheet.html") === "../../calm.css"`; `hasOwnDarkMode` is true for inline `prefers-color-scheme: dark`, true when the extra sheet text has it, false otherwise.
- [ ] **Step 2: Run** `node --test tests/*.test.js`. Expected: new tests FAIL (module not found).
- [ ] **Step 3: Implement** `scripts/calm-apply.js` with the interface above. `addCalm` edits only the `</head>` and `<body` text. The CLI reads each file, finds a linked `sheet.css` next to it for `hasOwnDarkMode`, writes the file back, prints one line per changed file.
- [ ] **Step 4: Run** `node --test tests/*.test.js`. Expected: all PASS (the 8 viewer tests plus the new ones).
- [ ] **Step 5: Add to `calm.css`** the `@import` line, the `body.calm` shared tokens block, the dark token block for `body.calm.can-dark`, and a comment header listing the sections. Do not touch any existing `body.look-calm` rule. Reload a viewer lesson in the preview and confirm the computed style of a `.chunk` is unchanged.
- [ ] **Step 6: Commit** `git add calm.css scripts/calm-apply.js tests/calm-apply.test.js && git commit -m "Add Calm foundation tokens and the apply script"`.

### Task 2: Hub

**Files:**
- Modify: `scripts/build-hub.py` (STYLE keeps only the palette variables, light and dark; `<link>` and body classes added), `calm.css` (section `page-hub`), regenerated `index.html`
- Test: `tests/calm-pages.test.js` (new, hub group)

**Interfaces:**
- Consumes: Task 1 (`calmHrefFor` rule, class names `calm page-hub can-dark`).
- Produces: `tests/calm-pages.test.js` with a `groups` list the later tasks extend: `{ name, files(), pageClass }`.

- [ ] **Step 1: Write the failing guard test** for the hub group: `index.html` has `href="calm.css"`, `<body class="calm page-hub can-dark">`.
- [ ] **Step 2: Run** the suite. Expected: hub guard FAILS.
- [ ] **Step 3: Change `scripts/build-hub.py`**: emit the `<link>` and body classes, keep the `:root` palette (light and the existing dark block), drop the layout rules that move to `calm.css`. Run `python3 scripts/build-hub.py`.
- [ ] **Step 4: Write the `page-hub` section** in `calm.css`: cards (`a.card`) with `--line`, `--shadow-s`, press on `:active`, tags as bordered chips keeping their five colors, subject folders (`details.subject`) with a colored summary bar, headings in `--font-head`. Cards inside an open subject use no shadow.
- [ ] **Step 5: Run** the suite. Expected: PASS. Open `index.html` in the preview at 1100px and 375px, light and dark: no sideways scroll, no console errors, cards readable, dark mode still dark.
- [ ] **Step 6: Commit** `Give the hub the Calm look`.

### Task 3: Speak page

**Files:**
- Modify: `speak.html` (link and body class `calm page-speak`), `calm.css` (section `page-speak`), `tests/calm-pages.test.js` (speak group)

- [ ] **Step 1: Add the speak group to the guard test.** Run the suite. Expected: FAIL for `speak.html`.
- [ ] **Step 2: Run** `node scripts/calm-apply.js page-speak speak.html`.
- [ ] **Step 3: Write the `page-speak` section**: `.card` panels with `--line` and `--shadow`, the four part checkboxes as bordered boxes, the record button keeps its red and pulse (meaning), `.btns button` pressable, `.stat` tiles bordered, inputs bordered. Page has no dark mode, so no `can-dark`.
- [ ] **Step 4: Run** the suite. Expected: PASS. In the preview at 375px and 1100px: no sideways scroll, no console errors, the record button still toggles its `.on` class when clicked.
- [ ] **Step 5: Commit** `Give the record page the Calm look`.

### Task 4: Steppers (62)

**Files:**
- Modify: the 62 `learn/*/visuals/*.html` (only `<head>` link and `<body>` class change), `calm.css` (section `page-step`), `tests/calm-pages.test.js` (stepper group)

- [ ] **Step 1: Add the stepper group** (all `learn/*/visuals/*.html`, class `page-step`, `can-dark` exactly when the page's inline CSS has `prefers-color-scheme: dark`). Run the suite. Expected: FAIL listing the 62 pages.
- [ ] **Step 2: Run** `node scripts/calm-apply.js page-step learn/*/visuals/*.html`. Check `git diff --stat`: each page changes by 2 lines (one `<link>`, one `<body>`) and nothing else.
- [ ] **Step 3: Write the `page-step` section** for the shared classes `.top a`, `h1`, `.sub`, `.tabs button`, `.predict`, `.panel`, `.panel h2`, `.controls button` (primary = yellow), `.note`, `.bar`, `.result`, `.legend`, `.outbox`, inputs. Dark pages: `can-dark` tokens. Do not restyle state classes (`.st`, `.tv`, `.keep`, `.drop`, `.badge` colors).
- [ ] **Step 4: Run** the suite. Expected: PASS.
- [ ] **Step 5: Browser check over all 62 pages** in a hidden-iframe harness at 375px and 1100px: font is Lexend, no page sideways scroll, no uncaught errors, then click the primary button 4 times and confirm the step counter text changed. Compare computed colors of `.st.past`, `.tv.true`, `.result.bad` with `git stash`-free before/after values read from `HEAD~1` pages (served by a second preview or read from the old files). Screenshot one stepper per subject, light and dark.
- [ ] **Step 6: Commit** `Give the 62 step-by-step pages the Calm look`.

### Task 5: Cheatsheets (32)

**Files:**
- Create: `sheet.css` (root, merged); Delete: `learn/database/sheet.css`, `learn/system-design/sheet.css`
- Modify: the 32 cheatsheets (link, class, and the 17 `sheet.css` hrefs), `calm.css` (section `page-sheet`), `tests/calm-pages.test.js` (sheet group)

- [ ] **Step 1: Add the sheet group** (every `*cheatsheet*.html` outside `.claude` and `.superpowers`; `can-dark` for the 17 that use `sheet.css`). Run the suite. Expected: FAIL.
- [ ] **Step 2: Merge** the two `sheet.css` copies into one root `sheet.css` (identical apart from a comment), point the 17 pages at it with the right relative path, delete the two copies, run `node scripts/calm-apply.js page-sheet <the 32 files>`.
- [ ] **Step 3: Write the `page-sheet` section** for `header`, `nav button`, `.progress-*`, `.concept`, `.diagram-card`, `.box*`, `.say`, `.why`, `.quiz`, tables and code. Keep the box colors (blue = structure, green = good path, pink = problem, yellow = say this).
- [ ] **Step 4: Run** the suite. Expected: PASS. Browser check across all 32 at 375px and 1100px (font, no sideways scroll, no errors, nav buttons switch sections), light and dark for the 17.
- [ ] **Step 5: Commit** `Give the 32 cheatsheets the Calm look and merge sheet.css`.

### Task 6: Study route

**Files:**
- Modify: `study.html`, `calm.css` (section `page-study`), `tests/calm-pages.test.js` (study group)

- [ ] **Step 1: Add the study group.** Run the suite. Expected: FAIL.
- [ ] **Step 2: Read `study.html`'s own CSS** (Bricolage Grotesque, IBM Plex, blue and slate, light and dark toggle through `data-theme`). Keep its toggle and its `ITEMS` list working. Add the link and classes, write the `page-study` section so cards, buttons, tabs and progress match Calm, and keep both themes.
- [ ] **Step 2b:** ensure the theme toggle still switches light and dark and the choice is remembered.
- [ ] **Step 3: Run** the suite. Expected: PASS. Browser check at 375px and 1100px in both themes.
- [ ] **Step 4: Commit** `Give the study route the Calm look`.

### Task 7: Make new pages start in Calm, then tell the owner

**Files:**
- Modify: `.claude/agents/research-material.md`, `.claude/skills/learn/SKILL.md`, `templates/lesson-template.md` (only the lines about steppers and cheatsheets), `CLAUDE.md` (one line), the design doc (fix the two wrong facts, mark phases done)

- [ ] **Step 1:** In each file that tells an agent how to make a stepper or cheatsheet, add the rule: link `calm.css` (relative), set `<body class="calm page-step">` or `page-sheet` (+ ` can-dark` when the page has dark mode), and run `node --test tests/*.test.js`.
- [ ] **Step 2:** Update the design doc: the two facts, phases 2 to 4 done, the decisions (inline cheatsheet CSS kept, not merged).
- [ ] **Step 3: Run** the full suite and `python3 scripts/build-hub.py` (no diff expected on a second run).
- [ ] **Step 4: Commit** `Tell agents to start new pages in the Calm look`. Update the memory note. Ask the owner before pushing.
