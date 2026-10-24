import type { PrismaClient, User } from "@prisma/client";
import type { Config } from "../config.js";
import type { ChainClient } from "../lib/solana.js";
import type { WebhookSender } from "../lib/webhooks.js";

/**
 * Id of the merchant row created by the single-merchant version. The first account registered
 * on an upgraded instance claims it (see services/auth.ts).
 */
export const LEGACY_MERCHANT_ID = "default";

export interface Deps {
  prisma: PrismaClient;
  config: Config;
  chain: ChainClient;
  sendWebhook: WebhookSender;
  /** Override for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Poll interval while waiting for a signature to confirm. */
  pollIntervalMs?: number;
}

export async function getMerchant(deps: Pick<Deps, "prisma">, merchantId: string): Promise<User> {
  return deps.prisma.user.findUniqueOrThrow({ where: { id: merchantId } });
}
