


import type { Request, Response, NextFunction } from "express";
// import { PrismaClient } from "../generated/prisma/index.js";

import crypto from "crypto";
import {prisma} from "../db/src/prisma.js"
// import {prisma}
// const prismaClient = new PrismaClient();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(400).json({
      message: "Missing Authorization header"
    });
  }

  const apiKey = authHeader.split(" ")[1]; 
  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  if (!apiKey.startsWith("sk_")) {
    return res.status(401).json({ message: "Invalid API key format" });
  }

  try {

    const rawKey = apiKey.slice(3);

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const keyData = await prisma.apiKey.findFirst({
      where: { keyHash, revoked: false },
      include: { user: true }
    });

    if (!keyData) {
      return res.status(401).json({ message: "Invalid API key" });
    }


    (req as any).user = keyData.user;
    (req as any).apiKey = keyData;

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(403).json({ error: "Error while authenticating API key" });
  }
}





