

import { Router } from "express"


import { Connection } from "@solana/web3.js";

console.log("hello solana ");


const router = Router();

export const connection = new Connection(
    "https://api.devnet.solana.com"
);

router.get("/transaction/:txSignature", async (req, res) => {


    const txSignature = req.params.txSignature;

    console.log("txSignature", txSignature);

    const MAX_WAIT_MS = 30_000;   // 30 seconds
    const POLL_INTERVAL_MS = 1_000;

    const startTime = Date.now();



    // await connection.confirmTransaction({
    //     signature: txSignature,
    //     abortSignal: undefined,
    //     }, "confirmed");

    // await connection.getSignatureStatuses([txSignature], {
    //     searchTransactionHistory : true 
    // });


    // const txn = await connection.getParsedTransaction(
    //         txSignature,
    //         {
    //             maxSupportedTransactionVersion: 0
    //         }
    //     );
    // console.log("txn", txn); 
    try {
        while (Date.now() - startTime < MAX_WAIT_MS) {
            const status = await connection.getSignatureStatuses(
                [txSignature],
                { searchTransactionHistory: true }
            );

            const txStatus = status.value[0];

            // Not yet seen
            if (!txStatus) {
                await sleep(POLL_INTERVAL_MS);
                continue;
            }

            // Transaction failed on-chain
            if (txStatus.err) {
                return res.status(400).json({
                    success: false,
                    reason: "Transaction failed",
                    error: txStatus.err,
                });
            }

            // Finalized ✅
            if (txStatus.confirmationStatus === "finalized") {


                const txn = await connection.getParsedTransaction(
                    txSignature,
                    {
                        maxSupportedTransactionVersion: 0
                    }
                );
                
                console.log("txn", txn);
                return res.status(200).json({
                    txSignature: txn
                })
            }

            // Still processing / confirmed
            await sleep(POLL_INTERVAL_MS);
        }

        // Timeout ❌
        return res.status(408).json({
            success: false,
            reason: "Verification failed (not finalized within time)",
        });

    } catch (err) {
        return res.status(500).json({ error: err });
    }

})


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;

// import { buffer } from "stream/consumers";
// import { sendSol, createToken, getMintData, sendUsingManualTransaction} from "./writedata.js";
// import { bufferToSpan } from "./borsh.js";

// writeData();

// sendSol();



// sendUsingManualTransaction();

// bufferToSpan();

// createToken();
// getMintData();




// console.log(txn?.transaction.message.instructions[0]);

// import { clusterApiUrl } from "@solana/web3.js";

// async function testConnection() {
//     try {
//         const connection = new Connection(clusterApiUrl("devnet"));

//         let res = await connection.getLatestBlockhash();
//         console.log("res", res);
//     } catch (err) {
//         console.log(err);
//     }
// }

// testConnection()




// import { Connection } from "@solana/web3.js";

// const connection = new Connection(process.env.SOLANA_RPC, "confirmed");

// router.get("/transaction/:txSignature", async (req, res) => {
//     const { txSignature } = req.params;




// });

// function sleep(ms: number) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }
