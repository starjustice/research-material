// Lesson 08: How the browser renders a page. Write the eight pieces below, then run:
//   node --test learn/networking/practice/08-how-the-browser-renders-a-page.test.js
//
// The helper `lower` and the table of property lists are already written for you.
// Never change the objects you are given. All times are in milliseconds.
//
//   scanHtml(html)
//       Read the HTML text and list the things the browser must fetch or decide on, in document order.
//       This is what the preload scanner sees. Tag and attribute names can be in any letter case.
//       Attributes can be written name="a", name='a', name=a, or with no value at all (like async).
//         <link rel="stylesheet" href="x">  ->  { kind: "css", url: "x", media: "all" }
//                                              media is the media attribute, or "all" when there is none.
//                                              A link whose rel does not contain "stylesheet" is skipped
//                                              (so is a stylesheet link without href).
//         <script ...>                      ->  { kind: "script", url, defer, async, module }
//                                              url is the src text, or null with no src.
//                                              defer and async are true when the attribute is there.
//                                              module is true when type is "module".
//         <img src="x">                     ->  { kind: "img", url: "x" }     (an img without src is skipped)
//         <body ...>                        ->  { kind: "body" }
//       Anything else is ignored.
//
//   scriptMode(item)
//       item is a "script" item from scanHtml. Return how it behaves:
//         "blocking"  the parser stops and waits for it
//         "deferred"  it runs after the whole HTML is parsed, in document order
//         "async"     it runs as soon as it has downloaded
//       Rules: a module script is "deferred", unless async is set, then "async" (this holds for inline modules too).
//       A classic script with no src is always "blocking" (defer and async do nothing on it).
//       A classic script with a src: async wins over defer. Then "async", then "deferred", otherwise "blocking".
//
//   isRenderBlocking(item)
//       true only for a "css" item whose media is not "print" (letter case does not matter). Everything else is false.
//
//   loadPage(html, net, options)
//       Model one page load. The whole HTML text has arrived at time 0.
//       net maps a url to { download, run }. Both are milliseconds. A missing url or a missing number means 0.
//       options.preloadScanner is true by default.
//       Walk the items from scanHtml in order. The parser has a clock t that starts at 0.
//         - Download start: a url starts downloading at time 0 when the preload scanner is on,
//           and at the parser's t at the moment it reaches the item when the scanner is off.
//           A url that appears twice starts only once (the first time). A script without src has no download.
//         - css: ready = start + download. It does not stop the parser.
//         - img: only its start time is recorded.
//         - body: remember t as bodyAt the first time you see it.
//         - script "blocking": the parser waits until the script is downloaded AND every render blocking
//           stylesheet seen so far is ready. It runs at at = max(t, ready, cssReadySoFar).
//           Then t = at + run. (A script without src has run 0.)
//         - script "async": it runs at its ready time (start + download). It never moves t.
//         - script "deferred": it waits until the parser is finished.
//       When all items are done, parseEnd = t. Run the deferred scripts in document order:
//       each one runs at max(the end of the previous one, its ready time), and takes its run time.
//       Return:
//         firstPaint        max(bodyAt, ready time of the LAST render blocking stylesheet in the whole page)
//                           with no body tag, use parseEnd instead of bodyAt. No stylesheet counts as 0.
//         domContentLoaded  the time the last deferred script has finished (parseEnd when there are none)
//         parseEnd          the parser's t at the end
//         scriptRuns        [{ url, at }] for every script, sorted by at (ties keep document order)
//                           url is null for a script without src. at is when the script STARTS to run.
//         starts            { url: start time } for every css, script with src and img
//
//   stagesFor(property, options)
//       Which steps of the pipeline run again when this CSS property changes. Property names can be in any letter case.
//       Return a list in this order: style, layout, paint, composite.
//         a property in LAYOUT_PROPS:      ["style", "layout", "paint", "composite"]
//         a property in PAINT_PROPS:       ["style", "paint", "composite"]
//         transform or opacity:            ["style", "composite"] when options.ownLayer is true,
//                                          otherwise all four (the first change has to create a layer first)
//       Any other property: throw an Error("unknown property: " + property).
//
//   forcedLayouts(ops)
//       ops is a list of "write" (change a style) and "read" (ask for offsetWidth or a similar number).
//       Count the layouts the browser does. It starts clean.
//         - a write makes the layout dirty
//         - a read of a dirty layout does a layout right now (the layout is clean again)
//         - when the list ends and the layout is dirty, the browser does one more layout before it paints
//       Any other word in ops: throw an Error("op must be read or write").
//
//   vitalRating(metric, value)
//       metric is "LCP" (milliseconds), "INP" (milliseconds) or "CLS" (a number).
//       Good is up to and including: LCP 2500, INP 200, CLS 0.1.
//       "needs improvement" is up to and including: LCP 4000, INP 500, CLS 0.25. Above that is "poor".
//       Return "good", "needs improvement" or "poor". An unknown metric: throw an Error("metric must be LCP, INP or CLS").
//
//   pageTimeline(kind, times)
//       kind is "csr" (the browser builds the page with JavaScript) or "ssr" (the server sends finished HTML).
//       times: { htmlMs, jsMs, dataMs, renderMs, hydrateMs }.
//       csr: an empty page arrives at htmlMs. Then the JavaScript downloads (jsMs), then the page asks for data (dataMs),
//            then the JavaScript draws the content (renderMs). Nobody waits for hydration: it is already live.
//            firstContent = htmlMs + jsMs + dataMs + renderMs, interactive = firstContent.
//       ssr: the server fetches data and draws before it answers.
//            firstContent = htmlMs + dataMs + renderMs.
//            Then the JavaScript downloads (jsMs) and hydrates (hydrateMs): interactive = firstContent + jsMs + hydrateMs.
//       Return { firstContent, interactive, deadTime } where deadTime = interactive - firstContent.
//       Any other kind: throw an Error("kind must be csr or ssr").

// ---------- helpers, already written ----------
const lower = (s) => String(s).toLowerCase();

const LAYOUT_PROPS = ["width", "height", "margin", "padding", "top", "left", "font-size", "display", "border-width"];
const PAINT_PROPS = ["color", "background", "background-color", "box-shadow", "border-radius", "outline", "visibility"];

// ---------- your eight pieces ----------

function scanHtml(html) {
  // TODO
}

function scriptMode(item) {
  // TODO
}

function isRenderBlocking(item) {
  // TODO
}

function loadPage(html, net, options) {
  // TODO
}

function stagesFor(property, options) {
  // TODO
}

function forcedLayouts(ops) {
  // TODO
}

function vitalRating(metric, value) {
  // TODO
}

function pageTimeline(kind, times) {
  // TODO
}

module.exports = { scanHtml, scriptMode, isRenderBlocking, loadPage, stagesFor, forcedLayouts, vitalRating, pageTimeline };
