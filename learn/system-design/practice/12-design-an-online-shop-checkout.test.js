const test = require("node:test");
const assert = require("node:assert");
const { createShop, sign } = require("./12-design-an-online-shop-checkout");

const SECRET = "whsec_test";

// A fake payment provider. It builds the raw text and signs it, like Stripe does.
function webhook(id, type, paymentId, secret = SECRET) {
  const rawBody = JSON.stringify({ id, type, paymentId });
  return [rawBody, sign(rawBody, secret)];
}
const paid = (id, paymentId) => webhook(id, "payment_intent.succeeded", paymentId);
const failed = (id, paymentId) => webhook(id, "payment_intent.payment_failed", paymentId);

function setup() {
  return createShop({ stock: { mug: 1, scarf: 2 }, secret: SECRET, holdMinutes: 10 });
}

// ---- The hold ----

test("checkout holds the stock and makes a RESERVED order that ends in 10 minutes", () => {
  const shop = setup();
  const r = shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  assert.deepStrictEqual(r, { ok: true, orderId: 1, paymentId: "pay-1", expiresAt: 10 });
  assert.strictEqual(shop.stockOf("mug"), 0);
  assert.deepStrictEqual(shop.getOrder(1), {
    id: 1, buyerId: "ana", productId: "mug", qty: 1, status: "RESERVED", reason: null, expiresAt: 10, paymentId: "pay-1",
  });
});

test("two buyers, one last mug: the first wins, the second hears sold out", () => {
  const shop = setup();
  assert.strictEqual(shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 }).ok, true);
  assert.deepStrictEqual(shop.checkout({ buyerId: "budi", productId: "mug", key: "k1", now: 0 }), { ok: false, reason: "sold out" });
  assert.strictEqual(shop.stockOf("mug"), 0);
});

test("asking for more than is left holds nothing at all", () => {
  const shop = setup();
  assert.deepStrictEqual(shop.checkout({ buyerId: "ana", productId: "scarf", qty: 3, key: "k1", now: 0 }), { ok: false, reason: "sold out" });
  assert.strictEqual(shop.stockOf("scarf"), 2);
  assert.strictEqual(shop.getOrder(1), undefined);
});

test("order ids grow by 1 and qty is held in full", () => {
  const shop = setup();
  assert.strictEqual(shop.checkout({ buyerId: "ana", productId: "scarf", qty: 2, key: "k1", now: 0 }).orderId, 1);
  assert.strictEqual(shop.stockOf("scarf"), 0);
  assert.strictEqual(shop.checkout({ buyerId: "budi", productId: "mug", key: "k1", now: 1 }).orderId, 2);
  assert.strictEqual(shop.getOrder(2).paymentId, "pay-2");
});

// ---- The double click ----

test("a double click with the same key gives the same order and holds stock once", () => {
  const shop = setup();
  const first = shop.checkout({ buyerId: "ana", productId: "scarf", key: "k1", now: 0 });
  const again = shop.checkout({ buyerId: "ana", productId: "scarf", key: "k1", now: 0 });
  assert.deepStrictEqual(again, first);
  assert.strictEqual(shop.stockOf("scarf"), 1);
});

test("two buyers may use the same key, because each browser makes its own", () => {
  const shop = setup();
  const a = shop.checkout({ buyerId: "ana", productId: "scarf", key: "k1", now: 0 });
  const b = shop.checkout({ buyerId: "budi", productId: "scarf", key: "k1", now: 0 });
  assert.notStrictEqual(a.orderId, b.orderId);
  assert.strictEqual(shop.stockOf("scarf"), 0);
});

// ---- The webhook: signature first ----

test("a webhook with a wrong signature is rejected and changes nothing", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  const [body] = paid("evt_1", "pay-1");
  assert.strictEqual(shop.handleWebhook(body, sign(body, "not-the-secret")), "rejected");
  assert.strictEqual(shop.getOrder(1).status, "RESERVED");
});

test("a body changed after signing is rejected", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  const [, signature] = failed("evt_1", "pay-1");
  const changed = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded", paymentId: "pay-1" });
  assert.strictEqual(shop.handleWebhook(changed, signature), "rejected");
  assert.strictEqual(shop.getOrder(1).status, "RESERVED");
});

test("a rejected event does not count as seen", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  const [body, signature] = paid("evt_1", "pay-1");
  assert.strictEqual(shop.handleWebhook(body, "forged"), "rejected");
  assert.strictEqual(shop.handleWebhook(body, signature), "processed");
  assert.strictEqual(shop.getOrder(1).status, "PAID");
});

// ---- The webhook: paid, and paid twice ----

test("payment succeeded: the order is PAID, an OrderPaid message is in the outbox, stock stays taken", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  assert.strictEqual(shop.handleWebhook(...paid("evt_1", "pay-1")), "processed");
  assert.strictEqual(shop.getOrder(1).status, "PAID");
  assert.deepStrictEqual(shop.outbox, [{ type: "OrderPaid", orderId: 1 }]);
  assert.strictEqual(shop.stockOf("mug"), 0);
});

