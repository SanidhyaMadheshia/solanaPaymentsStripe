

import { Router } from "express";
import { createApiKey, createPrice, createProduct, loginUser, otpGenerationandSendEmailUser, registerUser, verifyUser } from "../controllers/userControllers.js";
import { authJwtMiddleware } from "../middlewares/auth.js";
// import { register } from "module";



const router= Router();



router.get("/verify", verifyUser);
router.get("/otpGenerate", otpGenerationandSendEmailUser);
router.post("/register" , registerUser );
router.post("/login", loginUser);



router.get("/createApiKey",authJwtMiddleware,  createApiKey);
router.post("/createProduct",authJwtMiddleware, createProduct);
router.post("/createPrice",authJwtMiddleware, createPrice);

export default router ;







