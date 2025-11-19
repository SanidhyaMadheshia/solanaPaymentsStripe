

// import { Router } from "express";
// import { createApiKey, createPrice, createProduct, getApiKeys, getDashboardData, getInvoice, loginUser, otpGenerationandSendEmailUser, registerUser, verifyUser } from "../controllers/userControllers.js";
// import { authJwtMiddleware } from "../middlewares/auth.js";
// // import { register } from "module";

import  { Router } from "express"
import { createApiKey, createPrice, createProduct, exchangeToken, getDashboardData } from "../controllers/userControllers.js";
import { authJwtMiddleware } from "../middlewares/auth.js";



const router= Router();



// router.post("/verify", verifyUser);
// router.post("/otpGenerate", otpGenerationandSendEmailUser);
// router.post("/register" , registerUser );
// router.post("/login", loginUser);



// router.get("/getApiKeys", authJwtMiddleware , getApiKeys)
router.get("/dashboard", authJwtMiddleware,getDashboardData );
router.get("/createApiKey", authJwtMiddleware,createApiKey );
router.post("/createProduct", authJwtMiddleware , createProduct);
router.post("/createPrice", authJwtMiddleware , createPrice);


// router.post("/createApiKey",authJwtMiddleware,  createApiKey);
// router.post("/createProduct",authJwtMiddleware, createProduct);
// router.post("/createPrice",authJwtMiddleware, createPrice);

// router.get("/invoice/:id" , getInvoice);

router.get("/exchangeToken" ,  exchangeToken) ;


export default router ;




