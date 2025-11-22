import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { prisma } from "../db/src/prisma.js";
import { verify } from "crypto";
import { verifyPayment } from "./solana.js";

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



// async function paymentDone({

//   txnSignature,
//   sessionId,
//   SocketId
// }: {
//   txnSignature: string,
//   sessionId: string | undefined,
//   SocketId: string
// }) {

//   if (!txnSignature || sessionId || SocketId) {
//     console.log("insufficient paramenter");

//     return;


//   }


//   const session = await prisma.checkoutSession.findFirst({
//     where: {
//       id: sessionId!,
//       socketid: SocketId
//     }
//   });



//   if (!session) return;

//   const res =await  verifyPayment({ sessionId: sessionId!, txnSignature, socketId: SocketId });






//   if(!res.success) {
    

//   }













// } 



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
    
    const result = await verifyPayment({
      sessionId,
      txnSignature,
      socketId: SocketId
    });

    if (result.success) {
      console.log("Payment verified successfully.");

      // Emit back to the correct client

      const payment = await prisma.payment.create({
        data : {
          invoiceId : session.invoiceId,
          txHash : txnSignature,
          status : "CONFIRMED",
          amount : result.amount!
        } 
      });


      console.log("payment done");
      

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