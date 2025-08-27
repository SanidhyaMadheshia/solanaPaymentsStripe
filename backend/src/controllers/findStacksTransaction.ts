// GET API endpoint
import type { Request, Response } from "express";
import { fetchTransaction } from "../utils/findSenderTransaction.js";
import { filterTransaction } from "../utils/filterTransaction.js";

export default async function findStacksTransaction(req: Request, res: Response) {
  const { address } = req.body;

  console.log(`Polling for new transactions from ${address}...`);

  const startTime = Date.now();
  let interval: NodeJS.Timeout;

  // Helper to safely respond once
  const safeRespond = (data: any) => {
    if (!res.writableEnded) { // make sure response is still open
      clearInterval(interval); // 🛑 stop polling
      res.json(data);
    }
  };

  interval = setInterval(async () => {
    try {
      const txns = await fetchTransaction(address);
      const senderTxns = filterTransaction(txns, address);

      console.log("Checking last 1 min...");

      // Only recent txns (within last 1 min)
      const recent = senderTxns.filter((tx) => {
        const txTime = tx.burn_block_time_iso
          ? new Date(tx.burn_block_time_iso).getTime()
          : 0;
        return Date.now() - txTime <= 60 * 1000;
      });

      if (recent.length > 0) {
        console.log("✅ Found new transaction!");
        safeRespond({
          success: true,
          message: "New transaction found",
          transactions: recent,
        });
      } else if (Date.now() - startTime > 5 * 60 * 1000) {
        console.log("⏳ Timeout reached, stopping polling...");
        safeRespond({
          success: false,
          message: "No new transaction within 5 minutes",
        });
      }
    } catch (err) {
      console.error("❌ Error:", err);
      safeRespond({ error: "Error fetching transactions" });
    }
  }, 10 * 1000);
}
