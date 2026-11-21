const test = require("node:test");
const assert = require("node:assert");
const {
  scanHtml, scriptMode, isRenderBlocking, loadPage, stagesFor, forcedLayouts, vitalRating, pageTimeline,
} = require("./08-how-the-browser-renders-a-page");

const copy = (value) => JSON.parse(JSON.stringify(value));
const page = (head, body = "<h1>Hi</h1>") => "<html><head>" + head + "</head><body>" + body + "</body></html>";
const NET = { "/s.css": { download: 400 }, "/a.js": { download: 500, run: 20 }, "/b.js": { download: 100, run: 10 }, "/m.js": { download: 500 }, "/p.png": { download: 50 } };

// ---------- scanHtml ----------

test("scanHtml: a stylesheet link", () => {
  assert.deepStrictEqual(scanHtml('<link rel="stylesheet" href="/a.css">'), [{ kind: "css", url: "/a.css", media: "all" }]);
});

test("scanHtml: media is kept", () => {
  assert.deepStrictEqual(scanHtml('<link rel="stylesheet" href="/p.css" media="print">'), [{ kind: "css", url: "/p.css", media: "print" }]);
});

test("scanHtml: a link that is not a stylesheet is skipped", () => {
  assert.deepStrictEqual(scanHtml('<link rel="preload" href="/f.woff2"><link rel="icon" href="/i.ico">'), []);
});

test("scanHtml: a stylesheet link without href is skipped", () => {
  assert.deepStrictEqual(scanHtml('<link rel="stylesheet">'), []);
});

test("scanHtml: rel with several words still counts", () => {
  assert.strictEqual(scanHtml('<link rel="alternate stylesheet" href="/x.css">').length, 1);
});

test("scanHtml: a plain script", () => {
  assert.deepStrictEqual(scanHtml('<script src="/a.js"></script>'), [{ kind: "script", url: "/a.js", defer: false, async: false, module: false }]);
});

test("scanHtml: defer, async and module", () => {
  assert.deepStrictEqual(scanHtml("<script defer src=/a.js></script>")[0], { kind: "script", url: "/a.js", defer: true, async: false, module: false });
  assert.deepStrictEqual(scanHtml("<script async src='/a.js'></script>")[0], { kind: "script", url: "/a.js", defer: false, async: true, module: false });
  assert.deepStrictEqual(scanHtml('<script type="module" src="/a.js"></script>')[0], { kind: "script", url: "/a.js", defer: false, async: false, module: true });
});

test("scanHtml: type module in upper case still counts", () => {
  assert.strictEqual(scanHtml('<script type="MODULE" src="/a.js"></script>')[0].module, true);
});

test("scanHtml: a script without src has url null", () => {
  assert.deepStrictEqual(scanHtml("<script>var a = 1;</script>"), [{ kind: "script", url: null, defer: false, async: false, module: false }]);
});

test("scanHtml: an image, and an image without src", () => {
  assert.deepStrictEqual(scanHtml('<img src="/p.png" alt="x"><img alt="none">'), [{ kind: "img", url: "/p.png" }]);
});

test("scanHtml: body is a marker", () => {
  assert.deepStrictEqual(scanHtml('<body class="home">'), [{ kind: "body" }]);
});

test("scanHtml: upper case tags and attributes", () => {
  assert.deepStrictEqual(scanHtml('<LINK REL="STYLESHEET" HREF="/a.css"><SCRIPT SRC="/a.js" ASYNC></SCRIPT>'), [
    { kind: "css", url: "/a.css", media: "all" },
    { kind: "script", url: "/a.js", defer: false, async: true, module: false },
  ]);
});

test("scanHtml: the order is the document order", () => {
  const items = scanHtml(page('<script src="/a.js"></script><link rel="stylesheet" href="/s.css">', '<img src="/p.png">'));
  assert.deepStrictEqual(items.map((i) => i.kind), ["script", "css", "body", "img"]);
});

test("scanHtml: other tags are ignored", () => {
  assert.deepStrictEqual(scanHtml("<div><p>hi</p><a href='/x'>x</a></div>"), []);
});

// ---------- scriptMode ----------

const S = (extra) => ({ kind: "script", url: "/a.js", defer: false, async: false, module: false, ...extra });

test("scriptMode: a plain script blocks", () => {
  assert.strictEqual(scriptMode(S({})), "blocking");
});

test("scriptMode: defer", () => {
  assert.strictEqual(scriptMode(S({ defer: true })), "deferred");
});

