// src/socket.ts
// import process from "process";
import { io, Socket } from "socket.io-client";

// Define your backend URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL // change in production

// Define types (optional but recommended)
interface ServerToClientEvents {
  message: (data: any) => void;
  "payment:success": (payload: { invoiceId: string }) => void;
  "payment:verified": (payload: {
    success: boolean;
    txnSignature: string | undefined;
    error: string | undefined;
  }) => void;
}

interface ClientToServerEvents {
  message: (data: any) => void;
  "payment:initiate": (invoiceId: string) => void;
  "Client:checkInvoice": (invoice: string) => void;
  "Client:PaymentDone": ({
    txnSignature,
    sessionId,
    SocketId
  } : {
    txnSignature : string,
    sessionId : string | undefined,
    SocketId : string
  }) => void;

}


// Initialize socket with types and custom path
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
  path: "/ws/",
  autoConnect: false, // connect manually when needed
});
