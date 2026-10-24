import { Prisma, type InvoiceStatus } from "@prisma/client";
import { Router, type Request } from "express";
import { z } from "zod";
import { displayPrefix, generateApiKey, hashApiKey } from "../lib/apiKeys.js";
import { badRequest, notFound } from "../lib/http.js";
import { merchantIdOf, sessionAuth } from "../middlewares/auth.js";
import { generateWebhookSecret } from "../lib/passwords.js";
import { merchantView } from "../services/auth.js";
import { requeueWebhook } from "../services/checkout.js";
import { CreateInvoiceSchema, createInvoice, httpUrl, solanaAddress } from "../services/invoices.js";
import { getMerchant, type Deps } from "../services/merchant.js";

const SettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  walletAddress: z.union([solanaAddress, z.literal("")]).optional(),
  defaultWebhookUrl: z.union([httpUrl, z.literal("")]).optional(),
});

const ProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  image: z.union([httpUrl, z.literal("")]).optional(),
});
const ProductUpdateSchema = ProductSchema.partial().extend({ active: z.boolean().optional() });

const PriceSchema = z.object({
  label: z.string().trim().min(1).max(100),
  amount: z.union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => /^\d+(\.\d{1,8})?$/.test(v) && Number(v) > 0, "Amount must be a positive number with up to 8 decimals"),
});

const ApiKeySchema = z.object({ label: z.string().trim().min(1).max(100) });

