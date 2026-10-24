import { Prisma } from "@prisma/client";
import { z } from "zod";
import { badRequest, notFound } from "../lib/http.js";
import { isValidPublicKey } from "../lib/solana.js";
import { getMerchant, type Deps } from "./merchant.js";

/** Only http(s) URLs are accepted; this blocks javascript:/data: URLs from reaching redirect links. */
export const httpUrl = z
  .string()
  .trim()
  .url()
  // zod runs refinements even after .url() fails, so this must not throw on invalid input.
  .refine((u) => {
    try {
      return /^https?:$/.test(new URL(u).protocol);
    } catch {
      return false;
    }
  }, "Must be an http(s) URL");

export const solanaAddress = z.string().trim().refine(isValidPublicKey, "Invalid Solana address");

export const CreateInvoiceSchema = z.object({
  product_id: z.string().min(1),
  price_id: z.string().min(1),
  buyer_email: z.string().trim().email().optional(),
  success_url: httpUrl.optional(),
  cancel_url: httpUrl.optional(),
  webhook_url: httpUrl.optional(),
  solAddress: solanaAddress.optional(),
  numberOfItems: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export async function createInvoice(deps: Deps, merchantId: string, input: CreateInvoiceInput) {
  const merchant = await getMerchant(deps, merchantId);
  const product = await deps.prisma.product.findFirst({
    where: { id: input.product_id, userId: merchantId },
    include: { prices: { where: { id: input.price_id } } },
  });
  const price = product?.prices[0];
  if (!product || !price) throw notFound("Product or price not found");
  if (!product.active || !price.active) throw badRequest("Product or price is archived");

  const solAddress = input.solAddress ?? merchant.walletAddress ?? undefined;
  if (!solAddress) {
    throw badRequest("No receiving wallet: pass solAddress or set a receiving wallet in dashboard Settings");
  }

  const amount = new Prisma.Decimal(price.amount).mul(input.numberOfItems);
  const expiresAt = new Date(Date.now() + deps.config.INVOICE_TTL_MINUTES * 60_000);
  const invoice = await deps.prisma.invoice.create({
    data: {
      userId: merchantId,
      productId: product.id,
      productName: product.name,
      priceId: price.id,
      priceAmount: price.amount,
      currency: price.currency,
      successUrl: input.success_url ?? null,
      cancelUrl: input.cancel_url ?? null,
      buyerEmail: input.buyer_email ?? null,
      solAddress,
      amount,
      numberOfItems: input.numberOfItems,
      webhookUrl: input.webhook_url ?? merchant.defaultWebhookUrl ?? null,
      expiresAt,
    },
  });

  return {
    message: "Invoice created. Redirect customer to checkout.",
    invoice_id: invoice.id,
    checkout_url: `${deps.config.PUBLIC_APP_URL}/checkout/${invoice.id}`,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    status: invoice.status,
    expires_at: invoice.expiresAt,
  };
}

export async function getInvoiceForMerchant(deps: Deps, merchantId: string, invoiceId: string) {
  const invoice = await deps.prisma.invoice.findFirst({
    where: { id: invoiceId, userId: merchantId },
    include: { payments: true },
  });
  if (!invoice) throw notFound("Invoice not found");
  return {
    invoice_id: invoice.id,
    status: invoice.status,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    product_id: invoice.productId,
    price_id: invoice.priceId,
    number_of_items: invoice.numberOfItems,
    buyer_email: invoice.buyerEmail,
    buyer_wallet: invoice.buyerWallet,
    tx_hash: invoice.txHash,
    paid_at: invoice.paidAt,
    expires_at: invoice.expiresAt,
    created_at: invoice.createdAt,
    checkout_url: `${deps.config.PUBLIC_APP_URL}/checkout/${invoice.id}`,
  };
}
