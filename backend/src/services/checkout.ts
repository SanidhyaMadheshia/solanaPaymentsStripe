import { Prisma, type CheckoutSession, type Invoice } from "@prisma/client";
import { badRequest, conflict, notFound } from "../lib/http.js";
import {
  buildCheckoutTransaction,
  decodeCheckoutTransaction,
  isValidPublicKey,
  lamportsToSol,
  solToLamports,
  verifyTransaction,
} from "../lib/solana.js";
import { nextRetryDelayMs, signWebhook, type WebhookPayload } from "../lib/webhooks.js";
import type { Deps } from "./merchant.js";

const sleepDefault = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Fields of an invoice that are safe to expose to the buyer on the hosted checkout. */
export function publicInvoice(invoice: Invoice, extra: { description?: string | null; merchantName?: string | null } = {}) {
  return {
    id: invoice.id,
    status: invoice.status,
    productName: invoice.productName,
    description: extra.description ?? null,
    merchantName: extra.merchantName ?? null,
    priceAmount: invoice.priceAmount?.toString() ?? null,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    numberOfItems: invoice.numberOfItems,
    solAddress: invoice.solAddress,
    buyerEmail: invoice.buyerEmail,
    successUrl: invoice.successUrl,
    cancelUrl: invoice.cancelUrl,
    expiresAt: invoice.expiresAt,
    paidAt: invoice.paidAt,
    txHash: invoice.txHash,
    createdAt: invoice.createdAt,
  };
}

export function publicSession(s: CheckoutSession) {
  return {
    id: s.id,
    status: s.status,
    buyerWallet: s.buyerWallet,
    txHash: s.unsignedTx, // unsigned base64 transaction (kept as `txHash` for API compatibility)
    txSignature: s.txSignature,
    verifyError: s.verifyError,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
  };
}

function platformFee(deps: Deps) {
  const { PLATFORM_FEE_ADDRESS, PLATFORM_FEE_LAMPORTS } = deps.config;
  return PLATFORM_FEE_ADDRESS && PLATFORM_FEE_LAMPORTS > 0
    ? { address: PLATFORM_FEE_ADDRESS, lamports: BigInt(PLATFORM_FEE_LAMPORTS) }
    : undefined;
}

async function loadInvoiceView(deps: Deps, invoiceId: string) {
  const invoice = await deps.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { user: true } });
  if (!invoice) throw notFound("Invoice not found");
  const product = invoice.productId
    ? await deps.prisma.product.findUnique({ where: { id: invoice.productId }, select: { description: true } })
    : null;
  return { invoice, extra: { description: product?.description ?? null, merchantName: invoice.user.name } };
}

/**
 * Lazily expires an unpaid invoice whose deadline has passed, unless a buyer has already
 * submitted a signature that is still being verified (their money may already be in flight).
 */
async function expireIfDue(deps: Deps, invoice: Invoice): Promise<Invoice> {
  if (invoice.status !== "PENDING" || !invoice.expiresAt || invoice.expiresAt > new Date()) return invoice;
  const verifying = await deps.prisma.checkoutSession.count({
    where: { invoiceId: invoice.id, status: "PENDING", txSignature: { not: null } },
  });
  if (verifying > 0) return invoice;
  await deps.prisma.invoice.updateMany({ where: { id: invoice.id, status: "PENDING" }, data: { status: "EXPIRED" } });
  await deps.prisma.checkoutSession.updateMany({ where: { invoiceId: invoice.id, status: "PENDING" }, data: { status: "EXPIRED" } });
  return { ...invoice, status: "EXPIRED" };
}

const ttlSeconds = (d: Date) => Math.max(0, Math.round((d.getTime() - Date.now()) / 1000));

/**
 * GET /invoice/:id — returns the invoice for display, and when a wallet address is supplied,
 * creates or resumes the buyer's checkout session. Only one wallet can hold an active session
 * per invoice at a time (enforced with a row lock on the invoice).
 */