test("the same event a second time is a duplicate and adds nothing", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  shop.handleWebhook(...paid("evt_1", "pay-1"));
  assert.strictEqual(shop.handleWebhook(...paid("evt_1", "pay-1")), "duplicate");
  assert.strictEqual(shop.outbox.length, 1);
});

test("a second success event with a new id for the same payment changes nothing", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  shop.handleWebhook(...paid("evt_1", "pay-1"));
  assert.strictEqual(shop.handleWebhook(...paid("evt_9", "pay-1")), "processed");
  assert.strictEqual(shop.getOrder(1).status, "PAID");
  assert.strictEqual(shop.outbox.length, 1);
  assert.deepStrictEqual(shop.refunds, []);
});

// ---- The undo steps ----

test("payment failed: the order is CANCELLED and the stock comes back", () => {
  const shop = setup();
  shop.checkout({ buyerId: "cara", productId: "mug", key: "k1", now: 0 });
  assert.strictEqual(shop.handleWebhook(...failed("evt_2", "pay-1")), "processed");
  assert.strictEqual(shop.getOrder(1).status, "CANCELLED");
  assert.strictEqual(shop.getOrder(1).reason, "payment failed");
  assert.strictEqual(shop.stockOf("mug"), 1);
});

test("after a failed payment, the next buyer can get the mug", () => {
  const shop = setup();
  shop.checkout({ buyerId: "cara", productId: "mug", key: "k1", now: 0 });
  shop.handleWebhook(...failed("evt_2", "pay-1"));
  assert.strictEqual(shop.checkout({ buyerId: "dan", productId: "mug", key: "k1", now: 1 }).ok, true);
});

test("a late failed event after success is ignored: still PAID, no stock comes back", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  shop.handleWebhook(...paid("evt_1", "pay-1"));
  assert.strictEqual(shop.handleWebhook(...failed("evt_0", "pay-1")), "processed");
  assert.strictEqual(shop.getOrder(1).status, "PAID");
  assert.strictEqual(shop.stockOf("mug"), 0);
});

// ---- The hold that ends by itself ----

test("expireHolds does nothing before the hold ends", () => {
  const shop = setup();
  shop.checkout({ buyerId: "dan", productId: "mug", key: "k1", now: 0 });
  assert.strictEqual(shop.expireHolds(9), 0);
  assert.strictEqual(shop.getOrder(1).status, "RESERVED");
});

test("expireHolds releases an unpaid hold when its time is up", () => {
  const shop = setup();
  shop.checkout({ buyerId: "dan", productId: "mug", key: "k1", now: 0 });
  assert.strictEqual(shop.expireHolds(10), 1);
  assert.strictEqual(shop.getOrder(1).status, "CANCELLED");
  assert.strictEqual(shop.getOrder(1).reason, "hold expired");
  assert.strictEqual(shop.stockOf("mug"), 1);
});

test("expireHolds never touches a PAID order", () => {
  const shop = setup();
  shop.checkout({ buyerId: "ana", productId: "mug", key: "k1", now: 0 });
  shop.handleWebhook(...paid("evt_1", "pay-1"));
  assert.strictEqual(shop.expireHolds(60), 0);
  assert.strictEqual(shop.getOrder(1).status, "PAID");
  assert.strictEqual(shop.stockOf("mug"), 0);
});

test("running expireHolds twice gives the stock back only once", () => {
  const shop = setup();
  shop.checkout({ buyerId: "dan", productId: "scarf", qty: 2, key: "k1", now: 0 });
  shop.expireHolds(11);
  assert.strictEqual(shop.expireHolds(12), 0);
  assert.strictEqual(shop.stockOf("scarf"), 2);
});

test("money that arrives after the hold ended is refunded, and the order stays CANCELLED", () => {
  const shop = setup();
  shop.checkout({ buyerId: "dan", productId: "mug", key: "k1", now: 0 });
  shop.expireHolds(10);
  shop.checkout({ buyerId: "eko", productId: "mug", key: "k1", now: 10 });   // eko takes the mug
  assert.strictEqual(shop.handleWebhook(...paid("evt_3", "pay-1")), "processed");
  assert.deepStrictEqual(shop.refunds, [{ orderId: 1, paymentId: "pay-1" }]);
  assert.strictEqual(shop.getOrder(1).status, "CANCELLED");
  assert.deepStrictEqual(shop.outbox, []);
  assert.strictEqual(shop.stockOf("mug"), 0);
});

test("a failed event after the hold already ended gives no extra stock", () => {
  const shop = setup();
  shop.checkout({ buyerId: "dan", productId: "mug", key: "k1", now: 0 });
  shop.expireHolds(10);
  shop.handleWebhook(...failed("evt_4", "pay-1"));
  assert.strictEqual(shop.stockOf("mug"), 1);
  assert.strictEqual(shop.getOrder(1).reason, "hold expired");
});