test("scriptMode: async", () => {
  assert.strictEqual(scriptMode(S({ async: true })), "async");
});

test("scriptMode: async wins over defer", () => {
  assert.strictEqual(scriptMode(S({ async: true, defer: true })), "async");
});

test("scriptMode: a module is deferred", () => {
  assert.strictEqual(scriptMode(S({ module: true })), "deferred");
});

test("scriptMode: a module with async is async", () => {
  assert.strictEqual(scriptMode(S({ module: true, async: true })), "async");
});

test("scriptMode: an inline classic script is always blocking", () => {
  assert.strictEqual(scriptMode(S({ url: null })), "blocking");
  assert.strictEqual(scriptMode(S({ url: null, defer: true })), "blocking");
  assert.strictEqual(scriptMode(S({ url: null, async: true })), "blocking");
});

test("scriptMode: an inline module is deferred", () => {
  assert.strictEqual(scriptMode(S({ url: null, module: true })), "deferred");
});

// ---------- isRenderBlocking ----------

test("isRenderBlocking: css yes, print css no", () => {
  assert.strictEqual(isRenderBlocking({ kind: "css", url: "/a.css", media: "all" }), true);
  assert.strictEqual(isRenderBlocking({ kind: "css", url: "/a.css", media: "screen" }), true);
  assert.strictEqual(isRenderBlocking({ kind: "css", url: "/a.css", media: "print" }), false);
  assert.strictEqual(isRenderBlocking({ kind: "css", url: "/a.css", media: "PRINT" }), false);
});

test("isRenderBlocking: a css item with no media counts as blocking", () => {
  assert.strictEqual(isRenderBlocking({ kind: "css", url: "/a.css" }), true);
});

test("isRenderBlocking: scripts and images are not render blocking", () => {
  assert.strictEqual(isRenderBlocking(S({})), false);
  assert.strictEqual(isRenderBlocking({ kind: "img", url: "/p.png" }), false);
  assert.strictEqual(isRenderBlocking({ kind: "body" }), false);
});

// ---------- loadPage ----------

test("loadPage: an empty page paints at 0", () => {
  const r = loadPage(page(""), {});
  assert.strictEqual(r.firstPaint, 0);
  assert.strictEqual(r.domContentLoaded, 0);
  assert.strictEqual(r.parseEnd, 0);
  assert.deepStrictEqual(r.scriptRuns, []);
  assert.deepStrictEqual(r.starts, {});
});

test("loadPage: CSS in the head holds the first paint", () => {
  const r = loadPage(page('<link rel="stylesheet" href="/s.css">'), NET);
  assert.strictEqual(r.firstPaint, 400);
  assert.strictEqual(r.parseEnd, 0);
});

test("loadPage: CSS does not stop the parser, so the DOM is ready early", () => {
  const r = loadPage(page('<link rel="stylesheet" href="/s.css">'), NET);
  assert.strictEqual(r.domContentLoaded, 0);
});

test("loadPage: print CSS does not hold the first paint", () => {
  const r = loadPage(page('<link rel="stylesheet" media="print" href="/s.css">'), NET);
  assert.strictEqual(r.firstPaint, 0);
});

test("loadPage: the LAST stylesheet to arrive decides", () => {
  const net = { "/a.css": { download: 100 }, "/b.css": { download: 300 } };
  const r = loadPage(page('<link rel="stylesheet" href="/a.css"><link rel="stylesheet" href="/b.css">'), net);
  assert.strictEqual(r.firstPaint, 300);
});

test("loadPage: a blocking script in the head holds the first paint and the parser", () => {
  const r = loadPage(page('<script src="/a.js"></script>'), NET);
  assert.strictEqual(r.firstPaint, 520);
  assert.strictEqual(r.parseEnd, 520);
  assert.strictEqual(r.domContentLoaded, 520);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/a.js", at: 500 }]);
});

test("loadPage: defer lets the page paint at once, the script runs at the end", () => {
  const r = loadPage(page('<script defer src="/a.js"></script>'), NET);
  assert.strictEqual(r.firstPaint, 0);
  assert.strictEqual(r.parseEnd, 0);
  assert.strictEqual(r.domContentLoaded, 520);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/a.js", at: 500 }]);
});

test("loadPage: async paints at once and runs when it arrives", () => {
  const r = loadPage(page('<script async src="/a.js"></script>'), NET);
  assert.strictEqual(r.firstPaint, 0);
  assert.strictEqual(r.domContentLoaded, 0);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/a.js", at: 500 }]);
});

