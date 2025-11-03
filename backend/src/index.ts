import express from "express";

import cors from "cors";
// import router from "./routes/user.route.js"

// import routerApi from "./routes/userApi.route.js"

import dotenv from "dotenv";

import webHookRouter from "./routes/webhooks.route.js";
import router from "./routes/user.route.js";
// import router from "./routes/user.route.js";


dotenv.config();



const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "https://veola-garni-ellie.ngrok-free.dev"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));



// app.options("*", cors());


app.use("/api/v1/", webHookRouter);
app.use(express.json());
app.use("/api/v1/user",router );

// app.use("/api/v1/userApi", routerApi);

app.get("/test", (req, res )=> {
    res.json({
        msg : "iski mausi ka tun tun !! Chal gyaaaa !! "
    });

})







app.listen(3003);


