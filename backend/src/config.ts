import { z } from "zod";

const CLUSTER_RPC: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
};

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3003),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Public URL where the frontend (hosted checkout) is served, e.g. https://pay.example.com
  PUBLIC_APP_URL: z.string().url().default("http://localhost:5173"),
  // Comma separated list of extra origins allowed by CORS. The PUBLIC_APP_URL is always allowed.
  CORS_ORIGINS: optionalString,

  // This deployment runs on Solana Devnet only (test SOL, no real money).
  SOLANA_CLUSTER: z.literal("devnet", { errorMap: () => ({ message: "Only devnet is supported" }) }).default("devnet"),
  // Server-side RPC used to build and verify transactions (falls back to the public cluster RPC).
  SOLANA_RPC_URL: optionalString,
  // RPC handed to browsers for sending transactions. Never put a secret/paid RPC key here.
  PUBLIC_SOLANA_RPC_URL: optionalString,
  SOLANA_COMMITMENT: z.enum(["confirmed", "finalized"]).default("finalized"),

  // Optional platform fee, added as a second transfer in every checkout transaction.
  PLATFORM_FEE_ADDRESS: optionalString,
  PLATFORM_FEE_LAMPORTS: z.coerce.number().int().min(0).default(0),

  INVOICE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  // How long we keep polling the chain for a submitted signature before marking it failed.
  VERIFY_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(120),

  // Each merchant has its own webhook secret. This global one is only a legacy fallback,
  // inherited by the first account that claims data from the single-merchant version.
  WEBHOOK_SECRET: optionalString,
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(8),

  // Merchant accounts.
  REGISTRATION_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
});

export type Config = z.infer<typeof EnvSchema> & {
  rpcUrl: string;
  publicRpcUrl: string;
  corsOrigins: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const c = parsed.data;
  const defaultRpc = CLUSTER_RPC[c.SOLANA_CLUSTER]!;
  const appOrigin = new URL(c.PUBLIC_APP_URL).origin;
  const extra = (c.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ...c,
    PUBLIC_APP_URL: c.PUBLIC_APP_URL.replace(/\/+$/, ""),
    rpcUrl: c.SOLANA_RPC_URL ?? defaultRpc,
    publicRpcUrl: c.PUBLIC_SOLANA_RPC_URL ?? defaultRpc,
    corsOrigins: Array.from(new Set([appOrigin, ...extra])),
  };
}
