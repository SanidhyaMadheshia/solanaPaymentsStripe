# Vendor backend (example e-commerce store)

A small store that sells through SolPay. Copy this to see how a merchant integrates SolPay:

```
Buyer ─▶ POST /checkout ─▶ SolPay API: create invoice ─▶ redirect to hosted checkout
                                                              │ buyer pays (Devnet)
SolPay ─▶ POST /webhooks/solpay  (signed invoice.paid) ─▶ verify ─▶ confirm via API ─▶ order = paid
Buyer  ◀─ /orders/:id  (success_url, auto-refreshes, reconciles via API if the webhook is late)
```

| Route | Purpose |
|---|---|
| `GET /` | Storefront built from `catalog.json` |
| `POST /checkout` | Saves the order, creates a SolPay invoice, redirects (303) to `checkout_url` |
| `POST /webhooks/solpay` | **Webhook listener**: verifies `X-SolPay-Signature`, dedupes, double-checks with the API, fulfils |
| `GET /orders/:id` | Order status page (used as `success_url`) |
| `GET /orders`, `GET /api/orders/:id` | Order list / JSON. Add auth before going public |

## How the webhook handler stays safe

1. **Raw body + HMAC check.** The signature `t=<unix>,v1=<hmac-sha256("<t>.<body>")>` is checked with `SOLPAY_WEBHOOK_SECRET`, and timestamps older than 5 minutes are rejected (replay protection). Unsigned or forged requests get `400`.
2. **Idempotent.** SolPay delivers at least once, so an already-paid order just returns `200 {duplicate: true}`.
3. **Confirm with the API.** Before fulfilling, it calls `GET /api/v1/userApi/invoices/:id` and checks `status === "PAID"` and that the amount matches the order.
4. **Correct status codes.** If the SolPay API is unreachable it returns `503`, so SolPay retries with backoff. Unknown invoices get `200`, so retries stop.
5. **Fulfil in one place.** Look for `>>> Fulfil here` in `src/server.js`.

## Run it locally

1. Create a store account at `/register` on SolPay (e.g. http://localhost:5173/register).
2. In the dashboard: set your Devnet receiving wallet, create a product + price, create an API key, and copy the **webhook signing secret** from Settings.
3. Here:
   ```bash
   cd examples/vendor-backend
   cp .env.example .env     # SOLPAY_SECRET_KEY=sk_…, SOLPAY_WEBHOOK_SECRET=whsec_… (from Settings)
   # put the Product ID and Price ID from the dashboard into catalog.json
   npm install
   npm run dev              # http://localhost:4000
   ```
4. Open http://localhost:4000, click **Pay with SOL**, pay with a Devnet wallet, and you land on the order page, which flips to **paid** when the webhook arrives.

`npm test` runs the handler tests (signature, duplicates, mismatches, outages).

## Deploying

The SolPay backend must be able to reach `PUBLIC_URL/webhooks/solpay` over the internet:

- **Render/Railway/Fly:** deploy this folder as a Node service (`npm install`, `npm start`), and set the env vars from `.env.example` with `PUBLIC_URL=https://<your-vendor>.onrender.com` and `SOLPAY_API_URL=https://<your-solpay-api>.onrender.com`. Pass the catalog through `CATALOG_JSON` if you don't want to commit IDs.
- **Local vendor + hosted SolPay:** expose port 4000 with a tunnel (`ngrok http 4000` / `cloudflared tunnel --url http://localhost:4000`) and use the tunnel URL as `PUBLIC_URL`.
- The JSON file store is for demos. Use your real database for orders, and note that Render's free disk is wiped on redeploy.
