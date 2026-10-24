import { describe, expect, it } from "vitest";
import { displayPrefix, generateApiKey, hashApiKey, looksLikeApiKey } from "../src/lib/apiKeys.js";
import { loadConfig } from "../src/config.js";
import {
  buildCheckoutTransaction,
  decodeCheckoutTransaction,
  expectedTransfers,
  isValidPublicKey,
  lamportsToSol,
  solToLamports,
  verifyTransaction,
} from "../src/lib/solana.js";
import { RateLimiter, hashPassword, hashToken, verifyPassword } from "../src/lib/passwords.js";
import { nextRetryDelayMs, signWebhook, verifyWebhookSignature } from "../src/lib/webhooks.js";
import { BLOCKHASH, newAddress, parsedTx } from "./helpers.js";

describe("solToLamports / lamportsToSol", () => {
  it("converts without floating point error", () => {
    expect(solToLamports("0.1")).toBe(100_000_000n);
    expect(solToLamports("1")).toBe(1_000_000_000n);
    expect(solToLamports("0.00000001")).toBe(10n);
    expect(solToLamports("12.5")).toBe(12_500_000_000n);
    expect(solToLamports("0.30000000")).toBe(300_000_000n);
  });
  it("rejects invalid input", () => {
    expect(() => solToLamports("-1")).toThrow();
    expect(() => solToLamports("abc")).toThrow();
    expect(() => solToLamports("1e3")).toThrow();
    expect(() => solToLamports("0.0000000001")).toThrow();
  });
  it("round-trips", () => {
    for (const v of ["0.1", "1", "0.000000001", "123.456"]) expect(lamportsToSol(solToLamports(v))).toBe(v);
    expect(lamportsToSol(0n)).toBe("0");
  });
});

describe("isValidPublicKey", () => {
  it("accepts base58 keys and rejects garbage", () => {
    expect(isValidPublicKey(newAddress())).toBe(true);
    expect(isValidPublicKey("not-a-key")).toBe(false);
    expect(isValidPublicKey("")).toBe(false);
  });
});

describe("checkout transaction", () => {
  const payer = newAddress();
  const recipient = newAddress();
  const fee = { address: newAddress(), lamports: 10_000n };

  it("encodes the expected transfers and decodes them back", () => {
    const b64 = buildCheckoutTransaction({ payer, recipient, lamports: 250_000_000n, platformFee: fee }, BLOCKHASH);
    const decoded = decodeCheckoutTransaction(b64);
    expect(decoded.feePayer).toBe(payer);
    expect(decoded.transfers).toEqual([
      { from: payer, to: recipient, lamports: 250_000_000n },
      { from: payer, to: fee.address, lamports: 10_000n },
    ]);
  });

  it("omits the platform fee when not configured", () => {
    const b64 = buildCheckoutTransaction({ payer, recipient, lamports: 1n }, BLOCKHASH);
    expect(decodeCheckoutTransaction(b64).transfers).toHaveLength(1);
  });
});

describe("verifyTransaction", () => {
  const payer = newAddress();
  const recipient = newAddress();
  const expected = expectedTransfers({ payer, recipient, lamports: 500n });

  it("accepts a matching transaction", () => {
    expect(verifyTransaction(parsedTx({ feePayer: payer, transfers: expected }), expected, { payer })).toEqual({ ok: true });
  });
  it("accepts transfers made through inner instructions", () => {
    const tx = parsedTx({ feePayer: payer, transfers: [], innerTransfers: expected });
    expect(verifyTransaction(tx, expected, { payer }).ok).toBe(true);
  });
  it("rejects wrong amount, wrong recipient and on-chain failure", () => {
    const wrongAmount = parsedTx({ feePayer: payer, transfers: [{ ...expected[0]!, lamports: 499n }] });
    expect(verifyTransaction(wrongAmount, expected, { payer }).ok).toBe(false);
    const wrongTo = parsedTx({ feePayer: payer, transfers: [{ ...expected[0]!, to: newAddress() }] });
    expect(verifyTransaction(wrongTo, expected, { payer }).ok).toBe(false);
    const failed = parsedTx({ feePayer: payer, transfers: expected, err: { InstructionError: [0, "Custom"] } });
    expect(verifyTransaction(failed, expected, { payer })).toEqual({ ok: false, reason: "Transaction failed on-chain" });
  });
  it("rejects a different fee payer", () => {
    expect(verifyTransaction(parsedTx({ feePayer: newAddress(), transfers: expected }), expected, { payer }).ok).toBe(false);
  });
  it("rejects transactions that predate the session", () => {
    const old = parsedTx({ feePayer: payer, transfers: expected, blockTime: Math.floor(Date.now() / 1000) - 3600 });
    expect(verifyTransaction(old, expected, { payer, notBefore: new Date() }).ok).toBe(false);
  });
  it("requires each expected transfer to be matched by a distinct instruction", () => {
    const two = [...expected, ...expected];
    expect(verifyTransaction(parsedTx({ feePayer: payer, transfers: expected }), two, { payer }).ok).toBe(false);
  });
});

describe("api keys", () => {
  it("generates hashed, well-formed keys", () => {
    const key = generateApiKey();
    expect(looksLikeApiKey(key)).toBe(true);
    expect(hashApiKey(key)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey(key)).not.toContain(key.slice(3));
    expect(displayPrefix(key)).toBe(key.slice(0, 11));
    expect(looksLikeApiKey("sk_short")).toBe(false);
  });
});

describe("webhook signing", () => {
  it("signs and verifies, rejecting tampering and stale timestamps", () => {
    const now = Date.now();
    const ts = Math.floor(now / 1000);
    const sig = signWebhook("secret", '{"a":1}', ts);
    expect(verifyWebhookSignature("secret", '{"a":1}', sig, 300, now)).toBe(true);
    expect(verifyWebhookSignature("secret", '{"a":2}', sig, 300, now)).toBe(false);
    expect(verifyWebhookSignature("other", '{"a":1}', sig, 300, now)).toBe(false);
    expect(verifyWebhookSignature("secret", '{"a":1}', sig, 300, now + 3_600_000)).toBe(false);
  });
  it("backs off exponentially with a cap", () => {
    expect(nextRetryDelayMs(1)).toBe(30_000);
    expect(nextRetryDelayMs(2)).toBe(60_000);
    expect(nextRetryDelayMs(20)).toBe(3_600_000);
  });
});

describe("loadConfig", () => {
  it("applies defaults and derives CORS origins", () => {
    const c = loadConfig({ DATABASE_URL: "postgres://x", PUBLIC_APP_URL: "https://pay.example.com/", CORS_ORIGINS: "https://shop.example.com, " });
    expect(c.PORT).toBe(3003);
    expect(c.PUBLIC_APP_URL).toBe("https://pay.example.com");
    expect(c.rpcUrl).toBe("https://api.devnet.solana.com");
    expect(c.corsOrigins).toEqual(["https://pay.example.com", "https://shop.example.com"]);
    expect(c.REGISTRATION_ENABLED).toBe(true);
    expect(c.SESSION_TTL_DAYS).toBe(30);
    expect(loadConfig({ DATABASE_URL: "x", REGISTRATION_ENABLED: "false" }).REGISTRATION_ENABLED).toBe(false);
  });
  it("fails fast on invalid configuration", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: "x", SOLANA_CLUSTER: "localnet" })).toThrow(/SOLANA_CLUSTER/);
  });
});

describe("passwords & sessions", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword("hunter2-long");
    expect(h).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await hashPassword("hunter2-long")).not.toBe(h); // random salt
    expect(await verifyPassword("hunter2-long", h)).toBe(true);
    expect(await verifyPassword("hunter2-lonG", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("hashes session tokens deterministically", () => {
    expect(hashToken("sps_a")).toBe(hashToken("sps_a"));
    expect(hashToken("sps_a")).not.toBe(hashToken("sps_b"));
  });
  it("rate limits within a window and resets", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.hit("k", 0)).toBe(0);
    expect(rl.hit("k", 10)).toBe(0);
    expect(rl.hit("k", 20)).toBeGreaterThan(0);
    expect(rl.hit("other", 20)).toBe(0);
    expect(rl.hit("k", 1001)).toBe(0);
    rl.hit("k", 1002); rl.hit("k", 1003);
    rl.reset("k");
    expect(rl.hit("k", 1004)).toBe(0);
  });
});
