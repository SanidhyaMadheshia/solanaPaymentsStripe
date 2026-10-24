import type { NextFunction, Request, Response } from "express";
import type { ApiKey, Session, User } from "@prisma/client";
import { hashApiKey, looksLikeApiKey } from "../lib/apiKeys.js";
import { HttpError } from "../lib/http.js";
import { SESSION_PREFIX } from "../lib/passwords.js";
import { resolveSession } from "../services/auth.js";
import type { Deps } from "../services/merchant.js";

export interface ApiKeyRequest extends Request {
  apiKey?: ApiKey;
  merchantId?: string;
}

export interface SessionRequest extends Request {
  session?: Session & { user: User };
  merchantId?: string;
  sessionToken?: string;
}

export function bearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (!h) return undefined;
  const [scheme, token] = h.split(" ");
  return scheme === "Bearer" && token ? token.trim() : undefined;
}

/** Merchant id set by apiKeyAuth or sessionAuth. */
export function merchantIdOf(req: Request): string {
  const id = (req as SessionRequest).merchantId;
  if (!id) throw new HttpError(401, "Not authenticated", "unauthorized");
  return id;
}

/** Authenticates server-to-server API calls made with a secret key (Authorization: Bearer sk_...). */
export function apiKeyAuth(deps: Deps) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = bearer(req);
    if (!key) throw new HttpError(401, "Missing API key. Send Authorization: Bearer sk_...", "unauthorized");
    if (!looksLikeApiKey(key)) throw new HttpError(401, "Invalid API key format", "unauthorized");
    const apiKey = await deps.prisma.apiKey.findFirst({ where: { keyHash: hashApiKey(key), revoked: false } });
    if (!apiKey) throw new HttpError(401, "Invalid or revoked API key", "unauthorized");
    (req as ApiKeyRequest).apiKey = apiKey;
    (req as ApiKeyRequest).merchantId = apiKey.userId;
    void deps.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    next();
  };
}

/** Authenticates dashboard requests with a login session token (Authorization: Bearer sps_...). */
export function sessionAuth(deps: Deps) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token || !token.startsWith(SESSION_PREFIX)) throw new HttpError(401, "Please log in", "unauthorized");
    const session = await resolveSession(deps, token);
    if (!session) throw new HttpError(401, "Your session has expired. Please log in again.", "session_expired");
    const r = req as SessionRequest;
    r.session = session;
    r.merchantId = session.userId;
    r.sessionToken = token;
    next();
  };
}
