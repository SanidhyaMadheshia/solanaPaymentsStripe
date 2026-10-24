import { Router, type Request } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http.js";
import { RateLimiter, normalizeEmail } from "../lib/passwords.js";
import { sessionAuth, type SessionRequest } from "../middlewares/auth.js";
import { LoginSchema, PasswordSchema, RegisterSchema, changePassword, login, logout, merchantView, register } from "../services/auth.js";
import type { Deps } from "../services/merchant.js";

const ChangePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: PasswordSchema });

function tooMany(retryAfter: number): HttpError {
  return new HttpError(429, `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`, "rate_limited", { retryAfter });
}

/** Public auth endpoints plus session-protected account endpoints. */
export function authRouter(deps: Deps) {
  const r = Router();
  // Per app instance, so tests and processes don't share state.
  const loginByIpEmail = new RateLimiter(10, 15 * 60_000);
  const loginByIp = new RateLimiter(50, 15 * 60_000);
  const registerByIp = new RateLimiter(10, 60 * 60_000);
  const ua = (req: Request) => req.get("user-agent") ?? undefined;

  r.post("/register", async (req, res) => {
    const wait = registerByIp.hit(req.ip ?? "?");
    if (wait) throw tooMany(wait);
    const input = RegisterSchema.parse(req.body);
    res.status(201).json(await register(deps, input, ua(req)));
  });

  r.post("/login", async (req, res) => {
    const input = LoginSchema.parse(req.body);
    const ipKey = req.ip ?? "?";
    const pairKey = `${ipKey}|${normalizeEmail(input.email)}`;
    const wait = Math.max(loginByIp.hit(ipKey), loginByIpEmail.hit(pairKey));
    if (wait) throw tooMany(wait);
    const result = await login(deps, input, ua(req));
    loginByIpEmail.reset(pairKey);
    res.json(result);
  });

  r.post("/logout", sessionAuth(deps), async (req, res) => {
    await logout(deps, (req as SessionRequest).sessionToken!);
    res.status(204).end();
  });

  r.get("/me", sessionAuth(deps), (req, res) => {
    res.json({ merchant: merchantView((req as SessionRequest).session!.user) });
  });

  r.post("/password", sessionAuth(deps), async (req, res) => {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    const s = (req as SessionRequest).session!;
    await changePassword(deps, s.userId, s.id, currentPassword, newPassword);
    res.json({ ok: true });
  });

  return r;
}
