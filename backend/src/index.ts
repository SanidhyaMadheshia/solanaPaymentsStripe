import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createChainClient, isValidPublicKey } from "./lib/solana.js";
import { fetchWebhookSender } from "./lib/webhooks.js";
import { startWorkers } from "./services/checkout.js";
import type { Deps } from "./services/merchant.js";

async function main() {
  // DIRECT_URL is only needed by migrations; default it so plain Postgres setups need one URL.
  process.env.DIRECT_URL ||= process.env.DATABASE_URL;
  const config = loadConfig();
  if (config.PLATFORM_FEE_ADDRESS && !isValidPublicKey(config.PLATFORM_FEE_ADDRESS)) {
    throw new Error("PLATFORM_FEE_ADDRESS is not a valid Solana address");
  }

  const prisma = new PrismaClient();
  await prisma.$connect();

  const deps: Deps = {
    prisma,
    config,
    chain: createChainClient(config.rpcUrl, config.SOLANA_COMMITMENT),
    sendWebhook: fetchWebhookSender,
  };

  const app = createApp(deps);
  const server = app.listen(config.PORT, () => {
    console.log(`SolPay API listening on :${config.PORT} (cluster=${config.SOLANA_CLUSTER}, commitment=${config.SOLANA_COMMITMENT})`);
    if (!config.REGISTRATION_ENABLED) console.log("Registration is disabled (REGISTRATION_ENABLED=false).");
  });
  const stopWorkers = startWorkers(deps);

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    stopWorkers();
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
