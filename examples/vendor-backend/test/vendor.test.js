import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { createApp } from "../src/server.js";
import { verifySolPaySignature } from "../src/solpay.js";
import { createOrderStore } from "../src/store.js";

const SECRET = "whsec_test";
const sign = (body, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex")}`;
const quiet = { info() {}, warn() {}, error() {} };

function setup({ invoiceStatus = "PAID", invoiceAmount = "0.1", failGet = false } = {}) {
  const calls = [];
  const solpay = {
    async createInvoice(p) {
      calls.push(["create", p]);
      return { invoice_id: "inv_1", checkout_url: "https://pay.example/checkout/inv_1", amount: "0.1", currency: "SOL", expires_at: "x" };
    },
    async getInvoice(id) {
      calls.push(["get", id]);
      if (failGet) throw new Error("down");
      return { invoice_id: id, status: invoiceStatus, amount: invoiceAmount, tx_hash: "sig123", paid_at: "2026-01-01T00:00:00Z" };
    },
  };
  const store = createOrderStore(null);
  const app = createApp({
    config: { storeName: "Test", publicUrl: "https://shop.example", webhookSecret: SECRET },
    catalog: [{ sku: "hoodie", name: "Hoodie", productId: "p1", priceId: "pr1" }],
    store,
    solpay,
    log: quiet,
  });
  return { app, store, calls };
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn(base);
  } finally {
    server.close();
  }
}

async function checkout(base) {
  const res = await fetch(`${base}/checkout`, { method: "POST", redirect: "manual", body: new URLSearchParams({ sku: "hoodie", qty: "1" }) });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "https://pay.example/checkout/inv_1");
}

const paidEvent = JSON.stringify({ event: "invoice.paid", invoiceId: "inv_1", paymentId: "pay_1", status: "PAID", amount: 0.1, txHash: "sig123" });
const postHook = (base, body, sig) => fetch(`${base}/webhooks/solpay`, { method: "POST", headers: { "content-type": "application/json", ...(sig && { "x-solpay-signature": sig }) }, body });

test("signature verification rejects tampering, wrong secret and stale timestamps", () => {
  const body = '{"a":1}';
  assert.equal(verifySolPaySignature(SECRET, body, sign(body)), true);
  assert.equal(verifySolPaySignature(SECRET, '{"a":2}', sign(body)), false);
  assert.equal(verifySolPaySignature("other", body, sign(body)), false);
  assert.equal(verifySolPaySignature(SECRET, body, sign(body, Math.floor(Date.now() / 1000) - 3600)), false);
  assert.equal(verifySolPaySignature(SECRET, body, undefined), false);
  assert.equal(verifySolPaySignature(SECRET, body, "garbage"), false);
});

test("checkout creates an invoice with the right URLs and redirects", async () => {
  const { app, store, calls } = setup();
  await withServer(app, checkout);
  const [, params] = calls[0];
  const order = store.all()[0];
  assert.equal(params.webhook_url, "https://shop.example/webhooks/solpay");
  assert.equal(params.success_url, `https://shop.example/orders/${order.id}`);
  assert.equal(order.invoiceId, "inv_1");
  assert.equal(order.status, "pending");
});

test("valid webhook marks the order paid exactly once", async () => {
  const { app, store, calls } = setup();
  await withServer(app, async (base) => {
    await checkout(base);
    const r1 = await postHook(base, paidEvent, sign(paidEvent));
    assert.deepEqual(await r1.json(), { received: true });
    const r2 = await postHook(base, paidEvent, sign(paidEvent));
    assert.deepEqual(await r2.json(), { received: true, duplicate: true });
  });
  const order = store.all()[0];
  assert.equal(order.status, "paid");
  assert.equal(order.txHash, "sig123");
  assert.equal(order.events.filter((e) => e.type === "invoice.paid").length, 1);
  assert.equal(calls.filter(([k]) => k === "get").length, 1);
});

test("unsigned or forged webhooks are rejected", async () => {
  const { app, store } = setup();
  await withServer(app, async (base) => {
    await checkout(base);
    assert.equal((await postHook(base, paidEvent)).status, 400);
    assert.equal((await postHook(base, paidEvent, sign('{"other":1}'))).status, 400);
  });
  assert.equal(store.all()[0].status, "pending");
});

test("amount mismatch from the API blocks fulfilment", async () => {
  const { app, store } = setup({ invoiceAmount: "0.0001" });
  await withServer(app, async (base) => {
    await checkout(base);
    assert.equal((await postHook(base, paidEvent, sign(paidEvent))).status, 200);
  });
  assert.equal(store.all()[0].status, "failed");
});

test("API outage returns 503 so SolPay retries", async () => {
  const { app, store } = setup({ failGet: true });
  await withServer(app, async (base) => {
    await checkout(base);
    assert.equal((await postHook(base, paidEvent, sign(paidEvent))).status, 503);
  });
  assert.equal(store.all()[0].status, "pending");
});

test("unknown invoices are acknowledged and ignored", async () => {
  const { app } = setup();
  const body = JSON.stringify({ event: "invoice.paid", invoiceId: "nope" });
  await withServer(app, async (base) => {
    const r = await postHook(base, body, sign(body));
    assert.deepEqual(await r.json(), { received: true, unknownInvoice: true });
  });
});
