import crypto from "node:crypto";

export interface WebhookPayload {
  event: "invoice.paid";
  invoiceId: string;
  paymentId: string;
  status: "PAID";
  amount: number;
  currency: string;
  txHash: string;
  productId: string | null;
  priceId: string | null;
  numberOfItems: number;
  buyerEmail: string | null;
  buyerWallet: string | null;
  paidAt: string;
}

/** Signature format: t=<unix seconds>,v1=<hex hmac of "<t>.<body>"> */
export function signWebhook(secret: string, body: string, timestamp: number): string {
  const mac = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${mac}`;
}

export function verifyWebhookSignature(secret: string, body: string, header: string, toleranceSec = 300, now = Date.now()): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t)) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = signWebhook(secret, body, t).split("v1=")[1]!;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Exponential backoff: 30s, 1m, 2m, 4m ... capped at 1h. */
export function nextRetryDelayMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 3_600_000);
}

export type WebhookSender = (url: string, body: string, headers: Record<string, string>) => Promise<{ status: number }>;

export const fetchWebhookSender: WebhookSender = async (url, body, headers) => {
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/json", "user-agent": "SolPay-Webhooks/2.0", ...headers },
    signal: AbortSignal.timeout(10_000),
    redirect: "manual",
  });
  // Drain the body so the socket can be reused.
  await res.arrayBuffer().catch(() => undefined);
  return { status: res.status };
};
