import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type Commitment,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";

export interface Transfer {
  from: string;
  to: string;
  lamports: bigint;
}

/** Minimal chain surface used by the app; lets tests swap in a fake. */
export interface ChainClient {
  getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }>;
  getSignatureStatus(signature: string): Promise<{ err: unknown; confirmationStatus?: string | undefined } | null>;
  getParsedTransaction(signature: string): Promise<ParsedTransactionWithMeta | null>;
}

export function createChainClient(rpcUrl: string, commitment: Commitment): ChainClient {
  const connection = new Connection(rpcUrl, commitment);
  return {
    getLatestBlockhash: () => connection.getLatestBlockhash(commitment),
    async getSignatureStatus(signature) {
      const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      return res.value[0] ?? null;
    },
    getParsedTransaction: (signature) =>
      connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: commitment === "processed" ? "confirmed" : (commitment as "confirmed" | "finalized"),
      }),
  };
}

export function isValidPublicKey(value: string): boolean {
  try {
    // PublicKey accepts some non-base58 inputs (e.g. 32 byte buffers); require round-trip equality.
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

/** Converts a decimal SOL string (up to 9 decimals) to lamports without floating point error. */
export function solToLamports(sol: string): bigint {
  const s = sol.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid SOL amount: ${sol}`);
  const [whole, frac = ""] = s.split(".") as [string, string?];
  if (frac.length > 9 && /[1-9]/.test(frac.slice(9))) throw new Error(`SOL amount has more than 9 decimals: ${sol}`);
  const fracPadded = (frac + "000000000").slice(0, 9);
  return BigInt(whole) * BigInt(LAMPORTS_PER_SOL) + BigInt(fracPadded);
}

export function lamportsToSol(lamports: bigint): string {
  const neg = lamports < 0n;
  const abs = neg ? -lamports : lamports;
  const whole = abs / BigInt(LAMPORTS_PER_SOL);
  const frac = (abs % BigInt(LAMPORTS_PER_SOL)).toString().padStart(9, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

export interface CheckoutTxParams {
  payer: string;
  recipient: string;
  lamports: bigint;
  platformFee?: { address: string; lamports: bigint } | undefined;
}

export function expectedTransfers(p: CheckoutTxParams): Transfer[] {
  const transfers: Transfer[] = [{ from: p.payer, to: p.recipient, lamports: p.lamports }];
  if (p.platformFee && p.platformFee.lamports > 0n) {
    transfers.push({ from: p.payer, to: p.platformFee.address, lamports: p.platformFee.lamports });
  }
  return transfers;
}

/** Builds the unsigned transfer transaction handed to the buyer's wallet (base64). */
export function buildCheckoutTransaction(
  p: CheckoutTxParams,
  recent: { blockhash: string; lastValidBlockHeight: number },
): string {
  const payer = new PublicKey(p.payer);
  const tx = new Transaction({ feePayer: payer, blockhash: recent.blockhash, lastValidBlockHeight: recent.lastValidBlockHeight });
  for (const t of expectedTransfers(p)) {
    tx.add(SystemProgram.transfer({ fromPubkey: new PublicKey(t.from), toPubkey: new PublicKey(t.to), lamports: t.lamports }));
  }
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

/** Extracts the expected system transfers from a stored unsigned transaction. */
export function decodeCheckoutTransaction(base64: string): { feePayer: string | undefined; transfers: Transfer[] } {
  const tx = Transaction.from(Buffer.from(base64, "base64"));
  const transfers = tx.instructions
    .filter((ix) => ix.programId.equals(SystemProgram.programId) && ix.data.length >= 12 && ix.data.readUInt32LE(0) === 2)
    .map((ix) => ({
      from: ix.keys[0]!.pubkey.toBase58(),
      to: ix.keys[1]!.pubkey.toBase58(),
      lamports: ix.data.readBigUInt64LE(4),
    }));
  return { feePayer: tx.feePayer?.toBase58(), transfers };
}

function parsedTransfersOf(ixs: (ParsedInstruction | PartiallyDecodedInstruction)[]): Transfer[] {
  const out: Transfer[] = [];
  for (const ix of ixs) {
    if (!("parsed" in ix) || ix.program !== "system") continue;
    const parsed = ix.parsed as { type?: string; info?: { source?: string; destination?: string; lamports?: number | string } };
    if (parsed?.type !== "transfer" || !parsed.info?.source || !parsed.info.destination) continue;
    out.push({ from: parsed.info.source, to: parsed.info.destination, lamports: BigInt(parsed.info.lamports ?? 0) });
  }
  return out;
}

/** All system transfers in a confirmed transaction, including inner (CPI) instructions. */
export function actualTransfers(txn: ParsedTransactionWithMeta): Transfer[] {
  const top = parsedTransfersOf(txn.transaction.message.instructions);
  const inner = (txn.meta?.innerInstructions ?? []).flatMap((g) => parsedTransfersOf(g.instructions));
  return [...top, ...inner];
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Checks that a confirmed transaction contains every expected transfer (each matched once),
 * succeeded on-chain, was paid for by the buyer and was not produced before the checkout session.
 */
export function verifyTransaction(
  txn: ParsedTransactionWithMeta,
  expected: Transfer[],
  opts: { payer: string; notBefore?: Date | undefined },
): VerifyResult {
  if (txn.meta?.err) return { ok: false, reason: "Transaction failed on-chain" };

  const feePayer = txn.transaction.message.accountKeys[0]?.pubkey.toBase58();
  if (feePayer !== opts.payer) return { ok: false, reason: "Fee payer does not match the checkout wallet" };

  if (opts.notBefore && txn.blockTime != null) {
    // Allow some clock skew between our server and validator block time.
    if (txn.blockTime * 1000 < opts.notBefore.getTime() - 120_000) {
      return { ok: false, reason: "Transaction predates the checkout session" };
    }
  }

  const remaining = actualTransfers(txn);
  for (const exp of expected) {
    const idx = remaining.findIndex((a) => a.from === exp.from && a.to === exp.to && a.lamports === exp.lamports);
    if (idx === -1) {
      return { ok: false, reason: `Missing transfer of ${lamportsToSol(exp.lamports)} SOL to ${exp.to}` };
    }
    remaining.splice(idx, 1);
  }
  return { ok: true };
}