test("loadPage: a module script behaves like defer", () => {
  const r = loadPage(page('<script type="module" src="/m.js"></script>'), NET);
  assert.strictEqual(r.firstPaint, 0);
  assert.strictEqual(r.domContentLoaded, 500);
});

test("loadPage: a blocking script waits for the CSS before it", () => {
  const r = loadPage(page('<link rel="stylesheet" href="/s.css"><script src="/b.js"></script>'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/b.js", at: 400 }]);
  assert.strictEqual(r.parseEnd, 410);
  assert.strictEqual(r.firstPaint, 410);
});

test("loadPage: a blocking script does not wait for CSS that comes after it", () => {
  const r = loadPage(page('<script src="/b.js"></script><link rel="stylesheet" href="/s.css">'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/b.js", at: 100 }]);
  assert.strictEqual(r.firstPaint, 400);
});

test("loadPage: a blocking script does not wait for print CSS", () => {
  const r = loadPage(page('<link rel="stylesheet" media="print" href="/s.css"><script src="/b.js"></script>'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/b.js", at: 100 }]);
});

test("loadPage: a script at the end of the body does not hold the first paint", () => {
  const r = loadPage(page("", '<h1>Hi</h1><script src="/a.js"></script>'), NET);
  assert.strictEqual(r.firstPaint, 0);
  assert.strictEqual(r.parseEnd, 520);
  assert.strictEqual(r.domContentLoaded, 520);
});

test("loadPage: a script in the head delays the body, so the body paints late", () => {
  const r = loadPage(page('<script src="/a.js"></script>'), NET);
  assert.strictEqual(r.firstPaint, r.parseEnd);
});

test("loadPage: deferred scripts run in document order, even when the second is ready first", () => {
  const r = loadPage(page('<script defer src="/a.js"></script><script defer src="/b.js"></script>'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/a.js", at: 500 }, { url: "/b.js", at: 520 }]);
  assert.strictEqual(r.domContentLoaded, 530);
});

test("loadPage: async scripts run in the order they arrive", () => {
  const r = loadPage(page('<script async src="/a.js"></script><script async src="/b.js"></script>'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/b.js", at: 100 }, { url: "/a.js", at: 500 }]);
});

test("loadPage: a deferred script waits for the parser, which waits for a blocking script", () => {
  const r = loadPage(page('<script defer src="/b.js"></script><script src="/a.js"></script>'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/a.js", at: 500 }, { url: "/b.js", at: 520 }]);
  assert.strictEqual(r.domContentLoaded, 530);
});

test("loadPage: an inline script waits for CSS before it and takes no time", () => {
  const r = loadPage(page('<link rel="stylesheet" href="/s.css"><script>var a = 1;</script>'), NET);
  assert.deepStrictEqual(r.scriptRuns, [{ url: null, at: 400 }]);
  assert.strictEqual(r.parseEnd, 400);
});

test("loadPage: with the scanner everything starts at 0", () => {
  const html = page('<script src="/a.js"></script><link rel="stylesheet" href="/s.css">', '<img src="/p.png">');
  const r = loadPage(html, NET);
  assert.deepStrictEqual(r.starts, { "/a.js": 0, "/s.css": 0, "/p.png": 0 });
  assert.strictEqual(r.firstPaint, 520);
});

test("loadPage: without the scanner a resource starts when the parser reaches it", () => {
  const html = page('<script src="/a.js"></script><link rel="stylesheet" href="/s.css">', '<img src="/p.png">');
  const r = loadPage(html, NET, { preloadScanner: false });
  assert.deepStrictEqual(r.starts, { "/a.js": 0, "/s.css": 520, "/p.png": 520 });
  assert.strictEqual(r.firstPaint, 920);
});

test("loadPage: preloadScanner true is the default", () => {
  const html = page('<script src="/a.js"></script><link rel="stylesheet" href="/s.css">');
  assert.deepStrictEqual(loadPage(html, NET), loadPage(html, NET, { preloadScanner: true }));
});

test("loadPage: the scanner makes a slow page faster", () => {
  const html = page('<script src="/a.js"></script><link rel="stylesheet" href="/s.css">');
  assert.ok(loadPage(html, NET).firstPaint < loadPage(html, NET, { preloadScanner: false }).firstPaint);
});

test("loadPage: the same url twice starts once", () => {
  const html = page('<script src="/b.js"></script>', '<script src="/b.js"></script>');
  assert.deepStrictEqual(loadPage(html, NET).starts, { "/b.js": 0 });
});

test("loadPage: the same url twice, without the scanner, keeps its first start", () => {
  const html = page('<script src="/b.js"></script>', '<script src="/b.js"></script>');
  const r = loadPage(html, NET, { preloadScanner: false });
  assert.deepStrictEqual(r.starts, { "/b.js": 0 });
  assert.deepStrictEqual(r.scriptRuns, [{ url: "/b.js", at: 100 }, { url: "/b.js", at: 110 }]);
});

test("loadPage: the first body tag decides where the body starts", () => {
  const r = loadPage("<body><script src=\"/a.js\"></script><body>", NET);
  assert.strictEqual(r.firstPaint, 0);
});

test("loadPage: a missing net entry means 0", () => {
  const r = loadPage(page('<link rel="stylesheet" href="/unknown.css">'), {});
  assert.strictEqual(r.firstPaint, 0);
});

test("loadPage: no body tag, the first paint waits for the end of the parse", () => {
  const r = loadPage('<script src="/a.js"></script>', NET);
  assert.strictEqual(r.firstPaint, 520);
});

test("loadPage: scriptRuns are sorted by time", () => {
  const html = page('<script async src="/a.js"></script><script src="/b.js"></script>');
  assert.deepStrictEqual(loadPage(html, NET).scriptRuns, [{ url: "/b.js", at: 100 }, { url: "/a.js", at: 500 }]);
});

test("loadPage: does not change its inputs", () => {
  const net = copy(NET);
  const html = page('<script defer src="/a.js"></script>');
  loadPage(html, net, { preloadScanner: false });
  assert.deepStrictEqual(net, NET);
});

// ---------- stagesFor ----------

test("stagesFor: layout properties run every step", () => {
  assert.deepStrictEqual(stagesFor("width"), ["style", "layout", "paint", "composite"]);
  assert.deepStrictEqual(stagesFor("margin"), ["style", "layout", "paint", "composite"]);
  assert.deepStrictEqual(stagesFor("font-size"), ["style", "layout", "paint", "composite"]);
});

test("stagesFor: paint properties skip layout", () => {
  assert.deepStrictEqual(stagesFor("color"), ["style", "paint", "composite"]);
  assert.deepStrictEqual(stagesFor("box-shadow"), ["style", "paint", "composite"]);
  assert.deepStrictEqual(stagesFor("background-color"), ["style", "paint", "composite"]);
});

test("stagesFor: transform and opacity on their own layer only composite", () => {
  assert.deepStrictEqual(stagesFor("transform", { ownLayer: true }), ["style", "composite"]);
  assert.deepStrictEqual(stagesFor("opacity", { ownLayer: true }), ["style", "composite"]);
});

test("stagesFor: transform and opacity without a layer run every step", () => {
  assert.deepStrictEqual(stagesFor("transform"), ["style", "layout", "paint", "composite"]);
  assert.deepStrictEqual(stagesFor("opacity", { ownLayer: false }), ["style", "layout", "paint", "composite"]);
});

test("stagesFor: letter case does not matter", () => {
  assert.deepStrictEqual(stagesFor("COLOR"), ["style", "paint", "composite"]);
  assert.deepStrictEqual(stagesFor("Transform", { ownLayer: true }), ["style", "composite"]);
});

test("stagesFor: ownLayer does not change a layout property", () => {
  assert.deepStrictEqual(stagesFor("width", { ownLayer: true }), ["style", "layout", "paint", "composite"]);
});

test("stagesFor: an unknown property throws", () => {
  assert.throws(() => stagesFor("banana"), /unknown property: banana/);
});

test("stagesFor: gives a new list each time", () => {
  const a = stagesFor("color");
  a.push("x");
  assert.deepStrictEqual(stagesFor("color"), ["style", "paint", "composite"]);
});

// ---------- forcedLayouts ----------

test("forcedLayouts: no work, no layout", () => {
  assert.strictEqual(forcedLayouts([]), 0);
});

test("forcedLayouts: reads of a clean page cost nothing", () => {
  assert.strictEqual(forcedLayouts(["read", "read", "read"]), 0);
});

test("forcedLayouts: many writes, one layout at the end", () => {
  assert.strictEqual(forcedLayouts(["write", "write", "write"]), 1);
});

test("forcedLayouts: a write then a read forces a layout, and the end adds none", () => {
  assert.strictEqual(forcedLayouts(["write", "read"]), 1);
});

test("forcedLayouts: write, read, write, read is two layouts", () => {
  assert.strictEqual(forcedLayouts(["write", "read", "write", "read"]), 2);
});

test("forcedLayouts: read first, write after, one read at the end", () => {
  assert.strictEqual(forcedLayouts(["read", "read", "write", "write", "read"]), 1);
});

test("forcedLayouts: two reads after a write force only one layout", () => {
  assert.strictEqual(forcedLayouts(["write", "read", "read"]), 1);
});

test("forcedLayouts: the last write is laid out before paint", () => {
  assert.strictEqual(forcedLayouts(["write", "read", "write"]), 2);
});

test("forcedLayouts: the mixed loop is slow and the batched loop is fast", () => {
  const mixed = [];
  for (let i = 0; i < 100; i++) mixed.push("write", "read");
  const batched = [...Array(100).fill("read"), ...Array(100).fill("write"), "read"];
  assert.strictEqual(forcedLayouts(mixed), 100);
  assert.strictEqual(forcedLayouts(batched), 1);
});

test("forcedLayouts: an unknown op throws", () => {
  assert.throws(() => forcedLayouts(["write", "paint"]), /op must be read or write/);
});

test("forcedLayouts: does not change its input", () => {
  const ops = ["write", "read"];
  forcedLayouts(ops);
  assert.deepStrictEqual(ops, ["write", "read"]);
});

// ---------- vitalRating ----------

test("vitalRating: LCP", () => {
  assert.strictEqual(vitalRating("LCP", 1800), "good");
  assert.strictEqual(vitalRating("LCP", 2500), "good");
  assert.strictEqual(vitalRating("LCP", 2501), "needs improvement");
  assert.strictEqual(vitalRating("LCP", 4000), "needs improvement");
  assert.strictEqual(vitalRating("LCP", 4001), "poor");
});

test("vitalRating: INP", () => {
  assert.strictEqual(vitalRating("INP", 200), "good");
  assert.strictEqual(vitalRating("INP", 201), "needs improvement");
  assert.strictEqual(vitalRating("INP", 500), "needs improvement");
  assert.strictEqual(vitalRating("INP", 501), "poor");
});

test("vitalRating: CLS", () => {
  assert.strictEqual(vitalRating("CLS", 0), "good");
  assert.strictEqual(vitalRating("CLS", 0.1), "good");
  assert.strictEqual(vitalRating("CLS", 0.11), "needs improvement");
  assert.strictEqual(vitalRating("CLS", 0.25), "needs improvement");
  assert.strictEqual(vitalRating("CLS", 0.26), "poor");
});

test("vitalRating: an unknown metric throws", () => {
  assert.throws(() => vitalRating("FID", 10), /metric must be LCP, INP or CLS/);
  assert.throws(() => vitalRating("lcp", 10), /metric must be LCP, INP or CLS/);
});

// ---------- pageTimeline ----------

const T = { htmlMs: 100, jsMs: 300, dataMs: 200, renderMs: 50, hydrateMs: 80 };

test("pageTimeline: csr shows content late and is interactive at once", () => {
  assert.deepStrictEqual(pageTimeline("csr", T), { firstContent: 650, interactive: 650, deadTime: 0 });
});

test("pageTimeline: ssr shows content early and is interactive later", () => {
  assert.deepStrictEqual(pageTimeline("ssr", T), { firstContent: 350, interactive: 730, deadTime: 380 });
});

test("pageTimeline: ssr first content is earlier than csr here", () => {
  assert.ok(pageTimeline("ssr", T).firstContent < pageTimeline("csr", T).firstContent);
});

test("pageTimeline: ssr can be interactive later than csr", () => {
  assert.ok(pageTimeline("ssr", T).interactive > pageTimeline("csr", T).interactive);
});

test("pageTimeline: a tiny script makes the dead time small", () => {
  const r = pageTimeline("ssr", { ...T, jsMs: 10, hydrateMs: 5 });
  assert.strictEqual(r.deadTime, 15);
});

test("pageTimeline: hydrateMs does not matter for csr", () => {
  assert.deepStrictEqual(pageTimeline("csr", { ...T, hydrateMs: 9999 }), pageTimeline("csr", T));
});

test("pageTimeline: an unknown kind throws", () => {
  assert.throws(() => pageTimeline("ssg", T), /kind must be csr or ssr/);
});

test("pageTimeline: does not change its input", () => {
  const t = copy(T);
  pageTimeline("ssr", t);
  assert.deepStrictEqual(t, T);
});
