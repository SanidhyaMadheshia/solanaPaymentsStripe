// Minimal SolPay client: create/retrieve invoices and verify webhook signatures.
import crypto from "node:crypto";

export class SolPayError extends Error {
  constructor(status, body) {
    super(body?.message ?? `SolPay API error (${status})`);
    this.status = status;
    this.body = body;
  }
}

export function createSolPayClient({ apiUrl, secretKey, fetchImpl = fetch }) {
  const base = apiUrl.replace(/\/+$/, "") + "/api/v1/userApi";

  async function call(method, path, body) {
    const res = await fetchImpl(base + path, {
      method,
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new SolPayError(res.status, data);
    return data;
  }

  return {
    /** Returns { invoice_id, checkout_url, amount, currency, expires_at, ... } */
    createInvoice: (params) => call("POST", "/invoices", params),
    /** Returns { invoice_id, status, amount, tx_hash, paid_at, ... } */
    getInvoice: (invoiceId) => call("GET", `/invoices/${encodeURIComponent(invoiceId)}`),
  };
}

/**
 * Verifies `X-SolPay-Signature: t=<unix>,v1=<hex hmac-sha256 of "<t>.<rawBody>">`.
 * Rejects stale timestamps to block replays.
 */
export function verifySolPaySignature(secret, rawBody, header, { toleranceSec = 300, now = Date.now() } = {}) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    String(header)
      .split(",")
      .map((p) => p.trim().split("=")),
  );
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t)) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
