


import {Router} from "express";
import { createApiKey, createSessionUrl } from "../controllers/userApiController.js";
import { authJwtMiddleware } from "../middlewares/auth.js";
import { authMiddleware } from "../middlewares/apiKeyAuth.js";




const router = Router();


router.get("/createApiKey",authJwtMiddleware,  createApiKey);

router.get("/getSessionUrl", authMiddleware, createSessionUrl );





    







export default router;
