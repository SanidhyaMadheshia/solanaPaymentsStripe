import type { Request, Response } from "express";
import { prisma } from "../db/src/prisma.js";
import crypto from "crypto";
import { createSolTransferTxn } from "../lib/solana.js";
// import { redis } from "../redis.js";

export async function initiateCheckout(req: Request, res: Response) {
  try {
    const invoiceId = req.params.invoiceId as string;

    // const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip;
    // const userAgent = req.headers["user-agent"];
    const walletAddress = req.headers["x-wallet-address"];

    console.log("headers :", );

    console.log(invoiceId, "invoiceId");
    if (!invoiceId) {
      return res.status(400).json({ message: "invoiceId required" });
    }

    // 1️⃣ Fetch  Invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      console.log("invoice ksdns", invoice)
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 2️⃣ Check invoice expiry
    // if (new Date() > invoice.expiresAt!) {
    //   return res.status(410).json({ message: "Invoice expired" });
    // }

    // 3️⃣ Check if there is an active/existing checkout session
    let existing = await prisma.checkoutSession.findFirst({
      where: {
        invoiceId,
        status: "PENDING", // active
      },
    });

    // 4️⃣ If session exists → wallet locking 
    if (existing) {
      if (existing.buyerWallet === walletAddress) {
        return res.json({
          status: "resumed",
          session : existing,
          invoice
        });
      }

      // Trying to open on another computer
      return res.status(403).json({
        status: "active_on_other_device",
        message: "Checkout already active on a different device",
      });
    }
    

    // 5️⃣ No session? → Create a new CheckoutSession
    const sessionKey = `cs_${crypto.randomBytes(16).toString("hex")}`;

    const txn = await  createSolTransferTxn({
      senPubKey : walletAddress as string,
      recPubKey : invoice.solAddress as string,
      amount : invoice.amount.toNumber() 
    });

    const newSession = await prisma.checkoutSession.create({
      data: {
        invoiceId,
        status: "PENDING", // not active until wallet is connected
        txHash  :  txn,
        buyerWallet : walletAddress?.toString()!,
        buyerEmail : invoice.buyerEmail,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      },
    });

    // 6️⃣ Save session in Redis for WS auth
    // await redis.set(`checkout:session:${sessionKey}`, JSON.stringify({
    //   invoiceId,
    //   sessionId: newSession.id,
    //   ipAddress: clientIp,
    //   status: "CREATED",
    // }), {
    //   EX: 15 * 60,
    // });

    return res.json({
      status: "created",
      session : newSession,
      invoice
    });

  } catch (err) {
    console.error("INIT CHECKOUT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
