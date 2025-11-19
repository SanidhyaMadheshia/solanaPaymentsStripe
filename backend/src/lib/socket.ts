import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";

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
    socket.on("Client:checkInvoice", (invoice : string)=>{
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
  });

  console.log("Socket.IO initialized");
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket() first.");
  }
  return io;
};
