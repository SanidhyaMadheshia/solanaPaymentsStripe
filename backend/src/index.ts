import { configDotenv } from "dotenv";
import express from "express";
import cors from "cors";
import findStacksTransaction from "./controllers/findStacksTransaction.js";
import router from "./routes/user.route.js";

import routerApi from "./routes/userApi.route.js"

import dotenv from "dotenv";


dotenv.config();



const app = express();

app.use(cors());

app.get("/hello", (req,res)=> {
    res.status(200).json({
        msg : "payment done !!",
        
    })
})

app.get("/find-stacks-transaction", findStacksTransaction)
app.use(express.json());




app.use("/api/v1/user", router);


app.use("/api/v1/userApi", routerApi);




// configDotenv();




// Start server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
