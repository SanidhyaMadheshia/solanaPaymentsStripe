import crypto from "node:crypto";

const KEY_PREFIX = "sk_";

/** Generates a new secret API key. Only the hash is ever stored. */
export function generateApiKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/** Short, non-secret identifier shown in the dashboard, e.g. "sk_3f9a1c…". */
export function displayPrefix(apiKey: string): string {
  return apiKey.slice(0, KEY_PREFIX.length + 8);
}

export function looksLikeApiKey(value: string): boolean {
  return /^sk_[0-9a-f]{64}$/.test(value);
}
