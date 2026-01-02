import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { prisma } from "../db/src/prisma.js";
import { verify } from "crypto";
import { verifyPayment } from "./solana.js";
import axios from "axios";

let io: Server | null = null;

export const initSocket = (server: HTTPServer): void => {
  io = new Server(server, {
    path: "/ws/",
    cors: {
      origin: "*", // You can specify frontend origin
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on("Client:checkInvoice", (invoice: string) => {
      console.log(`Checking invoice: ${invoice}`);
    })
    socket.on("message", (data: any) => {
      console.log("Received message:", data);
      io?.emit("message", data);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
    socket.on("payment:initiate", (invoiceId: string) => {
      console.log(`Payment initiated for invoiceId: ${invoiceId}`);
    })
    socket.on("payment:done", (signature: string) => {
      console.log("payment done for ", signature);

    })
    socket.on("Client:PaymentDone", paymentDone);


  });

  console.log("Socket.IO initialized");
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket() first.");
  }
  return io;
};

async function paymentDone({
  txnSignature,
  sessionId,
  SocketId
}: {
  txnSignature: string,
  sessionId: string | undefined,
  SocketId: string
}) {

  if (!txnSignature || !sessionId || !SocketId) {
    console.log("insufficient parameter");
    return;
  }

  console.log("Verifying payment", { txnSignature, sessionId, SocketId });

  const session = await prisma.checkoutSession.findFirst({
    where: {
      id: sessionId,
      socketid: SocketId
    }
  });

  if (!session) {
    console.log("Session not found");
    return;
  }

  try {
    
    console.log("Calling verifyPayment with:", { sessionId, txnSignature, socketId: SocketId });
    
    const result = await verifyPayment({
      sessionId,
      txnSignature,
      socketId: SocketId
    });

    if (result.success) {
      console.log("Payment verified successfully.");

      // Emit back to the correct client
      const invoice = await prisma.invoice.update({
        where : {
          id : session.invoiceId
        },
        data : {
          status : "PAID"
        }
      });
      
      const payment = await prisma.payment.create({
        data : {
          invoiceId : session.invoiceId,
          txHash : txnSignature,
          status : "CONFIRMED",
          amount : result.amount!
        } 
      });


      console.log("payment done");
      const payload = {
        invoiceId: invoice.id,
        paymentId: payment.id,
        status: "PAID",
        amount: result.amount,
        txHash: txnSignature
      };
      console.log("Sending webhook to:", invoice.webhookUrl, "with payload:", payload);
      const res = await axios.post(invoice.webhookUrl!, payload);
      //  const res = await fetch(invoice.webhookUrl!, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),

      // });
      if (res.status >= 200 && res.status < 300) {
        console.log("Webhook delivered successfully");
      } else {
        throw new Error("Webhook not acknowledged");
      }

      getIO().to(SocketId).emit("payment:verified", {
        success: true,
        txnSignature
      });

    } else {
      console.log("Payment failed", result);
      getIO().to(SocketId).emit("payment:verified", {
        success: false,
        error: "Verification failed"
      });
    }

  } catch (err) {
    console.error("Error verifying payment:", err);

    getIO().to(SocketId).emit("payment:verified", {
      success: false,
      error: "Internal verification error"
    });
  }
}