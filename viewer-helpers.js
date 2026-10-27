// Small pure helpers for viewer.html. No DOM here, so node:test can run them (tests/viewer-helpers.test.js).
(function () {
  // Real HTML elements. A line that is only an opening tag of anything else is a placeholder like <write here>.
  const KNOWN_TAGS = new Set([
    "details", "summary", "div", "span", "p", "br", "hr", "a", "img", "ul", "ol", "li", "table", "tr", "td", "th",
    "pre", "code", "kbd", "mark", "small", "sub", "sup", "section", "style", "script", "template", "svg", "iframe",
    "video", "button", "input", "label", "form",
  ]);

  // marked passes unknown tags through as HTML, and the tag then swallows the rest of the page.
  // Show a standalone placeholder line as plain text instead. Code fences are left alone.
  function escapePlaceholders(md) {
    let inFence = false;
    return md.split("\n").map(line => {
      if (/^\s*```/.test(line)) { inFence = !inFence; return line; }
      if (inFence) return line;
      const m = /^<([A-Za-z][\w-]*)[^<>]*>\s*$/.exec(line);
      if (!m || KNOWN_TAGS.has(m[1].toLowerCase())) return line;
      return line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }).join("\n");
  }

  // The first pattern that matches a section title decides its kind (and its header color in calm.css).
  const KINDS = [
    [/idea/i, "idea"], [/picture/i, "picture"], [/analogy/i, "analogy"], [/code/i, "code"],
    [/step by step|really happens/i, "trace"], [/why it exists|cost/i, "why"], [/mistake/i, "mistake"],
    [/watch|play/i, "watch"], [/practice/i, "practice"], [/interview/i, "interview"],
    [/explain/i, "explain"], [/review/i, "review"],
  ];

  function sectionKind(title) {
    const hit = KINDS.find(([re]) => re.test(title));
    return hit ? hit[1] : "";
  }

  // A diagram wider than its box shrinks to fit, but never below minScale of its real size.
  // Below that it keeps the readable size and the box scrolls sideways. width is null when nothing needs doing.
  function fitDiagram(naturalWidth, containerWidth, minScale = 0.8) {
    const positive = n => typeof n === "number" && Number.isFinite(n) && n > 0;
    if (!positive(naturalWidth) || !positive(containerWidth) || naturalWidth <= containerWidth) {
      return { width: null, scrolls: false };
    }
    const scaled = naturalWidth * minScale;
    return { width: Math.max(containerWidth, scaled), scrolls: scaled > containerWidth };
  }

  // How wide each table column must stay, in ch, so text does not wrap one word per line on a phone.
  // A short column stays small. A long text column stops at cap, and the table scrolls sideways instead.
  function columnWidths(rows, { floor = 4, cap = 24 } = {}) {
    const longest = [];
    for (const row of rows) {
      row.forEach((text, i) => { longest[i] = Math.max(longest[i] || 0, text.trim().length); });
    }
    return longest.map(n => Math.min(cap, Math.max(floor, n)));
  }

  // Resolve a relative link against a folder, collapsing "." and ".." segments.
  // Returns a path relative to the repo root. It can never climb above the repo root.
  function resolveFrom(dir, href) {
    const parts = dir.split("/").filter(Boolean).concat(href.split("/"));
    const out = [];
    for (const seg of parts) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") out.pop();
      else out.push(seg);
    }
    return out.join("/");
  }

  // A lesson links to its practice files and example folders relative to its own folder (practice/01-x.sql).
  // The page is viewer.html, so the browser looks in the wrong place. Send those links to GitHub, which also
  // shows code on a phone (GitHub Pages would download a .sql file). Other links return null: .md and .html
  // links are fixed by the viewer itself, and anchors, full URLs and mailto links are already right.
  const REPO_URL = "https://github.com/starjustice/research-material";
  function repoLinkFor(baseDir, href) {
    if (!href || href.startsWith("#") || href.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
    if (/\.(md|html)([?#].*)?$/i.test(href)) return null;
    const path = href.split(/[?#]/)[0];
    return REPO_URL + (path.endsWith("/") ? "/tree/main/" : "/blob/main/") + resolveFrom(baseDir, path);
  }

  const api = { escapePlaceholders, sectionKind, fitDiagram, columnWidths, resolveFrom, repoLinkFor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.ViewerHelpers = api;
})();
