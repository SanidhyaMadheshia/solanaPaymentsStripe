


import {Router} from "express";
import { initiateCheckout, updateSocket } from "../controllers/payerController.js";
// // import { createApiKey, createProduct, createSessionUrl } from "../controllers/userApiController.js";
// import { authJwtMiddleware } from "../middlewares/auth.js";

// import { createApiKey, createProduct } from "../controllers/userControllers.js";
// import { createSessionUrl } from "../controllers/userApiController.js";




const router = Router();



router.get("/:invoiceId", initiateCheckout);
router.post("/:invoiceId", updateSocket);



    







export default router;
