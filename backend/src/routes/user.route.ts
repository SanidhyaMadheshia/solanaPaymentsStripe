

import { Router } from "express";
import { loginUser, otpGenerationandSendEmailUser, registerUser, verifyUser } from "../controllers/userControllers.js";
// import { register } from "module";



const router= Router();



router.post("/register" , registerUser );


router.post("/login", loginUser);


router.get("/verify", verifyUser);


router.get("/otpGenerate", otpGenerationandSendEmailUser);



export default router ;







