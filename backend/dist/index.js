import { configDotenv } from "dotenv";
import express from "express";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());
// configDotenv();
app.get("/hello", (req, res) => {
    res.status(200).json({
        msg: "payment done !!",
    });
});
app.listen(3000);
//# sourceMappingURL=index.js.map