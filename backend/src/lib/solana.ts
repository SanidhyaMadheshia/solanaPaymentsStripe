import { createSolanaRpc } from "@solana/kit";
import {
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Connection,
    Transaction
} from "@solana/web3.js";

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
        requireAllSignatures : false
    })
    console.log(serializedTxn);
    
    return serializedTxn.toString("base64");
}
