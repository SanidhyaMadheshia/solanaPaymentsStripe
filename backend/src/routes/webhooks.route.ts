import { Router } from "express";
import { clerkUserCreated } from "../controllers/webhookController.js";

const webHookRouter = Router();



webHookRouter.post("/webhookEventClerkUser", clerkUserCreated );




export default webHookRouter ;