export async function getOrStartCheckout(deps: Deps, invoiceId: string, wallet: string | undefined) {
  const view = await loadInvoiceView(deps, invoiceId);
  const invoice = await expireIfDue(deps, view.invoice);
  const base = { invoice: publicInvoice(invoice, view.extra) };

  if (invoice.status === "PAID") return { status: "paid" as const, ...base, session: null, ttl: 0 };
  if (invoice.status !== "PENDING") return { status: invoice.status.toLowerCase(), ...base, session: null, ttl: 0 };
  if (!wallet) return { status: "awaiting_wallet" as const, ...base, session: null, ttl: invoice.expiresAt ? ttlSeconds(invoice.expiresAt) : 0 };
  if (!isValidPublicKey(wallet)) throw badRequest("Invalid wallet address");
  if (!invoice.solAddress) throw badRequest("Invoice has no receiving address");

  // Network call happens before taking the lock.
  const recent = await deps.chain.getLatestBlockhash();
  const unsignedTx = buildCheckoutTransaction(
    { payer: wallet, recipient: invoice.solAddress, lamports: solToLamports(invoice.amount.toString()), platformFee: platformFee(deps) },
    recent,
  );

  const now = new Date();
  const sessionTtlMs = deps.config.SESSION_TTL_MINUTES * 60_000;

  const result = await deps.prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
    const active = await tx.checkoutSession.findFirst({
      where: { invoiceId, status: "PENDING", OR: [{ expiresAt: { gt: now } }, { txSignature: { not: null } }] },
      orderBy: { createdAt: "desc" },
    });

    if (active && active.buyerWallet !== wallet) {
      return { kind: "busy" as const, ttl: ttlSeconds(active.expiresAt) };
    }
    if (active?.txSignature) {
      return { kind: "verifying" as const, session: active };
    }
    if (active) {
      const session = await tx.checkoutSession.update({
        where: { id: active.id },
        data: { unsignedTx, expiresAt: new Date(now.getTime() + sessionTtlMs) },
      });
      return { kind: "resumed" as const, session };
    }
    // Expire stale sessions for this invoice, then open a new one.
    await tx.checkoutSession.updateMany({ where: { invoiceId, status: "PENDING", txSignature: null }, data: { status: "EXPIRED" } });
    const session = await tx.checkoutSession.create({
      data: {
        invoiceId,
        buyerWallet: wallet,
        buyerEmail: invoice.buyerEmail,
        unsignedTx,
        expiresAt: new Date(now.getTime() + sessionTtlMs),
      },
    });
    return { kind: "created" as const, session };
  });

  if (result.kind === "busy") {
    throw conflict("Checkout is already in progress from a different wallet. Try again when it expires.", {
      status: "active_on_other_device",
      ttl: result.ttl,
    });
  }
  return { status: result.kind, ...base, session: publicSession(result.session), ttl: ttlSeconds(result.session.expiresAt) };
}

