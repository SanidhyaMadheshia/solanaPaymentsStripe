import type { Request, Response } from "express";
import { prisma } from "../db/src/prisma.js";
import crypto from "crypto";
import { createSolTransferTxn } from "../lib/solana.js";
import type { RequestState } from "@clerk/backend/internal";
// import client from "../lib/redis.js";
// import RedisClient from "../lib/redis.js";
import { RedisClient } from "../index.js";
// import { redis } from "../redis.js";

export async function initiateCheckout(req: Request, res: Response) {
  try {
    // await RedisClient.connect();
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
    const txn = await  createSolTransferTxn({
      senPubKey : walletAddress as string,
      recPubKey : invoice.solAddress as string,
      amount : invoice.amount.toNumber() 
    });

    
    const sessionId = await RedisClient.get(invoiceId);// <----- redis call 

    if(sessionId) {
      let existing = await prisma.checkoutSession.findFirst({
        where: {
          invoiceId,
          id : sessionId,
          
          status: "PENDING", 
        },
      });

      
      if (existing && existing.buyerWallet === walletAddress) {
        const ttl = await RedisClient.ttl(invoiceId);
        console.log("existing session found :", existing.id);
        console.log("resuming session :", existing.id);
        const updatedBlockHash = await prisma.checkoutSession.update({
          where : {
            id : existing.id
          },
          data : {
            txHash : txn
          }
        }) 
        // await RedisClient.disconnect();
        return res.json({
          status: "resumed",
          session : updatedBlockHash,
          invoice , 
          ttl 
          
        });
      }
      if(existing) {
        const ttl = await RedisClient.ttl(invoiceId);

        // await RedisClient.disconnect();
        return res.status(204).json({
          status: "active_on_other_device",
          message: "Checkout already active on a different device",
          ttl 
        });
      }
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
    const session = await RedisClient.set(invoiceId , newSession.id, 'EX', 5 * 60);
    const ttl = await RedisClient.ttl(invoiceId);
    console.log("new session created :", newSession.id);
    // await RedisClient.disconnect();

    return res.json({
      status: "created",
      session : newSession,
      invoice ,
      ttl : ttl
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
    const redisSessionId = await RedisClient.get(invoiceId);

    if(redisSessionId && redisSessionId === sessionId) {

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
    }
  
  } catch(err) {
   console.error("INIT CHECKOUT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}