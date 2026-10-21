// Lesson 12: Design an online shop checkout. Write createShop below, then run:
//   node --test learn/system-design/practice/12-design-an-online-shop-checkout.test.js
//
// One object plays the whole checkout back end: the products table (stock), the orders table,
// the "events I have already seen" table, the outbox and the refunds the shop must send.
// Time is a plain number of minutes, for example now = 0 means 10:00 and now = 10 means 10:10.
//
// createShop({ stock, secret, holdMinutes = 10 }) returns an object with:
//
//   outbox
//     An array. When an order becomes PAID, add { type: "OrderPaid", orderId } to it.
//     (In real life a relay reads this table and puts the message on a queue for the email worker.)
//
//   refunds
//     An array. When money arrives for an order that is no longer waiting for it,
//     add { orderId, paymentId } to it. This is the "give the money back" undo step.
//
//   checkout({ buyerId, productId, qty = 1, key, now })
//       ->  { ok: true, orderId, paymentId, expiresAt }   or   { ok: false, reason: "sold out" }
//     1. Hold the stock in one step: only if stock >= qty, take qty away. All or nothing.
//        Not enough stock: answer { ok: false, reason: "sold out" } and change nothing.
//     2. Make the order: status "RESERVED", expiresAt = now + holdMinutes.
//        Order ids start at 1 and grow by 1. The payment id is "pay-" + orderId.
//        (In real life the API now asks Stripe for a payment with Idempotency-Key "order-<id>".)
//     The browser sends its own key, made once per press of the Pay button.
//     The same buyerId and key a second time (a double click, a retry) must not hold stock again.
//     It returns exactly the same answer as the first time.
//
//   handleWebhook(rawBody, signature)  ->  "rejected" | "duplicate" | "processed"
//     rawBody is the text the payment provider sent, for example
//       '{"id":"evt_1","type":"payment_intent.succeeded","paymentId":"pay-1"}'
//     1. Check the signature FIRST, on the raw text: it must equal sign(rawBody, secret).
//        Wrong: answer "rejected" and change nothing. A rejected event does not count as seen.
//     2. Then read the JSON. If this event id was processed before, answer "duplicate".
//     3. Otherwise remember the id, do the work below, and answer "processed".
//        "payment_intent.succeeded":
//           order is RESERVED  -> status "PAID", add { type: "OrderPaid", orderId } to outbox
//           order is CANCELLED -> the money came too late: add { orderId, paymentId } to refunds
//           order is PAID      -> nothing
//        "payment_intent.payment_failed":
//           order is RESERVED  -> status "CANCELLED", reason "payment failed", give the stock back
//           any other status   -> nothing (events can arrive late and out of order)
//
//   expireHolds(now)  ->  number of orders released
//     Every RESERVED order with expiresAt <= now becomes "CANCELLED" with reason "hold expired",
//     and its stock goes back. PAID and CANCELLED orders are never touched.
//
//   getOrder(orderId)  ->  { id, buyerId, productId, qty, status, reason, expiresAt, paymentId }
//     reason is null until the order is cancelled.
//
//   stockOf(productId)  ->  the number of units that are free to hold right now
const crypto = require("node:crypto");

// Ready to use, do not change. The payment provider signs the raw text with a secret you share.
// (Stripe really signs "<timestamp>.<raw body>" and sends it in the Stripe-Signature header.)
function sign(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function createShop({ stock, secret, holdMinutes = 10 }) {
  // TODO
}

module.exports = { createShop, sign };