/** POST /invoice/:id/confirm — the buyer's wallet broadcast the transaction; start verification. */
export async function submitSignature(deps: Deps, invoiceId: string, sessionId: string, signature: string) {
  const session = await deps.prisma.checkoutSession.findFirst({ where: { id: sessionId, invoiceId } });
  if (!session) throw notFound("Checkout session not found");
  if (session.status === "COMPLETED") return { status: "paid" as const };
  if (session.status !== "PENDING") throw conflict(`Checkout session is ${session.status.toLowerCase()}`);
  if (session.txSignature && session.txSignature !== signature) throw conflict("A different signature was already submitted");

  if (!session.txSignature) {
    try {
      await deps.prisma.checkoutSession.update({
        where: { id: session.id },
        data: { txSignature: signature, submittedAt: new Date(), verifyError: null },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw conflict("This transaction signature was already used");
      }
      throw e;
    }
  }
  void verifySession(deps, session.id).catch((err) => console.error(`verifySession(${session.id}) failed:`, err));
  return { status: "verifying" as const };
}

export async function getCheckoutStatus(deps: Deps, invoiceId: string, sessionId?: string) {
  const invoice = await deps.prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw notFound("Invoice not found");
  const session = sessionId
    ? await deps.prisma.checkoutSession.findFirst({ where: { id: sessionId, invoiceId } })
    : null;
  return {
    invoiceStatus: invoice.status,
    txHash: invoice.txHash,
    successUrl: invoice.status === "PAID" ? invoice.successUrl : null,
    session: session ? { id: session.id, status: session.status, verifyError: session.verifyError, txSignature: session.txSignature } : null,
  };
}

const inFlight = new Set<string>();

function commitmentReached(required: "confirmed" | "finalized", actual?: string) {
  if (required === "finalized") return actual === "finalized";
  return actual === "confirmed" || actual === "finalized";
}

/** Polls the chain for a submitted signature, verifies the transfers and settles the invoice. */
export async function verifySession(deps: Deps, sessionId: string): Promise<"paid" | "failed" | "skipped"> {
  if (inFlight.has(sessionId)) return "skipped";
  inFlight.add(sessionId);
  try {
    const session = await deps.prisma.checkoutSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "PENDING" || !session.txSignature) return "skipped";
    const signature = session.txSignature;
    const sleep = deps.sleep ?? sleepDefault;
    const interval = deps.pollIntervalMs ?? 2_000;
    const deadline = (session.submittedAt ?? new Date()).getTime() + deps.config.VERIFY_TIMEOUT_SECONDS * 1000;

    const fail = async (reason: string) => {
      await deps.prisma.checkoutSession.update({ where: { id: session.id }, data: { status: "FAILED", verifyError: reason } });
      return "failed" as const;
    };

    while (true) {
      let status: Awaited<ReturnType<Deps["chain"]["getSignatureStatus"]>> = null;
      try {
        status = await deps.chain.getSignatureStatus(signature);
      } catch (err) {
        console.warn(`RPC error while checking ${signature}:`, (err as Error).message);
      }
      if (status?.err) return fail("Transaction failed on-chain");
      if (status && commitmentReached(deps.config.SOLANA_COMMITMENT, status.confirmationStatus)) {
        const txn = await deps.chain.getParsedTransaction(signature);
        if (txn) {
          const expected = decodeCheckoutTransaction(session.unsignedTx).transfers;
          const result = verifyTransaction(txn, expected, { payer: session.buyerWallet, notBefore: session.createdAt });
          if (!result.ok) return fail(result.reason);
          const merchantTransfer = expected[0]!;
          await settle(deps, session, signature, lamportsToSol(merchantTransfer.lamports));
          return "paid";
        }
      }
      if (Date.now() > deadline) return fail("Transaction was not confirmed in time");
      await sleep(interval);
    }
  } finally {
    inFlight.delete(sessionId);
  }
}

async function settle(deps: Deps, session: CheckoutSession, signature: string, amountSol: string) {
  const now = new Date();
  await deps.prisma.$transaction(async (tx) => {
    await tx.invoice.updateMany({
      where: { id: session.invoiceId, status: { in: ["PENDING", "EXPIRED"] } },
      data: { status: "PAID", paidAt: now, txHash: signature, buyerWallet: session.buyerWallet, webhookNextAttemptAt: now },
    });
    await tx.payment.upsert({
      where: { txHash: signature },
      update: {},
      create: { invoiceId: session.invoiceId, txHash: signature, amount: amountSol, status: "CONFIRMED", confirmedAt: now },
    });
    await tx.checkoutSession.update({ where: { id: session.id }, data: { status: "COMPLETED", completedAt: now, verifyError: null } });
  });
  void deliverWebhook(deps, session.invoiceId).catch((err) => console.error("deliverWebhook failed:", err));
}

/**
 * Delivers the invoice.paid webhook once (at-least-once semantics). A short lease on
 * webhookNextAttemptAt keeps concurrent workers from sending the same event in parallel.
 */
