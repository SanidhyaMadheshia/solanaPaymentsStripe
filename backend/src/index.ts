import express from "express";

import cors from "cors";
// import router from "./routes/user.route.js"

import routerApi from "./routes/userApi.route.js"

import dotenv from "dotenv";

import webHookRouter from "./routes/webhooks.route.js";
import router from "./routes/user.route.js";
// import router from "./routes/user.route.js";
import http from "http";
import { Server } from "socket.io";
import { initSocket } from "./lib/socket.js";
import invoiceRouter from "./routes/invoice.route.js"
// import RedisClient from "./lib/redis.js";
import {Redis} from "ioredis";


dotenv.config();

export const RedisClient = new  Redis(process.env.REDIS_URL!, {
  tls : {},
  maxRetriesPerRequest : null,
  enableReadyCheck : false,
  connectTimeout : 10000
});

RedisClient.on("connect", ()=> {
  console.log("Redis connected !!");
})

export const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "https://veola-garni-ellie.ngrok-free.dev", process.env.FRONTEND_URL!, process.env.BACKEND_SERVICE_URL!],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-wallet-address"],
    credentials: true,
  }));


const server = http.createServer(app);
initSocket(server);

// app.options("*", cors());


app.use("/api/v1/", webHookRouter);
app.use(express.json());

app.use("/api/v1/invoice/", invoiceRouter); 
app.use("/api/v1/user",router );

app.use("/api/v1/userApi", routerApi);

app.get("/test", (req, res )=> {
    res.json({
        msg : "iski mausi ka tun tun !! Chal gyaaaa !! "
    });

})
// console.log(process.env.REDIS_URL);

// await RedisClient.connect();
// RedisClient.set("foo", "bar");

// await RedisClient.disconnect();


// await RedisClient.connect();


server.listen(3003, () => {
  // console.log()// <--- Ping pong 
  console.log("🚀 Server running on http://localhost:3003");
});


