#!/usr/bin/env node
// Gives a static page the Calm look: one <link> to calm.css and the body classes.
//
//   node scripts/calm-apply.js page-step learn/*/visuals/*.html
//
// It only adds. Running it twice changes nothing the second time.
const fs = require("node:fs");
const path = require("node:path");

const DARK_RE = /prefers-color-scheme\s*:\s*dark/;

function calmHrefFor(pagePath) {
  const depth = pagePath.split("/").length - 1;
  return "../".repeat(depth) + "calm.css";
}

// Pages with their own dark mode get can-dark, so calm.css adjusts its borders for the dark palette.
function hasOwnDarkMode(html, sheetText = "") {
  return DARK_RE.test(html) || DARK_RE.test(sheetText);
}

function addCalm(html, { calmHref, pageClass, dark }) {
  let out = html;
  const link = `<link rel="stylesheet" href="${calmHref}">\n`;
  if (!out.includes(`href="${calmHref}"`)) out = out.replace("</head>", `${link}</head>`);

  const classes = ["calm", pageClass].concat(dark ? ["can-dark"] : []).join(" ");
  out = out.replace(/<body\b([^>]*)>/i, (whole, attrs) => {
    if (/\bclass="[^"]*\bcalm\b/.test(attrs)) return whole;
    if (/\bclass="/.test(attrs)) return `<body${attrs.replace(/\bclass="/, `class="${classes} `)}>`;
    return `<body class="${classes}"${attrs}>`;
  });
  return out;
}

function main(argv) {
  const [pageClass, ...files] = argv;
  if (!pageClass || !files.length) {
    console.error("usage: node scripts/calm-apply.js <page-class> <file...>");
    process.exit(1);
  }
  const root = path.resolve(__dirname, "..");
  for (const file of files) {
    const abs = path.resolve(file);
    const html = fs.readFileSync(abs, "utf8");
    const sheet = /<link[^>]+href="([^"]*sheet\.css)"/.exec(html);
    const sheetPath = sheet && path.resolve(path.dirname(abs), sheet[1]);
    const sheetText = sheetPath && fs.existsSync(sheetPath) ? fs.readFileSync(sheetPath, "utf8") : "";
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const out = addCalm(html, { calmHref: calmHrefFor(rel), pageClass, dark: hasOwnDarkMode(html, sheetText) });
    if (out !== html) {
      fs.writeFileSync(abs, out);
      console.log("changed:", rel);
    }
  }
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { addCalm, calmHrefFor, hasOwnDarkMode };