export async function deliverWebhook(deps: Deps, invoiceId: string): Promise<"delivered" | "failed" | "skipped"> {
  const now = new Date();
  const claimed = await deps.prisma.invoice.updateMany({
    where: {
      id: invoiceId,
      status: "PAID",
      webhookUrl: { not: null },
      webhookDeliveredAt: null,
      webhookNextAttemptAt: { lte: now },
      webhookAttempts: { lt: deps.config.WEBHOOK_MAX_ATTEMPTS },
    },
    data: { webhookNextAttemptAt: new Date(now.getTime() + 5 * 60_000) },
  });
  if (claimed.count === 0) return "skipped";

  const invoice = await deps.prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: { orderBy: { detectedAt: "asc" }, take: 1 }, user: { select: { webhookSecret: true } } },
  });
  const payment = invoice.payments[0];
  const payload: WebhookPayload = {
    event: "invoice.paid",
    invoiceId: invoice.id,
    paymentId: payment?.id ?? "",
    status: "PAID",
    amount: Number(invoice.amount.toString()),
    currency: invoice.currency,
    txHash: invoice.txHash ?? payment?.txHash ?? "",
    productId: invoice.productId,
    priceId: invoice.priceId,
    numberOfItems: invoice.numberOfItems,
    buyerEmail: invoice.buyerEmail,
    buyerWallet: invoice.buyerWallet,
    paidAt: (invoice.paidAt ?? now).toISOString(),
  };
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = { "x-solpay-event": payload.event, "x-solpay-timestamp": String(ts) };
  // Each merchant signs with its own secret (legacy fallback: global WEBHOOK_SECRET).
  const secret = invoice.user.webhookSecret ?? deps.config.WEBHOOK_SECRET;
  if (secret) headers["x-solpay-signature"] = signWebhook(secret, body, ts);

  const attempt = invoice.webhookAttempts + 1;
  let error: string | null = null;
  try {
    const res = await deps.sendWebhook(invoice.webhookUrl!, body, headers);
    if (res.status < 200 || res.status >= 300) error = `HTTP ${res.status}`;
  } catch (err) {
    error = (err as Error).message || "Request failed";
  }

  if (!error) {
    await deps.prisma.invoice.update({
      where: { id: invoiceId },
      data: { webhookAttempts: attempt, webhookDeliveredAt: new Date(), webhookLastError: null, webhookNextAttemptAt: null },
    });
    return "delivered";
  }
  const giveUp = attempt >= deps.config.WEBHOOK_MAX_ATTEMPTS;
  await deps.prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      webhookAttempts: attempt,
      webhookLastError: error.slice(0, 500),
      webhookNextAttemptAt: giveUp ? null : new Date(Date.now() + nextRetryDelayMs(attempt)),
    },
  });
  return "failed";
}

/** Re-queues a webhook (dashboard "resend"). */
export async function requeueWebhook(deps: Deps, merchantId: string, invoiceId: string) {
  const invoice = await deps.prisma.invoice.findFirst({ where: { id: invoiceId, userId: merchantId } });
  if (!invoice) throw notFound("Invoice not found");
  if (invoice.status !== "PAID") throw badRequest("Only paid invoices have webhooks");
  if (!invoice.webhookUrl) throw badRequest("Invoice has no webhook URL");
  await deps.prisma.invoice.update({
    where: { id: invoiceId },
    data: { webhookDeliveredAt: null, webhookAttempts: 0, webhookNextAttemptAt: new Date(), webhookLastError: null },
  });
  return deliverWebhook(deps, invoiceId);
}

/** Background loop: resumes verification after restarts and retries failed webhooks. */
export function startWorkers(deps: Deps, intervalMs = 15_000) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const sessions = await deps.prisma.checkoutSession.findMany({
        where: { status: "PENDING", txSignature: { not: null } },
        select: { id: true },
        take: 50,
      });
      for (const s of sessions) void verifySession(deps, s.id).catch((e) => console.error("worker verify:", e));

      const due = await deps.prisma.invoice.findMany({
        where: {
          status: "PAID",
          webhookUrl: { not: null },
          webhookDeliveredAt: null,
          webhookNextAttemptAt: { lte: new Date() },
          webhookAttempts: { lt: deps.config.WEBHOOK_MAX_ATTEMPTS },
        },
        select: { id: true },
        take: 50,
      });
      for (const inv of due) await deliverWebhook(deps, inv.id).catch((e) => console.error("worker webhook:", e));
    } catch (err) {
      console.error("Worker tick failed:", err);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
