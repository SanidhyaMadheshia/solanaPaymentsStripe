import { Prisma, type User } from "@prisma/client";
import { z } from "zod";
import { HttpError, conflict } from "../lib/http.js";
import {
  generateSessionToken,
  generateWebhookSecret,
  getDummyHash,
  hashPassword,
  hashToken,
  normalizeEmail,
  verifyPassword,
} from "../lib/passwords.js";
import { LEGACY_MERCHANT_ID, type Deps } from "./merchant.js";

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

export const RegisterSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(254),
  password: PasswordSchema,
  businessName: z.string().trim().min(1, "Business name is required").max(100),
});

export const LoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(254),
  password: z.string().min(1, "Password is required").max(200),
});

/** Merchant fields safe to return to the logged-in merchant (never the hash or webhook secret). */
export function merchantView(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    walletAddress: u.walletAddress,
    defaultWebhookUrl: u.defaultWebhookUrl,
    createdAt: u.createdAt,
  };
}

async function createSession(deps: Deps, userId: string, userAgent: string | undefined) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + deps.config.SESSION_TTL_DAYS * 86_400_000);
  await deps.prisma.session.create({
    data: { userId, tokenHash: hashToken(token), userAgent: userAgent?.slice(0, 300) ?? null, expiresAt },
  });
  return { token, expiresAt };
}

/**
 * Creates a merchant account. The very first account on an instance that has data from the
 * single-merchant version claims the legacy "default" merchant, so existing products, API keys,
 * invoices and the old WEBHOOK_SECRET keep working.
 */
export async function register(deps: Deps, input: z.infer<typeof RegisterSchema>, userAgent?: string) {
  if (!deps.config.REGISTRATION_ENABLED) throw new HttpError(403, "Registration is closed on this instance", "registration_closed");
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  let user: User;
  try {
    user = await deps.prisma.$transaction(async (tx) => {
      // Serialise registrations so only one can claim the legacy merchant.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(724001)`;
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) throw conflict("An account with this email already exists");

      const accounts = await tx.user.count({ where: { passwordHash: { not: null } } });
      const legacy = accounts === 0 ? await tx.user.findUnique({ where: { id: LEGACY_MERCHANT_ID } }) : null;
      if (legacy && !legacy.passwordHash) {
        return tx.user.update({
          where: { id: legacy.id },
          data: {
            email,
            passwordHash,
            name: input.businessName,
            // Keep the previously configured global secret so existing integrations keep verifying.
            webhookSecret: legacy.webhookSecret ?? deps.config.WEBHOOK_SECRET ?? generateWebhookSecret(),
          },
        });
      }
      return tx.user.create({
        data: { email, passwordHash, name: input.businessName, pubKey: [], webhookSecret: generateWebhookSecret() },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("An account with this email already exists");
    throw e;
  }
  const session = await createSession(deps, user.id, userAgent);
  return { ...session, merchant: merchantView(user) };
}

export async function login(deps: Deps, input: z.infer<typeof LoginSchema>, userAgent?: string) {
  const email = normalizeEmail(input.email);
  const user = await deps.prisma.user.findUnique({ where: { email } });
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.passwordHash || !ok) throw new HttpError(401, "Incorrect email or password", "invalid_credentials");
  const session = await createSession(deps, user.id, userAgent);
  // Opportunistic cleanup of this merchant's expired sessions.
  void deps.prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } }).catch(() => undefined);
  return { ...session, merchant: merchantView(user) };
}

/** Resolves a bearer session token to its merchant, or null if invalid/expired. */
export async function resolveSession(deps: Deps, token: string) {
  const session = await deps.prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.passwordHash) {
    await deps.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  // Throttle lastUsedAt writes to once every 5 minutes.
  if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
    void deps.prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  return session;
}

export async function logout(deps: Deps, token: string) {
  await deps.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Changes the password and signs out every other session. */
export async function changePassword(deps: Deps, userId: string, currentSessionId: string, current: string, next: string) {
  const user = await deps.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.passwordHash || !(await verifyPassword(current, user.passwordHash))) {
    throw new HttpError(400, "Current password is incorrect", "invalid_credentials", { field: "currentPassword" });
  }
  await deps.prisma.$transaction([
    deps.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } }),
    deps.prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } }),
  ]);
}
