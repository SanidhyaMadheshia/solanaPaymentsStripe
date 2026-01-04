
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
  type ParsedTransactionWithMeta
} from "@solana/web3.js";

import { prisma } from "../db/src/prisma.js";
import axios from "axios";
// import { dot } from "node:test/reporters";
import dotenv from "dotenv"
dotenv.config();

/* ------------------------------------------------------------------ */
/*  CONFIG                                                            */
/* ------------------------------------------------------------------ */

// Used only for creating unsigned txns
console.log("RPC URL :", process.env.QUICKNODE_RPC);
export const connection = new Connection(
  process.env.QUICKNODE_RPC!
);

export const OWNER_PUBADDRESS = new PublicKey(
  "4sFbDaCJyFvwCfwsQy1mXSoQKGmhSEWw1xWAZV8HkHUC"
);

/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */

function decodeLamports(hexData: string): number {
  const buffer = Buffer.from(hexData, "hex");
  const lamports = buffer.readBigUInt64LE(4);
  return Number(lamports);
}

/* ------------------------------------------------------------------ */
/*  CREATE UNSIGNED TXN                                                */
/* ------------------------------------------------------------------ */

export async function createSolTransferTxn({
  recPubKey,
  senPubKey,
  amount
}: {
  recPubKey: string;
  senPubKey: string;
  amount: number;
}) {
  const sender = new PublicKey(senPubKey);
  const receiver = new PublicKey(recPubKey);

  const paymentLamports = Math.floor(amount * LAMPORTS_PER_SOL);
  const platformFee = Math.floor(0.00001 * LAMPORTS_PER_SOL);

  const paymentIx = SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: receiver,
    lamports: paymentLamports
  });

  const feeIx = SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: OWNER_PUBADDRESS,
    lamports: platformFee
  });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const txn = new Transaction().add(paymentIx, feeIx);

  txn.feePayer = sender;
  txn.recentBlockhash = blockhash;
  txn.lastValidBlockHeight = lastValidBlockHeight;

  const serialized = txn.serialize({ requireAllSignatures: false });

  return serialized.toString("base64");
}

/* ------------------------------------------------------------------ */
/*  DECODE UNSIGNED TXN (EXPECTED TRANSFERS)                           */
/* ------------------------------------------------------------------ */

export function decodeTransferTxnHash(base64txn: string) {
  const buffer = Buffer.from(base64txn, "base64");
  const txn = Transaction.from(buffer);

  return {
    feePayer: txn.feePayer?.toBase58(),
    recentBlockhash: txn.recentBlockhash,
    transfers: txn.instructions
      .filter(ix =>
        ix.programId.equals(SystemProgram.programId)
      )
      .map(ix => ({
        from: ix.keys[0]!.pubkey.toBase58(),
        to: ix.keys[1]!.pubkey.toBase58(),
        lamports: decodeLamports(ix.data.toString("hex"))
      }))
  };
}

/* ------------------------------------------------------------------ */
/*  FETCH SIGNED TXN VIA YOUR ENDPOINT                                 */
/* ------------------------------------------------------------------ */

export async function decodeTransferSignature(signature: string) {

  // ⬇⬇⬇ KEEP THIS AS-IS (your requirement)
  const data = await axios.get<{ txSignature: ParsedTransactionWithMeta }>(
    `${process.env.BACKEND_SERVICE_URL}/api/solana/services/transaction/${signature}`
  );
  console.log("Transaction data fetched from backend service:", data.data);
  const txn = data.data.txSignature;

  if (!txn) {
    throw new Error("Transaction not found");
  }

  if (txn.meta?.err) {
    throw new Error("Transaction failed on-chain");
  }

  const transfers = txn.transaction.message.instructions
    .filter(
      (ix: any) =>
        ix.program === "system" &&
        ix.parsed?.type === "transfer"
    )
    .map((ix: any) => ({
      from: ix.parsed.info.source,
      to: ix.parsed.info.destination,
      lamports: Number(ix.parsed.info.lamports)
    }));

  return {
    slot: txn.slot,
    blockTime: txn.blockTime,
    fee: txn.meta!.fee,
    transfers
  };
}

/* ------------------------------------------------------------------ */
/*  VERIFY PAYMENT (STRIPE-GRADE CORE)                                 */
/* ------------------------------------------------------------------ */

export async function verifyPayment({
  sessionId,
  txnSignature,
  socketId
}: {
  sessionId: string;
  txnSignature: string;
  socketId: string;
}) {
  try {
    /* -------------------------------------------------------------- */
    /* 1. Load checkout session                                      */
    /* -------------------------------------------------------------- */

    const session = await prisma.checkoutSession.findUnique({
      where: {
        id: sessionId,
        socketid: socketId
      }
    });

    if (!session || !session.txHash) {
      throw new Error("Invalid checkout session");
    }

    /* -------------------------------------------------------------- */
    /* 2. Expected (unsigned) transfers                               */
    /* -------------------------------------------------------------- */

    const expected = decodeTransferTxnHash(session.txHash);

    /* -------------------------------------------------------------- */
    /* 3. Actual (on-chain finalized) transfers                        */
    /* -------------------------------------------------------------- */

    const actual = await decodeTransferSignature(txnSignature);

    /* -------------------------------------------------------------- */
    /* 4. Order-independent matching                                  */
    /* -------------------------------------------------------------- */

    for (const exp of expected.transfers) {
      const match = actual.transfers.find(
        act =>
          act.from === exp.from &&
          act.to === exp.to &&
          act.lamports === exp.lamports
      );

      if (!match) {
        throw new Error("Expected transfer missing on-chain");
      }
    }

    /* -------------------------------------------------------------- */
    /* 5. Fee payer validation (safe version)                          */
    /* -------------------------------------------------------------- */

    if (expected.feePayer !== actual.transfers[0]?.from) {
      throw new Error("Fee payer mismatch");
    }

    /* -------------------------------------------------------------- */
    /* 6. Mark session PAID (idempotent)                               */
    /* -------------------------------------------------------------- */

    // await prisma.checkoutSession.update({
    //   where: { id: sessionId },
    //   data: {
    //     status: "COMPLETED",
    //     txnSignature,
    //     paidAt: new Date()
    //   }
    // });

    /* -------------------------------------------------------------- */
    /* 7. Success                                                     */
    /* -------------------------------------------------------------- */

    return {
      success: true,
      txnSignature,
      amount: expected.transfers.reduce(
        (sum, t) => sum + t.lamports,
        0
      )
    };

  } catch (err) {
    console.error("verifyPayment error:", err);
    return {
      success: false,
      txnSignature,
      amount: 0
    };
  }
}
