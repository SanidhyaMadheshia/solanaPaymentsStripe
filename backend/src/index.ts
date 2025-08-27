import { configDotenv } from "dotenv";
import express from "express";
import cors from "cors";
import findStacksTransaction from "./controllers/findStacksTransaction.js";

const app = express();

app.use(cors());

app.get("/hello", (req,res)=> {
    res.status(200).json({
        msg : "payment done !!",
        
    })
})

app.get("/find-stacks-transaction", findStacksTransaction)

// Start server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
