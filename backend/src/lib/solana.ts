import { createSolanaRpc } from "@solana/kit";
import {
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Connection,
    Transaction
} from "@solana/web3.js";
import { prisma } from "../db/src/prisma.js";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

export const connection = new Connection(
    "https://api.devnet.solana.com"
);

export const OWNER_PUBADDRESS = new PublicKey(
    "4sFbDaCJyFvwCfwsQy1mXSoQKGmhSEWw1xWAZV8HkHUC"
);

export async function createSolTransferTxn({
    recPubKey,
    senPubKey,
    amount
}: {
    recPubKey: string;
    senPubKey: string;
    amount: number;
}) {
    console.log(recPubKey, " ", senPubKey, " ", amount);

    const senderPubKey = new PublicKey(senPubKey);
    const recipientPubKey = new PublicKey(recPubKey);

    const transferAmount = Math.floor(amount * LAMPORTS_PER_SOL);

    const platformFee = Math.floor(0.00001 * LAMPORTS_PER_SOL);

    // === Instructions ===
    const instructionSolPay = SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: recipientPubKey,
        lamports: transferAmount
    });

    const instructionPlatformPay = SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: OWNER_PUBADDRESS,
        lamports: platformFee
    });

    // === Blockhash ===
    const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

    // === Build the unsigned transaction ===
    const txn = new Transaction().add(
        instructionSolPay,
        instructionPlatformPay
    );

    txn.feePayer = senderPubKey;
    txn.recentBlockhash = blockhash;
    txn.lastValidBlockHeight = lastValidBlockHeight;

    const serializedTxn = txn.serialize({
        requireAllSignatures: false
    })
    console.log(serializedTxn);

    return serializedTxn.toString("base64");
}


export function decodeTransferTxnHash(base64txn: string) {
    const txnBuffer = Buffer.from(base64txn, "base64");
    const txn = Transaction.from(txnBuffer);
    const feePayer = txn.feePayer?.toBase58();
    const recentBlockhash = txn.recentBlockhash;
    const instructions = txn.instructions.map((i, index) => {
        return {
            index,
            programId: i.programId,
            keys: i.keys.map((k) => ({
                pubKey: k.pubkey.toBase58(),

                isSigner: k.isSigner,
                isWritable: k.isWritable

            })),

            data: i.data.toString("hex")
        }
    });
    return {
        feePayer,
        recentBlockhash,
        instructions,
        instructionsCount: instructions.length
    }
}

export async function decodeTransferSignature(signature: string) {


    console.log("signature in decode ", signature)
    
    // await connection.confirmTransaction(signature, "confirmed");
    let txn = null;

    // 2. Retry getParsedTransaction for up to 2 seconds
    for (let i = 0; i < 10; i++) {
        txn = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });

        if (txn) break;

        // Wait 200ms
        await new Promise((res) => setTimeout(res, 200));
    }

    


    if (!txn) {
        console.log("txn not found");

        throw new Error("Transaction not found on chain");

    }


    return {
        slot: txn.slot,
        blockTime: txn.blockTime,
        status: txn.meta?.err ? "failed" : "success",

        fee: txn.meta?.fee,
        computeUnits: txn.meta?.computeUnitsConsumed,

        // All inner & top-level instructions
        instructions: txn.transaction.message.instructions.map((ix: any, i: number) => ({
            index: i,
            program: ix.program,
            programId: ix.programId,
            parsed: ix.parsed
        })),

        // token/sol balance changes
        preBalances: txn.meta?.preBalances,
        postBalances: txn.meta?.postBalances,

        logMessages: txn.meta?.logMessages
    };


}


export async function verifyPayment({
    sessionId,
    txnSignature,
    socketId
}: {
    sessionId: string;
    txnSignature: string;
    socketId: string
}) {


    try {



        const session = await prisma.checkoutSession.findUnique({
            where: {
                id: sessionId,
                socketid: socketId
            }
        });

        const txnHashDetails = decodeTransferTxnHash(session?.txHash!);


        const txnSignatureDetails = await decodeTransferSignature(txnSignature);


        if (txnSignatureDetails.status !== "success") {
            // throw new Error("Transaction failed on-chain");
            return {
                success: false,
                txnSignature
            }

        }

        const parsedTransfers = txnSignatureDetails.instructions.filter(
            (ix) => ix.program === "system" && ix.parsed.type === "transfer"
        );


        if (parsedTransfers.length !== txnHashDetails.instructionsCount) {
            // throw new Error("Instruction count mismatch");
            return {
                success: false,
                txnSignature
            }



        }




        for (let i = 0; i < parsedTransfers.length; i++) {
            const origIx = txnHashDetails.instructions[i];
            const signedIx = parsedTransfers[i];

            const origFrom = origIx!.keys.find((k) => k.isSigner)?.pubKey;
            const origTo = origIx!.keys.find((k) => !k.isSigner)?.pubKey;

            const signedFrom = signedIx!.parsed.info.source;
            const signedTo = signedIx!.parsed.info.destination;
            const signedLamports = signedIx!.parsed.info.lamports;

            if (origFrom !== signedFrom)
                throw new Error("Sender pubkey mismatch");

            if (origTo !== signedTo)
                throw new Error("Receiver pubkey mismatch");

            // Decode lamports from original base64 instruction
            const origLamports = Number(
                Buffer.from(origIx!.data, "hex").readBigUInt64LE(1)
            );

            if (origLamports !== signedLamports)
                throw new Error("Lamports mismatch");


        }


        if (txnHashDetails.feePayer !== txnSignatureDetails.instructions[0]!.parsed.info.source) {
            return {
                success: false,
                txnSignature,

            }

        }

        // 7. Now payment is verified
        console.log("Payment verified successfully");



        return {
            success: true,
            txnSignature,
            amount: txnSignatureDetails.fee
        }

    } catch (err) {
        console.log("err in verify payments ");
        return {
            success  : false,
            txnSignature,
            amount : 2
        }
    }











}