import express from "express";
import cors from "cors";
// import router from "./routes/user.route.js"
import dotenv from "dotenv";
// import router from "./routes/user.route.js";
import http from "http";
import { Server } from "socket.io";
import SolanaRouter from "./routes/solana.route.js"
import { Connection } from "@solana/web3.js";
dotenv.config();
export const connection = new Connection(
  process.env.QUICKNODE_RPC!
);


export const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "https://veola-garni-ellie.ngrok-free.dev"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-wallet-address"],
    credentials: true,
  }));
// app.options("*", cors());
// app.use("/api/v1/", webHookRouter);
app.use(express.json());



app.get("/test", (req, res )=> {
    res.json({
        msg : "iski mausi ka tun tun !! Chal gyaaaa !! "
    });

})

app.use("/api/solana/services", SolanaRouter);







app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});


