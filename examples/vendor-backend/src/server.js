// Example vendor (e-commerce) backend integrating SolPay.
//
//   GET  /                     storefront
//   POST /checkout             create a SolPay invoice → redirect buyer to hosted checkout
//   POST /webhooks/solpay      receive + verify SolPay events, fulfil orders (idempotent)
//   GET  /orders/:id           order status page (buyer lands here after paying)
//   GET  /orders               all orders (admin view; protect it in production)
//   GET  /api/orders/:id       order as JSON
import express from "express";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createSolPayClient, SolPayError, verifySolPaySignature } from "./solpay.js";
import { createOrderStore } from "./store.js";

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function page(title, body, { refresh } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${refresh ? `<meta http-equiv="refresh" content="${refresh}">` : ""}<title>${esc(title)}</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#09090b;color:#fafafa}
main{max-width:760px;margin:0 auto;padding:48px 20px}h1{font-size:24px;margin:0 0 4px}p.m{color:#a1a1aa;margin:0 0 28px}
.card{border:1px solid #232328;background:#0f0f12;border-radius:14px;padding:20px;margin-bottom:16px}
.row{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}
.btn{background:#fafafa;color:#09090b;border:0;border-radius:8px;padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{background:#e4e4e7}input{background:#151518;border:1px solid #323238;color:#fafafa;border-radius:8px;padding:9px 10px;width:70px}
.b{display:inline-block;border:1px solid #323238;border-radius:999px;padding:2px 10px;font-size:12px}.paid{color:#22c55e;border-color:#22c55e55}.pending{color:#f59e0b;border-color:#f59e0b55}.failed{color:#f43f5e;border-color:#f43f5e55}
code{font:12px ui-monospace,Menlo,monospace;color:#a1a1aa;word-break:break-all}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:8px;border-bottom:1px solid #232328}th{color:#8b8b94;font-weight:500}
a{color:#fafafa}.err{color:#f43f5e}
</style></head><body><main>${body}</main></body></html>`;
}

const badge = (s) => `<span class="b ${esc(s)}">${esc(s)}</span>`;

export function createApp({ config, catalog, store, solpay, log = console }) {
  const app = express();
  app.disable("x-powered-by");

  // ---------------------------------------------------------------- webhook
  // Must use the RAW body: the signature covers the exact bytes SolPay sent.
  app.post("/webhooks/solpay", express.raw({ type: "*/*", limit: "100kb" }), async (req, res) => {
    const raw = req.body instanceof Buffer ? req.body.toString("utf8") : "";
    if (!verifySolPaySignature(config.webhookSecret, raw, req.get("x-solpay-signature"))) {
      log.warn("[webhook] rejected: invalid or missing signature");
      return res.status(400).json({ error: "invalid signature" });
    }
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: "invalid json" });
    }

    if (event.event !== "invoice.paid") {
      log.info(`[webhook] ignoring event ${event.event}`);
      return res.json({ received: true, ignored: true });
    }

    const order = store.byInvoice(event.invoiceId);
    if (!order) {
      // Not ours (e.g. a payment link made in the dashboard). Ack so SolPay stops retrying.
      log.warn(`[webhook] no order for invoice ${event.invoiceId}`);
      return res.json({ received: true, unknownInvoice: true });
    }
    if (order.status === "paid") {
      // At-least-once delivery: duplicates are expected and must be harmless.
      return res.json({ received: true, duplicate: true });
    }

    // Defence in depth: confirm with the SolPay API before fulfilling.
    let invoice;
    try {
      invoice = await solpay.getInvoice(event.invoiceId);
    } catch (err) {
      log.error(`[webhook] could not confirm invoice ${event.invoiceId}: ${err.message}`);
      return res.status(503).json({ error: "temporary failure, retry" }); // SolPay will retry
    }
    if (invoice.status !== "PAID" || invoice.amount !== order.amount) {
      log.error(`[webhook] invoice ${event.invoiceId} mismatch: status=${invoice.status} amount=${invoice.amount} expected=${order.amount}`);
      store.update(order.id, { status: "failed" }, { type: "verification_failed", detail: `status=${invoice.status} amount=${invoice.amount}` });
      return res.json({ received: true, rejected: true });
    }

    store.update(
      order.id,
      { status: "paid", txHash: invoice.tx_hash ?? event.txHash, paidAt: invoice.paid_at ?? event.paidAt, buyerWallet: event.buyerWallet ?? null },
      { type: "invoice.paid", paymentId: event.paymentId, txHash: event.txHash },
    );
    log.info(`[webhook] order ${order.id} PAID (${order.amount} ${order.currency}) tx=${event.txHash}`);
    // >>> Fulfil here: send email, reduce stock, grant access, ship… (keep it idempotent)
    return res.json({ received: true });
  });

  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  // -------------------------------------------------------------- storefront
  app.get("/", (_req, res) => {
    const items = catalog
      .map(
        (p) => `<div class="card row"><div><strong>${esc(p.name)}</strong><div style="color:#a1a1aa">${esc(p.description ?? "")}</div>
        <div style="margin-top:6px">${esc(p.displayPrice ?? "")}</div></div>
        <form method="post" action="/checkout" class="row" style="gap:8px"><input type="hidden" name="sku" value="${esc(p.sku)}">
        <label>Qty <input type="number" name="qty" value="1" min="1" max="100"></label>
        <input type="email" name="email" placeholder="email (optional)" style="width:190px">
        <button class="btn" type="submit">Pay with SOL</button></form></div>`,
      )
      .join("");
    res.send(page(config.storeName, `<h1>${esc(config.storeName)}</h1><p class="m">Example store paying through SolPay on Solana Devnet.</p>${items}<p><a href="/orders">View orders</a></p>`));
  });

  app.post("/checkout", async (req, res) => {
    const item = catalog.find((p) => p.sku === req.body.sku);
    if (!item) return res.status(400).send(page("Error", `<p class="err">Unknown product.</p><a href="/">Back</a>`));
    const qty = Math.min(100, Math.max(1, Number.parseInt(req.body.qty, 10) || 1));
    const email = typeof req.body.email === "string" && req.body.email.trim() ? req.body.email.trim() : undefined;

    // 1) record the order first so the webhook can always find it
    const order = store.create({ sku: item.sku, name: item.name, qty, email: email ?? null });
    try {
      // 2) ask SolPay for a checkout
      const inv = await solpay.createInvoice({
        product_id: item.productId,
        price_id: item.priceId,
        numberOfItems: qty,
        ...(email && { buyer_email: email }),
        success_url: `${config.publicUrl}/orders/${order.id}`,
        cancel_url: `${config.publicUrl}/`,
        webhook_url: `${config.publicUrl}/webhooks/solpay`,
      });
      store.update(order.id, { invoiceId: inv.invoice_id, amount: inv.amount, currency: inv.currency, checkoutUrl: inv.checkout_url, expiresAt: inv.expires_at }, { type: "invoice.created", invoiceId: inv.invoice_id });
      // 3) send the buyer to the hosted checkout
      return res.redirect(303, inv.checkout_url);
    } catch (err) {
      const msg = err instanceof SolPayError ? err.message : "Could not reach SolPay";
      store.update(order.id, { status: "failed" }, { type: "checkout_error", detail: msg });
      log.error(`[checkout] ${msg}`);
      return res.status(502).send(page("Checkout failed", `<h1>Checkout failed</h1><p class="err">${esc(msg)}</p><a href="/">Back to store</a>`));
    }
  });

  // ------------------------------------------------------------------ orders
  async function reconcile(order) {
    // Webhook may be delayed (or unreachable in local dev): fall back to asking the API.
    if (order.status !== "pending" || !order.invoiceId) return order;
    try {
      const inv = await solpay.getInvoice(order.invoiceId);
      if (inv.status === "PAID" && inv.amount === order.amount) {
        return store.update(order.id, { status: "paid", txHash: inv.tx_hash, paidAt: inv.paid_at }, { type: "reconciled" });
      }
      if (inv.status === "EXPIRED" || inv.status === "CANCELLED") {
        return store.update(order.id, { status: inv.status.toLowerCase() }, { type: "reconciled" });
      }
    } catch {
      /* keep pending */
    }
    return order;
  }

  app.get("/orders/:id", async (req, res) => {
    let order = store.get(req.params.id);
    if (!order) return res.status(404).send(page("Not found", `<p>Order not found.</p><a href="/">Back</a>`));
    order = await reconcile(order);
    const pending = order.status === "pending";
    const explorer = order.txHash ? `https://explorer.solana.com/tx/${encodeURIComponent(order.txHash)}?cluster=devnet` : null;
    res.send(
      page(
        `Order ${order.id}`,
        `<h1>Order ${esc(order.id)}</h1><p class="m">${pending ? "Waiting for payment confirmation… this page refreshes automatically." : "Thanks for your order!"}</p>
        <div class="card"><div class="row"><strong>${esc(order.name)} × ${esc(order.qty)}</strong>${badge(order.status)}</div>
        <p>${esc(order.amount ?? "—")} ${esc(order.currency ?? "")}</p>
        ${explorer ? `<p>Transaction: <a href="${explorer}" target="_blank" rel="noreferrer"><code>${esc(order.txHash)}</code></a></p>` : ""}
        ${pending && order.checkoutUrl ? `<a class="btn" href="${esc(order.checkoutUrl)}">Go to checkout</a>` : ""}</div>
        <a href="/">Back to store</a>`,
        { refresh: pending ? 4 : undefined },
      ),
    );
  });

  app.get("/api/orders/:id", (req, res) => {
    const order = store.get(req.params.id);
    if (!order) return res.status(404).json({ error: "not found" });
    res.json(order);
  });

  app.get("/orders", (_req, res) => {
    const rows = store
      .all()
      .map((o) => `<tr><td><a href="/orders/${esc(o.id)}">${esc(o.id)}</a></td><td>${esc(o.name)} × ${esc(o.qty)}</td><td>${esc(o.amount ?? "—")}</td><td>${badge(o.status)}</td><td>${esc(o.createdAt.slice(0, 19).replace("T", " "))}</td></tr>`)
      .join("");
    res.send(page("Orders", `<h1>Orders</h1><p class="m">Updated by SolPay webhooks.</p><div class="card"><table><tr><th>Order</th><th>Item</th><th>Amount (SOL)</th><th>Status</th><th>Created</th></tr>${rows || `<tr><td colspan="5">No orders yet</td></tr>`}</table></div><a href="/">Back to store</a>`));
  });

  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  return app;
}

// ------------------------------------------------------------------ startup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const env = process.env;
  const missing = ["SOLPAY_API_URL", "SOLPAY_SECRET_KEY", "SOLPAY_WEBHOOK_SECRET"].filter((k) => !env[k]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")} (see .env.example)`);
    process.exit(1);
  }
  const catalogPath = new URL("../catalog.json", import.meta.url);
  const catalog = env.CATALOG_JSON ? JSON.parse(env.CATALOG_JSON) : JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  if (catalog.some((p) => String(p.productId).startsWith("REPLACE"))) {
    console.warn("catalog.json still has placeholder IDs: copy Product/Price IDs from the SolPay dashboard.");
  }
  const port = Number(env.PORT ?? 4000);
  const config = {
    storeName: env.STORE_NAME ?? "Demo Store",
    publicUrl: (env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/+$/, ""),
    webhookSecret: env.SOLPAY_WEBHOOK_SECRET,
  };
  const app = createApp({
    config,
    catalog,
    store: createOrderStore(env.DATA_FILE ?? "./data/orders.json"),
    solpay: createSolPayClient({ apiUrl: env.SOLPAY_API_URL, secretKey: env.SOLPAY_SECRET_KEY }),
  });
  app.listen(port, () => console.log(`Vendor store on ${config.publicUrl}  (webhook: ${config.publicUrl}/webhooks/solpay)`));
}
