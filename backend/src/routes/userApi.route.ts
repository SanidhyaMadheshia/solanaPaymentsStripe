


import {Router} from "express";
// import { createApiKey, createProduct, createSessionUrl } from "../controllers/userApiController.js";
import { authJwtMiddleware } from "../middlewares/auth.js";
import { authMiddleware } from "../middlewares/apiKeyAuth.js";
import { createApiKey, createProduct } from "../controllers/userControllers.js";
import { createSessionUrl } from "../controllers/userApiController.js";




const router = Router();




router.get("/getSessionUrl", authMiddleware, createSessionUrl );





    







export default router;
