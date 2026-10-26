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

  const api = { escapePlaceholders, sectionKind, fitDiagram };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.ViewerHelpers = api;
})();
