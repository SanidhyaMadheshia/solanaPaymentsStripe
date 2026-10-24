/**
 * End-to-end API tests against a real PostgreSQL database with a fake Solana chain.
 * Run with: TEST_DATABASE_URL=postgresql://... npm test
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { decodeCheckoutTransaction } from "../src/lib/solana.js";
import { verifyWebhookSignature } from "../src/lib/webhooks.js";
import { deliverWebhook, verifySession } from "../src/services/checkout.js";
import { LEGACY_MERCHANT_ID, type Deps } from "../src/services/merchant.js";
import { FakeChain, fakeSignature, newAddress, parsedTx } from "./helpers.js";

const DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!DB)("API integration", () => {
  let prisma: PrismaClient;
  let chain: FakeChain;
  let webhooks: { url: string; body: string; headers: Record<string, string> }[];
  let webhookStatus: number;
  let deps: Deps;
  let app: ReturnType<typeof createApp>;
  let token: string;

  /** Dashboard request authenticated as the current merchant (or a given session token). */
  const D = (method: "get" | "post" | "put" | "patch" | "delete", path: string, as = token) =>
    request(app)[method](path).set("Authorization", `Bearer ${as}`);

  let n = 0;
  async function registerMerchant(name = "Acme", email = `m${++n}-${Date.now()}@example.com`, password = "correct horse battery") {
    const res = await request(app).post("/api/v1/auth/register").send({ email, password, businessName: name }).expect(201);
    return { token: res.body.token as string, merchant: res.body.merchant, email, password };
  }

  const merchantWallet = newAddress();
  const feeWallet = newAddress();

  const build = (overrides: Record<string, string> = {}) => {
    const config = loadConfig({
      DATABASE_URL: DB!,
      PUBLIC_APP_URL: "https://pay.example.com",
      WEBHOOK_SECRET: "whsec_test",
      PLATFORM_FEE_ADDRESS: feeWallet,
      PLATFORM_FEE_LAMPORTS: "10000",
      VERIFY_TIMEOUT_SECONDS: "1",
      ...overrides,
    });
    deps = {
      prisma,
      config,
      chain,
      pollIntervalMs: 10,
      sendWebhook: async (url, body, headers) => {
        webhooks.push({ url, body, headers });
        return { status: webhookStatus };
      },
    };
    app = createApp(deps);
  };

  beforeAll(() => {
    execSync("npx prisma migrate deploy --schema src/db/prisma/schema.prisma", {
      env: { ...process.env, DATABASE_URL: DB, DIRECT_URL: DB },
      stdio: "pipe",
    });
    prisma = new PrismaClient({ datasourceUrl: DB! });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE "Session", "Payment", "CheckoutSession", "Invoice", "Price", "Product", "ApiKey", "User" CASCADE`,
    );
    chain = new FakeChain();
    webhooks = [];
    webhookStatus = 200;
    build();
    token = (await registerMerchant()).token;
  });

  /** Creates wallet setting, product, price and API key through the dashboard API. */
  async function setupMerchant() {
    await D("put", "/api/v1/dashboard/settings").send({ walletAddress: merchantWallet, name: "Acme" }).expect(200);
    const product = (await D("post", "/api/v1/dashboard/products").send({ name: "Pro plan", description: "Monthly" }).expect(201)).body;
    const price = (await D("post", `/api/v1/dashboard/products/${product.id}/prices`).send({ label: "Monthly", amount: "0.25" }).expect(201)).body;
    const key = (await D("post", "/api/v1/dashboard/api-keys").send({ label: "Server" }).expect(201)).body;
    return { product, price, apiKey: key.apiKey as string };
  }

  async function createInvoice(s: Awaited<ReturnType<typeof setupMerchant>>, extra: Record<string, unknown> = {}) {
    const res = await request(app)
      .post("/api/v1/userApi/invoices")
      .set("Authorization", `Bearer ${s.apiKey}`)
      .send({ product_id: s.product.id, price_id: s.price.id, numberOfItems: 2, webhook_url: "https://shop.example.com/hook", success_url: "https://shop.example.com/thanks", ...extra })
      .expect(201);
    return res.body as { invoice_id: string; checkout_url: string; amount: string };
  }

  it("serves health and runtime config", async () => {
    await request(app).get("/healthz").expect(200, { status: "ok" });
    const cfg = await request(app).get("/api/v1/config").expect(200);
    expect(cfg.body).toMatchObject({ cluster: "devnet", registrationEnabled: true, platformFeeLamports: 10000 });
  });

  it("runs the full checkout: invoice -> session -> signature -> verified -> webhook", async () => {
    const s = await setupMerchant();
    const inv = await createInvoice(s);
    expect(inv.amount).toBe("0.5");
    expect(inv.checkout_url).toBe(`https://pay.example.com/checkout/${inv.invoice_id}`);

    // Before a wallet connects, the checkout can render the order summary; private fields stay hidden.
    const preview = await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).expect(200);
    expect(preview.body.status).toBe("awaiting_wallet");
    expect(preview.body.invoice).toMatchObject({ productName: "Pro plan", description: "Monthly", merchantName: "Acme", amount: "0.5" });
    expect(preview.body.invoice.webhookUrl).toBeUndefined();

    const buyer = newAddress();
    const start = await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", buyer).expect(200);
    expect(start.body.status).toBe("created");
    const session = start.body.session;
    const expected = decodeCheckoutTransaction(session.txHash).transfers;
    expect(expected).toEqual([
      { from: buyer, to: merchantWallet, lamports: 500_000_000n },
      { from: buyer, to: feeWallet, lamports: 10_000n },
    ]);

    // Same wallet resumes; a different wallet is locked out with 409 (was a 204 with a body before).
    const resumed = await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", buyer).expect(200);
    expect(resumed.body).toMatchObject({ status: "resumed", session: { id: session.id } });
    const other = await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", newAddress()).expect(409);
    expect(other.body.details.status).toBe("active_on_other_device");

    const sig = fakeSignature();
    chain.land(sig, parsedTx({ feePayer: buyer, transfers: expected }));
    await request(app).post(`/api/v1/invoice/${inv.invoice_id}/confirm`).send({ sessionId: session.id, signature: sig }).expect(202);
    await expect(verifySession(deps, session.id)).resolves.not.toBe("failed");

    await expect.poll(async () => (await request(app).get(`/api/v1/invoice/${inv.invoice_id}/status?sessionId=${session.id}`)).body.invoiceStatus).toBe("PAID");
    const status = await request(app).get(`/api/v1/invoice/${inv.invoice_id}/status?sessionId=${session.id}`).expect(200);
    expect(status.body).toMatchObject({ txHash: sig, successUrl: "https://shop.example.com/thanks", session: { status: "COMPLETED" } });

    const payment = await prisma.payment.findUniqueOrThrow({ where: { txHash: sig } });
    expect(payment.amount.toString()).toBe("0.5");

    await expect.poll(() => webhooks.length).toBe(1);
    const hook = webhooks[0]!;
    expect(hook.url).toBe("https://shop.example.com/hook");
    expect(JSON.parse(hook.body)).toMatchObject({ event: "invoice.paid", invoiceId: inv.invoice_id, status: "PAID", amount: 0.5, txHash: sig, buyerWallet: buyer });
    const { webhookSecret } = (await D("get", "/api/v1/dashboard/webhook-secret").expect(200)).body;
    expect(webhookSecret).toMatch(/^whsec_[0-9a-f]{64}$/);
    expect(verifyWebhookSignature(webhookSecret, hook.body, hook.headers["x-solpay-signature"]!)).toBe(true);
    // Not signed with the global legacy secret.
    expect(verifyWebhookSignature("whsec_test", hook.body, hook.headers["x-solpay-signature"]!)).toBe(false);

    // Success page + merchant status endpoint.
    const success = await request(app).get(`/api/v1/invoice/txnSignature/${inv.invoice_id}`).expect(200);
    expect(success.body).toMatchObject({ txnSignature: sig, amount: "0.5", currency: "SOL" });
    const merchantView = await request(app).get(`/api/v1/userApi/invoices/${inv.invoice_id}`).set("Authorization", `Bearer ${s.apiKey}`).expect(200);
    expect(merchantView.body).toMatchObject({ status: "PAID", tx_hash: sig });

    // Paid invoices report as paid; the same signature cannot pay another invoice.
    expect((await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", buyer)).body.status).toBe("paid");
    const inv2 = await createInvoice(s);
    const s2 = (await request(app).get(`/api/v1/invoice/${inv2.invoice_id}`).set("x-wallet-address", buyer)).body.session;
    await request(app).post(`/api/v1/invoice/${inv2.invoice_id}/confirm`).send({ sessionId: s2.id, signature: sig }).expect(409);

    // Dashboard overview reflects the payment.
    const overview = await D("get", "/api/v1/dashboard/overview").expect(200);
    expect(overview.body.totals).toMatchObject({ revenue: "0.5", payments: 1, paid: 1, pending: 1 });
    expect(overview.body.setup).toEqual({ hasWallet: true, hasProduct: true, hasApiKey: true, hasPayment: true });
    expect(overview.body.daily).toHaveLength(14);
    expect(overview.body.daily.at(-1).total).toBe("0.5");
  });

  it("marks the session failed when the on-chain transfer does not match", async () => {
    const s = await setupMerchant();
    const inv = await createInvoice(s);
    const buyer = newAddress();
    const session = (await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", buyer)).body.session;
    const sig = fakeSignature();
    chain.land(sig, parsedTx({ feePayer: buyer, transfers: [{ from: buyer, to: merchantWallet, lamports: 1n }] }));
    await request(app).post(`/api/v1/invoice/${inv.invoice_id}/confirm`).send({ sessionId: session.id, signature: sig }).expect(202);
    await expect.poll(async () => (await prisma.checkoutSession.findUniqueOrThrow({ where: { id: session.id } })).status).toBe("FAILED");
    const st = (await request(app).get(`/api/v1/invoice/${inv.invoice_id}/status?sessionId=${session.id}`)).body;
    expect(st.invoiceStatus).toBe("PENDING");
    expect(st.session.verifyError).toMatch(/Missing transfer/);
    expect(webhooks).toHaveLength(0);
  });

  it("times out signatures that never land", async () => {
    const s = await setupMerchant();
    const inv = await createInvoice(s);
    const session = (await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", newAddress())).body.session;
    await request(app).post(`/api/v1/invoice/${inv.invoice_id}/confirm`).send({ sessionId: session.id, signature: fakeSignature() }).expect(202);
    await expect.poll(async () => (await prisma.checkoutSession.findUniqueOrThrow({ where: { id: session.id } })).verifyError, { timeout: 5000 }).toMatch(/not confirmed in time/);
  });

  it("retries failed webhooks with backoff and supports manual resend", async () => {
    const s = await setupMerchant();
    const inv = await createInvoice(s);
    const buyer = newAddress();
    const session = (await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", buyer)).body.session;
    webhookStatus = 500;
    const sig = fakeSignature();
    chain.land(sig, parsedTx({ feePayer: buyer, transfers: decodeCheckoutTransaction(session.txHash).transfers }));
    await request(app).post(`/api/v1/invoice/${inv.invoice_id}/confirm`).send({ sessionId: session.id, signature: sig }).expect(202);

    await expect.poll(async () => (await prisma.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).webhookAttempts).toBe(1);
    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } });
    expect(after.webhookLastError).toBe("HTTP 500");
    expect(after.webhookNextAttemptAt!.getTime()).toBeGreaterThan(Date.now() + 20_000);
    // Not due yet -> skipped.
    expect(await deliverWebhook(deps, inv.invoice_id)).toBe("skipped");

    webhookStatus = 204;
    const resend = await D("post", `/api/v1/dashboard/invoices/${inv.invoice_id}/resend-webhook`).expect(200);
    expect(resend.body.result).toBe("delivered");
    expect(resend.body.webhookDeliveredAt).toBeTruthy();
    expect(webhooks).toHaveLength(2);
  });

  it("validates merchant API input and authentication", async () => {
    const s = await setupMerchant();
    const body = { product_id: s.product.id, price_id: s.price.id };
    await request(app).post("/api/v1/userApi/invoices").send(body).expect(401);
    await request(app).post("/api/v1/userApi/invoices").set("Authorization", "Bearer sk_nope").send(body).expect(401);
    const bad = await request(app)
      .post("/api/v1/userApi/invoices")
      .set("Authorization", `Bearer ${s.apiKey}`)
      .send({ ...body, success_url: "javascript:alert(1)" })
      .expect(400);
    expect(bad.body.code).toBe("validation_error");
    await request(app).post("/api/v1/userApi/invoices").set("Authorization", `Bearer ${s.apiKey}`).send({ ...body, numberOfItems: 0 }).expect(400);
    await request(app).post("/api/v1/userApi/invoices").set("Authorization", `Bearer ${s.apiKey}`).send({ ...body, price_id: "missing" }).expect(404);

    // Legacy GET route with a JSON body still works.
    await request(app).get("/api/v1/userApi/getSessionUrl").set("Authorization", `Bearer ${s.apiKey}`).send(body).expect(201);

    // lastUsedAt is tracked; revoked keys stop working.
    const keys = (await D("get", "/api/v1/dashboard/api-keys").expect(200)).body.apiKeys;
    expect(keys[0].prefix).toBe(s.apiKey.slice(0, 11));
    expect(JSON.stringify(keys)).not.toContain(s.apiKey);
    await D("delete", `/api/v1/dashboard/api-keys/${keys[0].id}`).expect(204);
    await request(app).post("/api/v1/userApi/invoices").set("Authorization", `Bearer ${s.apiKey}`).send(body).expect(401);
  });

  it("requires a receiving wallet and rejects archived prices", async () => {
    const product = (await D("post", "/api/v1/dashboard/products").send({ name: "Thing" })).body;
    const price = (await D("post", `/api/v1/dashboard/products/${product.id}/prices`).send({ label: "x", amount: 1 })).body;
    const link = await D("post", "/api/v1/dashboard/payment-links").send({ product_id: product.id, price_id: price.id }).expect(400);
    expect(link.body.message).toMatch(/receiving wallet/);

    await D("put", "/api/v1/dashboard/settings").send({ walletAddress: merchantWallet }).expect(200);
    await D("post", "/api/v1/dashboard/payment-links").send({ product_id: product.id, price_id: price.id }).expect(201);
    await D("patch", `/api/v1/dashboard/prices/${price.id}`).send({ active: false }).expect(200);
    await D("post", "/api/v1/dashboard/payment-links").send({ product_id: product.id, price_id: price.id }).expect(400);
    await D("post", `/api/v1/dashboard/products/${product.id}/prices`).send({ label: "bad", amount: "-1" }).expect(400);
    await D("put", "/api/v1/dashboard/settings").send({ walletAddress: "nope" }).expect(400);
    // Empty strings clear optional settings (regression: used to crash with "Invalid URL").
    const cleared = await D("put", "/api/v1/dashboard/settings").send({ name: "Shop", walletAddress: merchantWallet, defaultWebhookUrl: "" }).expect(200);
    expect(cleared.body.defaultWebhookUrl).toBeNull();
    await D("put", "/api/v1/dashboard/settings").send({ defaultWebhookUrl: "not a url" }).expect(400);
    await D("put", "/api/v1/dashboard/settings").send({ defaultWebhookUrl: "ftp://x.example" }).expect(400);
  });

  it("expires unpaid invoices and lists/cancels invoices", async () => {
    const s = await setupMerchant();
    const inv = await createInvoice(s);
    const inv2 = await createInvoice(s);
    await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", newAddress()).expect(200);
    await prisma.invoice.update({ where: { id: inv.invoice_id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", newAddress())).body.status).toBe("expired");

    await D("post", `/api/v1/dashboard/invoices/${inv2.invoice_id}/cancel`).expect(200);
    await D("post", `/api/v1/dashboard/invoices/${inv2.invoice_id}/cancel`).expect(400);

    const all = (await D("get", "/api/v1/dashboard/invoices?limit=1").expect(200)).body;
    expect(all.invoices).toHaveLength(1);
    expect(all.nextCursor).toBeTruthy();
    const page2 = (await D("get", `/api/v1/dashboard/invoices?limit=1&cursor=${all.nextCursor}`)).body;
    expect(page2.invoices[0].id).not.toBe(all.invoices[0].id);
    const expired = (await D("get", "/api/v1/dashboard/invoices?status=EXPIRED")).body;
    expect(expired.invoices.map((i: { id: string }) => i.id)).toEqual([inv.invoice_id]);
    const detail = (await D("get", `/api/v1/dashboard/invoices/${inv.invoice_id}`).expect(200)).body;
    expect(detail.sessions).toHaveLength(1);
    expect(detail.sessions[0].status).toBe("EXPIRED");
  });

  it("lets exactly one wallet win when two connect concurrently", async () => {
    const s = await setupMerchant();
    const inv = await createInvoice(s);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => request(app).get(`/api/v1/invoice/${inv.invoice_id}`).set("x-wallet-address", newAddress())),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await prisma.checkoutSession.count({ where: { invoiceId: inv.invoice_id } })).toBe(1);
  });

  it("requires a valid login session for the dashboard", async () => {
    await request(app).get("/api/v1/dashboard/overview").expect(401);
    await request(app).get("/api/v1/dashboard/overview").set("Authorization", "Bearer sps_nope").expect(401);
    const key = (await D("post", "/api/v1/dashboard/api-keys").send({ label: "x" }).expect(201)).body.apiKey;
    // API keys cannot be used for the dashboard.
    await request(app).get("/api/v1/dashboard/overview").set("Authorization", `Bearer ${key}`).expect(401);
    await D("get", "/api/v1/dashboard/overview").expect(200);
  });

  it("returns JSON errors for unknown routes and malformed bodies", async () => {
    await request(app).get("/nope").expect(404);
    const res = await D("post", "/api/v1/dashboard/products").set("content-type", "application/json").send("{bad").expect(400);
    expect(res.body.code).toBe("bad_request");
    await request(app).get("/api/v1/invoice/missing").expect(404);
  });

  describe("accounts", () => {
    it("registers, logs in, returns /me, logs out", async () => {
      const email = "Owner@Shop.Example";
      const reg = await request(app).post("/api/v1/auth/register").send({ email, password: "s3cure-passw0rd", businessName: "Shop" }).expect(201);
      expect(reg.body.token).toMatch(/^sps_[0-9a-f]{64}$/);
      expect(reg.body.merchant).toMatchObject({ email: "owner@shop.example", name: "Shop" });
      expect(JSON.stringify(reg.body)).not.toMatch(/passwordHash|webhookSecret|scrypt/);

      await request(app).post("/api/v1/auth/register").send({ email: "owner@shop.example", password: "another-pass1", businessName: "X" }).expect(409);
      await request(app).post("/api/v1/auth/login").send({ email, password: "wrong-password" }).expect(401);
      await request(app).post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "whatever12" }).expect(401);

      const login = await request(app).post("/api/v1/auth/login").send({ email: " OWNER@shop.example ", password: "s3cure-passw0rd" }).expect(200);
      const t = login.body.token as string;
      expect((await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${t}`).expect(200)).body.merchant.name).toBe("Shop");
      const settings = (await D("get", "/api/v1/dashboard/settings", t).expect(200)).body;
      expect(settings.passwordHash).toBeUndefined();
      expect(settings.webhookSecret).toBeUndefined();

      await request(app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${t}`).expect(204);
      await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${t}`).expect(401);
      // The registration session is still valid.
      await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${reg.body.token}`).expect(200);
    });

    it("validates registration input", async () => {
      const bad = await request(app).post("/api/v1/auth/register").send({ email: "not-an-email", password: "short", businessName: "" }).expect(400);
      const paths = bad.body.issues.map((i: { path: string }) => i.path).sort();
      expect(paths).toEqual(["businessName", "email", "password"]);
    });

    it("rate limits repeated failed logins", async () => {
      const { email } = await registerMerchant();
      for (let i = 0; i < 10; i++) await request(app).post("/api/v1/auth/login").send({ email, password: "wrong-password" }).expect(401);
      const limited = await request(app).post("/api/v1/auth/login").send({ email, password: "wrong-password" }).expect(429);
      expect(limited.body.code).toBe("rate_limited");
    });

    it("expires sessions", async () => {
      const { token: t } = await registerMerchant();
      await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${t}`).expect(401);
      expect(res.body.code).toBe("session_expired");
    });

    it("changes the password and signs out other sessions", async () => {
      const m = await registerMerchant();
      const other = (await request(app).post("/api/v1/auth/login").send({ email: m.email, password: m.password }).expect(200)).body.token;
      await D("post", "/api/v1/auth/password", m.token).send({ currentPassword: "nope-nope", newPassword: "brand-new-pass" }).expect(400);
      await D("post", "/api/v1/auth/password", m.token).send({ currentPassword: m.password, newPassword: "brand-new-pass" }).expect(200);
      await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${other}`).expect(401);
      await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${m.token}`).expect(200);
      await request(app).post("/api/v1/auth/login").send({ email: m.email, password: m.password }).expect(401);
      await request(app).post("/api/v1/auth/login").send({ email: m.email, password: "brand-new-pass" }).expect(200);
    });

    it("can disable registration", async () => {
      build({ REGISTRATION_ENABLED: "false" });
      const res = await request(app).post("/api/v1/auth/register").send({ email: "late@example.com", password: "whatever12", businessName: "Late" }).expect(403);
      expect(res.body.code).toBe("registration_closed");
      expect((await request(app).get("/api/v1/config")).body.registrationEnabled).toBe(false);
    });

    it("rotates the per-merchant webhook secret", async () => {
      const first = (await D("get", "/api/v1/dashboard/webhook-secret").expect(200)).body.webhookSecret;
      const rotated = (await D("post", "/api/v1/dashboard/webhook-secret/rotate").expect(200)).body.webhookSecret;
      expect(rotated).not.toBe(first);
      expect((await D("get", "/api/v1/dashboard/webhook-secret")).body.webhookSecret).toBe(rotated);
    });
  });

  describe("merchant isolation", () => {
    it("keeps each merchant's data private", async () => {
      const a = await setupMerchant();
      const inv = await createInvoice(a);
      const b = await registerMerchant("Other store");
      const asB = (m: "get" | "post" | "put" | "patch" | "delete", path: string) => D(m, path, b.token);

      expect((await asB("get", "/api/v1/dashboard/products").expect(200)).body.products).toEqual([]);
      expect((await asB("get", "/api/v1/dashboard/invoices").expect(200)).body.invoices).toEqual([]);
      expect((await asB("get", "/api/v1/dashboard/api-keys").expect(200)).body.apiKeys).toEqual([]);
      expect((await asB("get", "/api/v1/dashboard/overview").expect(200)).body.totals.invoices).toBe(0);
      await asB("get", `/api/v1/dashboard/invoices/${inv.invoice_id}`).expect(404);
      await asB("post", `/api/v1/dashboard/invoices/${inv.invoice_id}/cancel`).expect(400);
      await asB("post", `/api/v1/dashboard/invoices/${inv.invoice_id}/resend-webhook`).expect(404);
      await asB("patch", `/api/v1/dashboard/products/${a.product.id}`).send({ name: "hijack" }).expect(404);
      await asB("delete", `/api/v1/dashboard/prices/${a.price.id}`).expect(404);
      await asB("post", `/api/v1/dashboard/products/${a.product.id}/prices`).send({ label: "x", amount: "1" }).expect(404);
      await asB("post", "/api/v1/dashboard/payment-links").send({ product_id: a.product.id, price_id: a.price.id }).expect(404);
      const aKeyId = (await D("get", "/api/v1/dashboard/api-keys")).body.apiKeys[0].id;
      await asB("delete", `/api/v1/dashboard/api-keys/${aKeyId}`).expect(404);

      // B's API key cannot use A's products or read A's invoices.
      const bKey = (await asB("post", "/api/v1/dashboard/api-keys").send({ label: "b" }).expect(201)).body.apiKey;
      await request(app).post("/api/v1/userApi/invoices").set("Authorization", `Bearer ${bKey}`).send({ product_id: a.product.id, price_id: a.price.id }).expect(404);
      await request(app).get(`/api/v1/userApi/invoices/${inv.invoice_id}`).set("Authorization", `Bearer ${bKey}`).expect(404);

      // Each merchant gets its own webhook secret.
      const sa = (await D("get", "/api/v1/dashboard/webhook-secret")).body.webhookSecret;
      const sb = (await asB("get", "/api/v1/dashboard/webhook-secret")).body.webhookSecret;
      expect(sa).not.toBe(sb);
      // A's product is untouched.
      expect((await D("get", "/api/v1/dashboard/products")).body.products[0].name).toBe("Pro plan");
    });
  });

  describe("upgrade from the single-merchant version", () => {
    it("lets the first account claim legacy data and keeps the old webhook secret", async () => {
      await prisma.$executeRawUnsafe(`TRUNCATE "Session", "Payment", "CheckoutSession", "Invoice", "Price", "Product", "ApiKey", "User" CASCADE`);
      // State left behind by the previous version (and its migration).
      await prisma.user.create({ data: { id: LEGACY_MERCHANT_ID, name: "My Store", pubKey: [], walletAddress: merchantWallet } });
      const product = await prisma.product.create({ data: { userId: LEGACY_MERCHANT_ID, name: "Legacy product" } });
      const { generateApiKey, hashApiKey } = await import("../src/lib/apiKeys.js");
      const legacyKey = generateApiKey();
      await prisma.apiKey.create({ data: { userId: LEGACY_MERCHANT_ID, keyHash: hashApiKey(legacyKey), label: "old" } });

      // Existing integrations keep working before anyone registers.
      const price = await prisma.price.create({ data: { productId: product.id, label: "x", amount: "0.1", currency: "SOL" } });
      await request(app).post("/api/v1/userApi/invoices").set("Authorization", `Bearer ${legacyKey}`).send({ product_id: product.id, price_id: price.id }).expect(201);

      const owner = await registerMerchant("Real Store", "owner@example.com");
      expect(owner.merchant.id).toBe(LEGACY_MERCHANT_ID);
      const products = (await D("get", "/api/v1/dashboard/products", owner.token)).body.products;
      expect(products.map((p: { name: string }) => p.name)).toEqual(["Legacy product"]);
      expect((await D("get", "/api/v1/dashboard/webhook-secret", owner.token)).body.webhookSecret).toBe("whsec_test");
      await request(app).post("/api/v1/userApi/invoices").set("Authorization", `Bearer ${legacyKey}`).send({ product_id: product.id, price_id: price.id }).expect(201);

      // Later accounts start empty.
      const second = await registerMerchant("Second");
      expect(second.merchant.id).not.toBe(LEGACY_MERCHANT_ID);
      expect((await D("get", "/api/v1/dashboard/products", second.token)).body.products).toEqual([]);
    });
  });
});
