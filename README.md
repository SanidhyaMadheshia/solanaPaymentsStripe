# SolPay: Stripe-style payments for Solana

Accept SOL with a familiar flow: create products and prices, call one API to create an invoice, redirect the customer to a hosted checkout, and get a signed webhook once the payment is verified on-chain. SolPay is **non-custodial**: funds go straight from the buyer's wallet to yours.

> **Devnet only.** SolPay runs on Solana Devnet: every payment uses free test SOL with no monetary value, so stores can integrate and test the full flow safely.

Any e-commerce store can **sign up** at `/register` and get its own dashboard, products, API keys, payments and webhook signing secret. Data is fully isolated between stores.

## Features

- Merchant accounts: email + password sign-up/login (scrypt hashing, revocable sessions, rate-limited), per-store data isolation and webhook secrets
- Dashboard with overview and revenue chart, payments (search, filters, details, webhook resend, cancel), products and prices (archive/restore), payment links, API keys, integration guide, and settings
- Hosted checkout that works with any Wallet Standard wallet (Phantom, Solflare, Backpack…), with a live countdown, one-device session lock, and clear error states
- On-chain verification: every expected transfer, the fee payer, and timing are checked before an invoice is marked `PAID`
- Webhooks: `invoice.paid` with an HMAC-SHA256 signature, retries with exponential backoff, and resume after restart
- Only one dependency, PostgreSQL (no Redis, no socket server, no separate RPC service)

## Quick start (Docker)

```bash
cp .env.example .env        # set POSTGRES_PASSWORD and SOLANA_RPC_URL
docker compose up -d --build
open http://localhost:8080/register
```

The `web` container (nginx) serves the frontend and proxies `/api` to the backend, so the whole app runs on one origin. Database migrations run automatically when the backend starts.

Create an account, then in the dashboard: **Settings** → set your receiving wallet → **Products** → add a product and price → **Payment link** → pay it with a Devnet wallet ([faucet](https://faucet.solana.com)).

## Configuration

All settings are environment variables. See [`.env.example`](.env.example) (compose) and [`backend/.env.example`](backend/.env.example) (all options).

| Variable | Purpose |
|---|---|
| `PUBLIC_APP_URL` | Public URL of the site; used to build `checkout_url` |
| `SOLANA_CLUSTER` | `devnet` (the only supported value) |
| `SOLANA_RPC_URL` | **Private** server-side RPC (e.g. a QuickNode endpoint). Never sent to browsers |
| `PUBLIC_SOLANA_RPC_URL` | RPC the browser uses to broadcast transactions. Public, so don't put a secret key here |
| `SOLANA_COMMITMENT` | `finalized` (default, safest) or `confirmed` (faster) |
| `REGISTRATION_ENABLED` | `true` (default) lets stores sign up at `/register`; `false` closes sign-ups |
| `SESSION_TTL_DAYS` | How long a dashboard login lasts (default 30) |
| `WEBHOOK_SECRET` | Legacy fallback only. Each store has its own secret in **Settings** |
| `PLATFORM_FEE_ADDRESS` / `PLATFORM_FEE_LAMPORTS` | Optional extra fee transfer per checkout |
| `INVOICE_TTL_MINUTES`, `SESSION_TTL_MINUTES`, `VERIFY_TIMEOUT_SECONDS` | Timing |

> **Security:** passwords are hashed with scrypt, and sessions are random tokens stored hashed and revocable (logout, password change). Login and registration are rate-limited. Serve the site over HTTPS. Webhooks are signed per store, so one store can never forge events for another.

## API

```bash
curl -X POST https://pay.example.com/api/v1/userApi/invoices \
  -H "Authorization: Bearer $SOLPAY_SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"product_id":"…","price_id":"…","numberOfItems":1,"success_url":"https://shop.example.com/thanks","webhook_url":"https://shop.example.com/webhooks/solpay"}'
# → 201 { "invoice_id": "…", "checkout_url": "https://pay.example.com/checkout/…", "amount": "0.25", … }

curl https://pay.example.com/api/v1/userApi/invoices/INVOICE_ID -H "Authorization: Bearer $SOLPAY_SECRET_KEY"
```

The full reference is at `/docs` in the app.

**Example store:** [`examples/vendor-backend`](examples/vendor-backend) is a working e-commerce backend that creates checkouts and listens for SolPay webhooks (signature check, idempotency, API confirmation). Start there when integrating a store.

## Local development

```bash
# Postgres
docker run -d --name solpay-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=solpay -p 5432:5432 postgres:16-alpine

# Backend (http://localhost:3003)
cd backend && cp .env.example .env && npm install
npm run prisma:deploy && npm run dev

# Frontend (http://localhost:5173, proxies /api to :3003)
cd frontend && npm install && npm run dev
```

Tests:

```bash
cd backend && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solpay_test npm test   # unit + API integration (fake chain)
cd frontend && npm run lint && npm test && npm run build
```

CI runs both in GitHub Actions (`.github/workflows/ci.yml`).

## Deploy: Vercel (frontend) + Render (API) + Neon (Postgres)

**1. Neon:** create a project and copy two connection strings from *Connect*:
- **Pooled** (host contains `-pooler`): add `?sslmode=require&pgbouncer=true`. This is `DATABASE_URL`.
- **Direct** (no `-pooler`): add `?sslmode=require`. This is `DIRECT_URL`, used only for migrations.

**2. Render (API):** *New → Blueprint*, pick this repo. `render.yaml` creates `solpay-api` from `backend/Dockerfile`. Fill in:

| Variable | Value |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | from Neon (above) |
| `PUBLIC_APP_URL` | your Vercel URL, e.g. `https://solpay.vercel.app` (sets `checkout_url` and CORS) |
| `SOLANA_RPC_URL` | your QuickNode **Devnet** endpoint (private, server-side only) |
| `CORS_ORIGINS` | optional extra origins, e.g. a custom domain |

Migrations run on every deploy. Check `https://<service>.onrender.com/healthz` → `{"status":"ok"}`.

**3. Vercel (frontend):** *Add New → Project*, import the repo, set **Root Directory = `frontend`** (Vite is detected; `vercel.json` handles SPA routing and caching). Add the environment variable `VITE_API_URL=https://<service>.onrender.com` (no trailing slash) and deploy. If you change it later, redeploy, because it's baked in at build time.

**4. First run:** open `https://<vercel-app>/register`, create your store account, set your Devnet receiving wallet, add a product and price, create an API key, then pay a payment link with a Devnet wallet.

Notes:
- Render's free plan sleeps after ~15 min idle, so the first request takes ~30–60 s. Use a paid instance for a smoother checkout.
- Merchants integrate against the **Render** URL: `https://<service>.onrender.com/api/v1/userApi/invoices`. The docs and dashboard examples use it automatically.

### Alternative: one Docker host

`docker compose up -d --build` behind a TLS proxy (Caddy, Traefik, nginx). nginx serves the frontend and proxies `/api` on a single origin.

## Upgrading from earlier versions

- **From the Clerk version:** migration `20261024000000_remove_clerk_single_merchant` drops `clerkId` and moves all existing data to a `default` merchant. No data is deleted. `QUICKNODE_RPC` is now `SOLANA_RPC_URL`.
- **From the single-merchant version:** migration `20261025000000_merchant_accounts` adds accounts. The **first account registered** takes over the existing `default` merchant (its products, API keys, invoices, and the old `WEBHOOK_SECRET` as its webhook secret), so existing integrations keep working. `DASHBOARD_TOKEN` and `MERCHANT_NAME` are no longer used.

## License

ISC
