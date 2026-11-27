// Lesson 19: How a website works, server side and client side. Do the tasks, then run:
//   node --test learn/react/practice/19-two-ways.test.js
//
// You will build the same product list in two places:
//   on the SERVER (the finished page is sent), and
//   in the BROWSER (an empty page is sent, then a script fills it in).

// 1. escapeHtml(text)
//    A product name comes from a user, so it can hold < or > or &. Return the text with
//    these five characters changed so the browser shows them as plain text:
//    & becomes &amp;   < becomes &lt;   > becomes &gt;   " becomes &quot;   ' becomes &#39;
//    Hint: change & first, or you will change your own work.
function escapeHtml(text) {
  // TODO
}

// 2. renderOnServer(products)
//    products is an array of strings. Return a full page as ONE string:
//    <html><body><h1>Shop</h1><ul><li>NAME</li>...</ul></body></html>
//    One <li> per product, in order. Escape every name with escapeHtml.
function renderOnServer(products) {
  // TODO
}

// 3. renderShell()
//    The client side way. Return the page the server sends BEFORE any data:
//    <html><body><div id="root"></div><script src="/app.js"></script></body></html>
//    It must hold no product names. It takes no argument.
function renderShell() {
  // TODO
}

// 4. renderInBrowser(root, products)
//    This is what /app.js does after it has fetched the products. root is an object with an
//    innerHTML property (the tests use a fake one). Set root.innerHTML to
//    <h1>Shop</h1><ul><li>NAME</li>...</ul>   (same list as task 2, but without html and body).
//    Escape every name. Do not return anything.
function renderInBrowser(root, products) {
  // TODO
}

module.exports = { escapeHtml, renderOnServer, renderShell, renderInBrowser };
