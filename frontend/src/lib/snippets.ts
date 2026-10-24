/** Code samples shared by the dashboard integration page and the public docs. */

export function createInvoiceCurl(base: string, productId = "PRODUCT_ID", priceId = "PRICE_ID") {
  return `curl -X POST ${base}/api/v1/userApi/invoices \\
  -H "Authorization: Bearer $SOLPAY_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_id": "${productId}",
    "price_id": "${priceId}",
    "numberOfItems": 1,
    "buyer_email": "customer@example.com",
    "success_url": "https://shop.example.com/thanks",
    "cancel_url": "https://shop.example.com/cart",
    "webhook_url": "https://shop.example.com/webhooks/solpay"
  }'`;
}

export function createInvoiceNode(base: string, productId = "PRODUCT_ID", priceId = "PRICE_ID") {
  return `// POST /checkout on your server
app.post("/checkout", async (req, res) => {
  const response = await fetch("${base}/api/v1/userApi/invoices", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.SOLPAY_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: "${productId}",
      price_id: "${priceId}",
      numberOfItems: 1,
      success_url: "https://shop.example.com/thanks",
      cancel_url: "https://shop.example.com/cart",
      webhook_url: "https://shop.example.com/webhooks/solpay",
    }),
  });
  if (!response.ok) return res.status(502).json(await response.json());

  const { invoice_id, checkout_url } = await response.json();
  // Save invoice_id with the order, then send the customer to the hosted checkout.
  res.redirect(303, checkout_url);
});`;
}

export const createInvoiceResponse = `{
  "message": "Invoice created. Redirect customer to checkout.",
  "invoice_id": "cmh4x0n2e0001qx8l9v3k7y2a",
  "checkout_url": "https://pay.example.com/checkout/cmh4x0n2e0001qx8l9v3k7y2a",
  "amount": "0.25",
  "currency": "SOL",
  "status": "PENDING",
  "expires_at": "2026-10-24T12:30:00.000Z"
}`;

export const webhookPayload = `{
  "event": "invoice.paid",
  "invoiceId": "cmh4x0n2e0001qx8l9v3k7y2a",
  "paymentId": "cmh4x1b7f0003qx8lq1d0h5mz",
  "status": "PAID",
  "amount": 0.25,
  "currency": "SOL",
  "txHash": "5N8sQm…XfQe",
  "productId": "f4e8381d-1e4f-4ece-b5e9-de18adc066a5",
  "priceId": "c128c6cd-f680-4fd0-8b25-04365f660b13",
  "numberOfItems": 1,
  "buyerEmail": "customer@example.com",
  "buyerWallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "paidAt": "2026-10-24T12:01:13.000Z"
}`;

export const webhookHandlerNode = `import crypto from "node:crypto";
import express from "express";

const app = express();

// Use the raw body: the signature is computed over the exact bytes sent.
app.post("/webhooks/solpay", express.raw({ type: "application/json" }), (req, res) => {
  const body = req.body.toString("utf8");
  const header = req.get("x-solpay-signature") ?? "";
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));

  const expected = crypto
    .createHmac("sha256", process.env.SOLPAY_WEBHOOK_SECRET)
    .update(\`\${t}.\${body}\`)
    .digest("hex");

  const fresh = Math.abs(Date.now() / 1000 - Number(t)) < 300;
  const valid = v1 && expected.length === v1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  if (!fresh || !valid) return res.status(400).send("invalid signature");

  const event = JSON.parse(body);
  res.sendStatus(200); // acknowledge quickly

  if (event.event === "invoice.paid") {
    // Idempotent: you may receive the same event more than once.
    fulfillOrder(event.invoiceId, event.txHash);
  }
});`;

export function retrieveInvoiceCurl(base: string) {
  return `curl ${base}/api/v1/userApi/invoices/INVOICE_ID \\
  -H "Authorization: Bearer $SOLPAY_SECRET_KEY"`;
}