const InvoiceListQuery = z.object({
  status: z.enum(["PENDING", "PAID", "EXPIRED", "CANCELLED"]).optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

const PaymentLinkSchema = CreateInvoiceSchema.pick({ product_id: true, price_id: true, buyer_email: true, numberOfItems: true, success_url: true });

function apiKeyView(k: { id: string; label: string | null; prefix: string | null; revoked: boolean; createdAt: Date; lastUsedAt: Date | null }) {
  return { id: k.id, label: k.label, prefix: k.prefix ?? "sk_••••••", revoked: k.revoked, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt };
}

/** Dashboard API, scoped to the logged-in merchant. */
export function dashboardRouter(deps: Deps) {
  const r = Router();
  const { prisma } = deps;
  r.use(sessionAuth(deps));
  const mid = (req: Request) => merchantIdOf(req);

  // ---- Overview ---------------------------------------------------------
  r.get("/overview", async (req, res) => {
    const merchantId = mid(req);
    const where = { userId: merchantId };
    const [merchant, byStatus, revenue, recent, daily, productCount, keyCount] = await Promise.all([
      getMerchant(deps, merchantId),
      prisma.invoice.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.payment.aggregate({ where: { status: "CONFIRMED", invoice: where }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.$queryRaw<{ day: Date; total: Prisma.Decimal; count: bigint }[]>`
        SELECT date_trunc('day', p."confirmedAt") AS day, SUM(p.amount) AS total, COUNT(*) AS count
        FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE p.status = 'CONFIRMED' AND i."userId" = ${merchantId}
          AND p."confirmedAt" >= date_trunc('day', now()) - interval '13 days'
        GROUP BY 1 ORDER BY 1`,
      prisma.product.count({ where: { ...where, active: true } }),
      prisma.apiKey.count({ where: { ...where, revoked: false } }),
    ]);

    const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<InvoiceStatus, number>>;
    const totalInvoices = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
    const days: { date: string; total: string; count: number }[] = [];
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(start.getTime() - i * 86_400_000);
      const row = daily.find((x) => new Date(x.day).toISOString().slice(0, 10) === d.toISOString().slice(0, 10));
      days.push({ date: d.toISOString().slice(0, 10), total: row ? row.total.toString() : "0", count: row ? Number(row.count) : 0 });
    }

    res.json({
      merchant: { name: merchant.name, walletAddress: merchant.walletAddress },
      setup: {
        hasWallet: Boolean(merchant.walletAddress),
        hasProduct: productCount > 0,
        hasApiKey: keyCount > 0,
        hasPayment: (revenue._count._all ?? 0) > 0,
      },
      totals: {
        revenue: revenue._sum.amount?.toString() ?? "0",
        payments: revenue._count._all,
        invoices: totalInvoices,
        paid: counts.PAID ?? 0,
        pending: counts.PENDING ?? 0,
        expired: counts.EXPIRED ?? 0,
        conversion: totalInvoices ? (counts.PAID ?? 0) / totalInvoices : 0,
      },
      daily: days,
      recentInvoices: recent,
    });
  });

  // ---- Settings ---------------------------------------------------------
  r.get("/settings", async (req, res) => {
    res.json(merchantView(await getMerchant(deps, mid(req))));
  });
  r.put("/settings", async (req, res) => {
    const input = SettingsSchema.parse(req.body);
    const blankToNull = (v: string) => (v === "" ? null : v);
    const merchant = await prisma.user.update({
      where: { id: mid(req) },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.walletAddress !== undefined && { walletAddress: blankToNull(input.walletAddress) }),
        ...(input.defaultWebhookUrl !== undefined && { defaultWebhookUrl: blankToNull(input.defaultWebhookUrl) }),
      },
    });
    res.json(merchantView(merchant));
  });

  // ---- Webhook signing secret (per merchant) ----------------------------
  r.get("/webhook-secret", async (req, res) => {
    const m = await getMerchant(deps, mid(req));
    let secret = m.webhookSecret;
    if (!secret) {
      secret = generateWebhookSecret();
      await prisma.user.update({ where: { id: m.id }, data: { webhookSecret: secret } });
    }
    res.json({ webhookSecret: secret });
  });
  r.post("/webhook-secret/rotate", async (req, res) => {
    const webhookSecret = generateWebhookSecret();
    await prisma.user.update({ where: { id: mid(req) }, data: { webhookSecret } });
    res.json({ webhookSecret });
  });

  // ---- Products & prices -----------------------------------------------
  r.get("/products", async (req, res) => {
    const products = await prisma.product.findMany({
      where: { userId: mid(req) },
      include: { prices: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products });
  });
  r.post("/products", async (req, res) => {
    const input = ProductSchema.parse(req.body);
    const product = await prisma.product.create({
      data: { userId: mid(req), name: input.name, description: input.description || null, image: input.image || null },
      include: { prices: true },
    });
    res.status(201).json(product);
  });
  r.patch("/products/:id", async (req, res) => {
    const input = ProductUpdateSchema.parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, userId: mid(req) } });
    if (!existing) throw notFound("Product not found");
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description || null }),
        ...(input.image !== undefined && { image: input.image || null }),
        ...(input.active !== undefined && { active: input.active }),
      },
      include: { prices: { orderBy: { createdAt: "asc" } } },
    });
    res.json(product);
  });
  r.delete("/products/:id", async (req, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, userId: mid(req) } });
    if (!existing) throw notFound("Product not found");
    // Invoices keep a snapshot of the product name/price, so deleting is safe.
    await prisma.product.delete({ where: { id: existing.id } });
    res.status(204).end();
  });
  r.post("/products/:id/prices", async (req, res) => {
    const input = PriceSchema.parse(req.body);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, userId: mid(req) } });
    if (!product) throw notFound("Product not found");
    const price = await prisma.price.create({ data: { productId: product.id, label: input.label, amount: input.amount, currency: "SOL" } });
    res.status(201).json(price);
  });
  r.patch("/prices/:id", async (req, res) => {
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    const price = await prisma.price.findFirst({ where: { id: req.params.id, product: { userId: mid(req) } } });
    if (!price) throw notFound("Price not found");
    res.json(await prisma.price.update({ where: { id: price.id }, data: { active } }));
  });
  r.delete("/prices/:id", async (req, res) => {
    const price = await prisma.price.findFirst({ where: { id: req.params.id, product: { userId: mid(req) } } });
    if (!price) throw notFound("Price not found");
    await prisma.price.delete({ where: { id: price.id } });
    res.status(204).end();
  });

  // ---- API keys ---------------------------------------------------------
  r.get("/api-keys", async (req, res) => {
    const keys = await prisma.apiKey.findMany({ where: { userId: mid(req) }, orderBy: { createdAt: "desc" } });
    res.json({ apiKeys: keys.map(apiKeyView) });
  });
  r.post("/api-keys", async (req, res) => {
    const { label } = ApiKeySchema.parse(req.body);
    const secret = generateApiKey();
    const key = await prisma.apiKey.create({
      data: { userId: mid(req), label, keyHash: hashApiKey(secret), prefix: displayPrefix(secret) },
    });
    // The plaintext key is returned exactly once.
    res.status(201).json({ apiKey: secret, key: apiKeyView(key) });
  });
  r.delete("/api-keys/:id", async (req, res) => {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: mid(req) } });
    if (!key) throw notFound("API key not found");
    await prisma.apiKey.update({ where: { id: key.id }, data: { revoked: true } });
    res.status(204).end();
  });

  // ---- Invoices / payments ---------------------------------------------
  r.get("/invoices", async (req, res) => {
    const q = InvoiceListQuery.parse(req.query);
    const where: Prisma.InvoiceWhereInput = {
      userId: mid(req),
      ...(q.status && { status: q.status }),
      ...(q.q && {
        OR: [
          { id: { contains: q.q } },
          { productName: { contains: q.q, mode: "insensitive" } },
          { buyerEmail: { contains: q.q, mode: "insensitive" } },
          { txHash: { contains: q.q } },
        ],
      }),
    };
    const rows = await prisma.invoice.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: q.limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });
    const hasMore = rows.length > q.limit;
    const invoices = hasMore ? rows.slice(0, q.limit) : rows;
    res.json({ invoices, nextCursor: hasMore ? invoices[invoices.length - 1]!.id : null });
  });
  r.get("/invoices/:id", async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: mid(req) },
      include: {
        payments: true,
        sessions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, buyerWallet: true, txSignature: true, verifyError: true, createdAt: true, expiresAt: true, completedAt: true },
        },
      },
    });
    if (!invoice) throw notFound("Invoice not found");
    res.json({ ...invoice, checkoutUrl: `${deps.config.PUBLIC_APP_URL}/checkout/${invoice.id}` });
  });
  r.post("/invoices/:id/resend-webhook", async (req, res) => {
    const result = await requeueWebhook(deps, mid(req), req.params.id);
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: req.params.id } });
    res.json({ result, webhookDeliveredAt: invoice.webhookDeliveredAt, webhookLastError: invoice.webhookLastError, webhookAttempts: invoice.webhookAttempts });
  });
  r.post("/invoices/:id/cancel", async (req, res) => {
    const updated = await prisma.invoice.updateMany({
      where: { id: req.params.id, userId: mid(req), status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) throw badRequest("Only pending invoices can be cancelled");
    await prisma.checkoutSession.updateMany({ where: { invoiceId: req.params.id, status: "PENDING", txSignature: null }, data: { status: "CANCELLED" } });
    res.json({ status: "CANCELLED" });
  });

  // Payment link: create an invoice straight from the dashboard (no API key needed).
  r.post("/payment-links", async (req, res) => {
    const input = PaymentLinkSchema.parse(req.body);
    res.status(201).json(await createInvoice(deps, mid(req), { ...input, numberOfItems: input.numberOfItems ?? 1 }));
  });

  return r;
}
