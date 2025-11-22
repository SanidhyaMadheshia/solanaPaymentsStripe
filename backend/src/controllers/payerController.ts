import type { Request, Response } from "express";
import { prisma } from "../db/src/prisma.js";
import crypto from "crypto";
import { createSolTransferTxn } from "../lib/solana.js";
import type { RequestState } from "@clerk/backend/internal";
// import { redis } from "../redis.js";

export async function initiateCheckout(req: Request, res: Response) {
  try {
    const invoiceId = req.params.invoiceId as string;
    console.log("invoice Id : ", invoiceId);


    const walletAddress = req.headers["x-wallet-address"];
    console.log("headers :", );
    console.log(invoiceId, "invoiceId");
    if (!invoiceId) {
      return res.status(400).json({ message: "invoiceId required" });
    }
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      // console.log("invoice ksdns", invoice)
      return res.status(404).json({ message: "Invoice not found" });
    }
    let existing = await prisma.checkoutSession.findFirst({
      where: {
        invoiceId,
        status: "PENDING", 
      },
    });
    const txn = await  createSolTransferTxn({
      senPubKey : walletAddress as string,
      recPubKey : invoice.solAddress as string,
      amount : invoice.amount.toNumber() 
    });
    if (existing) {
      if (existing.buyerWallet === walletAddress) {
        const updatedBlockHash = await prisma.checkoutSession.update({
          where : {
            id : existing.id
          },
          data : {
            txHash : txn
          }
        }) 
        return res.json({
          status: "resumed",
          session : updatedBlockHash,
          invoice
        });
      }
      return res.status(403).json({
        status: "active_on_other_device",
        message: "Checkout already active on a different device",
      });
    }

    const sessionKey = `cs_${crypto.randomBytes(16).toString("hex")}`;

    // const txn = await  createSolTransferTxn({
    //   senPubKey : walletAddress as string,
    //   recPubKey : invoice.solAddress as string,
    //   amount : invoice.amount.toNumber() 
    // });

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



export async function updateSocket(req : Request , res : Response) {
  try {

    console.log(req.url);

     const invoiceId = req.params.invoiceId as string;

     const sessionId = req.body.sessionId ;

     const socketId = req.body.socketId;


    // const invoice = await prisma.invoice.findUnique({
    //   where: { id: invoiceId },
    // });

    
    // if(!invoice) {
    //   return res.status(404).json({ message: "not found" });
    // }
    console.log("in ceckput update ", invoiceId);
    console.log(socketId, sessionId);


    const session = await prisma.checkoutSession.findUnique({
      where : {
        id : sessionId,
        invoiceId : invoiceId
      }
    });


    if(!session ) {
        return res.status(404).json({ message: "session not found" });
    }

    const updatedSession = await prisma.checkoutSession.update({
      where : {
        id : sessionId
      }, 
      data : {
        socketid : socketId
      }
    });


    res.status(200).json({
      updatedSession 
    });
  
  } catch(err) {
   console.error("INIT CHECKOUT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}