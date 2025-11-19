import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../db/src/prisma.js";

export interface CustomApiRequest extends Request {
  apiKey?: {
    id: string;
    userId: string;
    keyHash: string;
    label: string | null;
    revoked: boolean;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      pubKey: string[];
    };
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(400).json({ message: "Missing Authorization header" });
  }

  // Expected format: "Bearer sk_abc123..."
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(400).json({ message: "Invalid Authorization header format" });
  }

  const apiKey = parts[1]!;
  if (!apiKey.startsWith("sk_")) {
    return res.status(401).json({ message: "Invalid API key format" });
  }

  try {
    // Hash the key (same as your createApiKey)
    // const rawKey = apiKey.slice(3); // remove "sk_"
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    console.log("keyHash :", keyHash);
    // Find active API key
    const keyData = await prisma.apiKey.findFirst({
      where: { keyHash, revoked: false },
      include: { user: true },
    });

    if (!keyData) {
      return res.status(401).json({ message: "Invalid or revoked API key" });
    }

    // Attach to request
    (req as CustomApiRequest).apiKey = keyData;

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
