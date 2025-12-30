import type { Response } from "express";
import { prisma } from "../db/src/prisma.js";
import type { CustomApiRequest } from "../middlewares/apiKeyAuth.js";

export async function createSessionUrl(req: CustomApiRequest, res: Response) {
  try {
    const {
      product_id,
      price_id,
      buyer_email,
      success_url,
      cancel_url,
      webhook_url,
      numberOfItems,
      solAddress
    } = req.body;

    if (!product_id || !price_id || !buyer_email || !success_url || !cancel_url || !webhook_url) {
      return res.status(400).json({ message: "Missing required parameters." });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: product_id,
        userId: req.apiKey!.userId,
        prices: { some: { id: price_id } },
      },
      include: { prices: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product or price not found." });
    }

    const priceObj = product.prices.find((p : {
      id : string;
    }) => p.id === price_id);

    const invoice = await prisma.invoice.create({
      data: {
        userId: req.apiKey!.userId,
        productId: product.id,
        productName: product.name,
        priceId: priceObj!.id,
        priceAmount: priceObj!.amount,
        currency: priceObj!.currency,
        successUrl : success_url,
        cancelUrl : cancel_url,
        buyerEmail : buyer_email,
        solAddress : solAddress,
        amount: priceObj!.amount.toNumber() * numberOfItems,
        numberOfItems,
        webhookUrl: webhook_url,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return res.status(200).json({
      message: "Invoice created. Redirect customer to checkout.",
      invoice_id: invoice.id,
      checkout_url: `https://yourgateway.com/checkout/${invoice.id}`,
      amount: invoice.amount,
      currency: invoice.currency,
      expires_at: invoice.expiresAt,
    });

  } catch (err) {
    console.error("Error creating invoice:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}
