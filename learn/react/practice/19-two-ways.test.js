const test = require("node:test");
const assert = require("node:assert");
const { escapeHtml, renderOnServer, renderShell, renderInBrowser } = require("./19-two-ways");

test("escapeHtml changes the five special characters", () => {
  assert.strictEqual(escapeHtml(`<b>"Tom" & 'Jo'</b>`), "&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jo&#39;&lt;/b&gt;");
});

test("escapeHtml does not change the & it just made", () => {
  assert.strictEqual(escapeHtml("<"), "&lt;");
});

test("escapeHtml leaves plain text alone", () => {
  assert.strictEqual(escapeHtml("shoes"), "shoes");
});

test("renderOnServer sends the products inside the first page", () => {
  const html = renderOnServer(["shoes", "hats"]);
  assert.strictEqual(html, "<html><body><h1>Shop</h1><ul><li>shoes</li><li>hats</li></ul></body></html>");
});

test("renderOnServer escapes names", () => {
  const html = renderOnServer(["<script>alert(1)</script>"]);
  assert.ok(!html.includes("<script>"), "a script tag from a product name must not reach the page");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("renderOnServer with no products still gives an empty list", () => {
  assert.strictEqual(renderOnServer([]), "<html><body><h1>Shop</h1><ul></ul></body></html>");
});

test("renderShell is empty: no products, a root box and a script", () => {
  const html = renderShell();
  assert.strictEqual(html, '<html><body><div id="root"></div><script src="/app.js"></script></body></html>');
  assert.ok(!html.includes("shoes"));
});

test("renderInBrowser fills the root box", () => {
  const root = { innerHTML: "" };
  const result = renderInBrowser(root, ["shoes", "hats"]);
  assert.strictEqual(root.innerHTML, "<h1>Shop</h1><ul><li>shoes</li><li>hats</li></ul>");
  assert.strictEqual(result, undefined);
});

test("renderInBrowser escapes names too", () => {
  const root = { innerHTML: "" };
  renderInBrowser(root, ["a&b"]);
  assert.strictEqual(root.innerHTML, "<h1>Shop</h1><ul><li>a&amp;b</li></ul>");
});
