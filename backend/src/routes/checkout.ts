import { Router } from "express";
import { z } from "zod";
import { getCheckoutStatus, getOrStartCheckout, submitSignature } from "../services/checkout.js";
import { notFound } from "../lib/http.js";
import type { Deps } from "../services/merchant.js";

const ConfirmSchema = z.object({
  sessionId: z.string().min(1),
  // base58 ed25519 signature: 64 bytes => 86-88 chars
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/, "Invalid transaction signature"),
});

/** Public endpoints used by the hosted checkout page. */
export function checkoutRouter(deps: Deps) {
  const r = Router();

  r.get("/:invoiceId", async (req, res) => {
    const wallet = req.header("x-wallet-address")?.trim() || undefined;
    res.json(await getOrStartCheckout(deps, req.params.invoiceId, wallet));
  });

  r.post("/:invoiceId/confirm", async (req, res) => {
    const body = ConfirmSchema.parse(req.body);
    res.status(202).json(await submitSignature(deps, req.params.invoiceId, body.sessionId, body.signature));
  });

  r.get("/:invoiceId/status", async (req, res) => {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
    res.json(await getCheckoutStatus(deps, req.params.invoiceId, sessionId));
  });

  // Used by the success page.
  r.get("/txnSignature/:invoiceId", async (req, res) => {
    const invoice = await deps.prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!invoice || invoice.status !== "PAID" || !invoice.txHash) throw notFound("No confirmed payment for this invoice");
    res.json({
      txnSignature: invoice.txHash,
      successUrl: invoice.successUrl,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      productName: invoice.productName,
      numberOfItems: invoice.numberOfItems,
      paidAt: invoice.paidAt,
      cluster: deps.config.SOLANA_CLUSTER,
    });
  });

  return r;
}
