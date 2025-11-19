


import {Router} from "express";
import { initiateCheckout } from "../controllers/payerController.js";
// // import { createApiKey, createProduct, createSessionUrl } from "../controllers/userApiController.js";
// import { authJwtMiddleware } from "../middlewares/auth.js";

// import { createApiKey, createProduct } from "../controllers/userControllers.js";
// import { createSessionUrl } from "../controllers/userApiController.js";




const router = Router();



router.get("/:invoiceId", initiateCheckout);

    



    







export default router;
