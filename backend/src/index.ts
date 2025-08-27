


// import { configDotenv } from "dotenv";
import express from "express";

import cors from "cors";
import router from "./routes/user.route.js";

import routerApi from "./routes/userApi.route.js"

import dotenv from "dotenv";


dotenv.config();



const app = express();
app.use(cors());

app.use(express.json());




app.use("/api/v1/user", router);


app.use("/api/v1/userApi", routerApi);




// configDotenv();





app.listen(3000);


