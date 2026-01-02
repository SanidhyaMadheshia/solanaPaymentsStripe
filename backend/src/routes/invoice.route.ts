


import {Router} from "express";
import { fetchTransactionSignature, initiateCheckout, updateSocket } from "../controllers/payerController.js";
// // import { createApiKey, createProduct, createSessionUrl } from "../controllers/userApiController.js";
// import { authJwtMiddleware } from "../middlewares/auth.js";

// import { createApiKey, createProduct } from "../controllers/userControllers.js";
// import { createSessionUrl } from "../controllers/userApiController.js";




const router = Router();



router.get("/:invoiceId", initiateCheckout);
router.get("/txnSignature/:invoiceId",fetchTransactionSignature);
router.post("/:invoiceId", updateSocket);



    







export default router;
