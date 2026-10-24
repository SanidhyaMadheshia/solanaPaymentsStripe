import { Keypair, PublicKey, SystemProgram, type ParsedTransactionWithMeta } from "@solana/web3.js";
import type { ChainClient, Transfer } from "../src/lib/solana.js";

export const BLOCKHASH = { blockhash: "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi", lastValidBlockHeight: 1000 };

export function newAddress() {
  return Keypair.generate().publicKey.toBase58();
}

/** A fake signature in base58 (88 chars). */
export function fakeSignature() {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return Array.from({ length: 88 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function parsedTx(opts: {
  feePayer: string;
  transfers: Transfer[];
  err?: unknown;
  blockTime?: number;
  innerTransfers?: Transfer[];
}): ParsedTransactionWithMeta {
  const ix = (t: Transfer) => ({
    program: "system",
    programId: SystemProgram.programId,
    parsed: { type: "transfer", info: { source: t.from, destination: t.to, lamports: Number(t.lamports) } },
  });
  return {
    slot: 1,
    blockTime: opts.blockTime ?? Math.floor(Date.now() / 1000),
    meta: {
      err: opts.err ?? null,
      fee: 5000,
      preBalances: [],
      postBalances: [],
      innerInstructions: opts.innerTransfers ? [{ index: 0, instructions: opts.innerTransfers.map(ix) }] : [],
    },
    transaction: {
      signatures: [fakeSignature()],
      message: {
        accountKeys: [{ pubkey: new PublicKey(opts.feePayer), signer: true, writable: true, source: "transaction" }],
        instructions: opts.transfers.map(ix),
        recentBlockhash: BLOCKHASH.blockhash,
      },
    },
  } as unknown as ParsedTransactionWithMeta;
}

/** In-memory chain: tests register what each signature resolves to. */
export class FakeChain implements ChainClient {
  txs = new Map<string, ParsedTransactionWithMeta>();
  statuses = new Map<string, { err: unknown; confirmationStatus?: string }>();

  async getLatestBlockhash() {
    return BLOCKHASH;
  }
  async getSignatureStatus(signature: string) {
    return this.statuses.get(signature) ?? null;
  }
  async getParsedTransaction(signature: string) {
    return this.txs.get(signature) ?? null;
  }
  land(signature: string, tx: ParsedTransactionWithMeta, confirmationStatus = "finalized") {
    this.txs.set(signature, tx);
    this.statuses.set(signature, { err: tx.meta?.err ?? null, confirmationStatus });
  }
}
