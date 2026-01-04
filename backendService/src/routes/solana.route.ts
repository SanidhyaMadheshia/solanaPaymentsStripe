
import { Router } from "express";
import { Connection } from "@solana/web3.js";
import { connection } from "../index.js";

const router = Router();




router.get("/transaction/:txSignature", async (req, res) => {
  const { txSignature } = req.params;
  console.log("Fetching transaction with signature :", txSignature);
  

  const MAX_WAIT_MS = 60_000;     // 60s
  const POLL_INTERVAL_MS = 1_000;

  const startTime = Date.now();

  try {
    while (Date.now() - startTime < MAX_WAIT_MS) {
      const status = await connection.getSignatureStatuses(
        [txSignature],
        { searchTransactionHistory: true }
      );

      const txStatus = status.value[0];

      // Not seen yet
      if (!txStatus) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Failed transaction
      if (txStatus.err) {
        return res.status(400).json({
          success: false,
          reason: "Transaction failed on-chain",
          error: txStatus.err
        });
      }

      // Finalized ✅
      if (txStatus.confirmationStatus === "finalized") {
        const txn = await connection.getParsedTransaction(
          txSignature,
          { maxSupportedTransactionVersion: 0 }
        );

        if (!txn) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        return res.status(200).json({
          success: true,
          txSignature: txn
        });
      }

      await sleep(POLL_INTERVAL_MS);
    }

    // Timeout
    return res.status(408).json({
      success: false,
      reason: "Transaction not finalized in time"
    });

  } catch (err) {
    console.error("Transaction fetch error:", err);
    return res.status(500).json({
      success: false,
      reason: "Internal server error"
    });
  }
});

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
