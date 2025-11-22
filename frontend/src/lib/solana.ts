import { signAndSendTransactionMessageWithSigners } from "@solana/kit";
import { type Connection, Transaction } from "@solana/web3.js";

import {useConnection, useWallet} from "@solana/wallet-adapter-react"
import type { WalletAdapterProps } from "@solana/wallet-adapter-base";


export async function pay ({
  txBase64,
  sendTransaction,
  connection
} : {
  txBase64 : string,
  sendTransaction : WalletAdapterProps['sendTransaction'],
  connection : Connection
}) {


  // const {connection} = useConnection();
  if ( !connection) {
    console.log('Wallet not connected or connection not established.');
    return;
  }

  const raw = Uint8Array.from(
    atob(txBase64),
    c => c.charCodeAt(0)
  );

  const tx = Transaction.from(raw);

  console.log(tx);
  


  try {
    // const recipientPublicKey = new PublicKey(recipientAddress);
    // const lamports = amountSol * 1_000_000_000; // Convert SOL to lamports

    // const transaction = new Transaction().add(
    //   SystemProgram.transfer({
    //     fromPubkey: publicKey,
    //     toPubkey: recipientPublicKey,
    //     lamports: lamports,
    //   })
    // );

    // tx.feePayer = publicKey;
    // const { blockhash } = await connection.getLatestBlockhash();
    // tx.recentBlockhash = blockhash;

    const signature = await sendTransaction(tx, connection);
    console.log('Transaction sent with signature:', signature);

    // Optional: Confirm the transaction
    // await connection.confirmTransaction(signature, 'confirmed');
    console.log('Transaction confirmed.');

    console.log(signature);

    return signature;

  } catch (error) {
    console.error('Error sending SOL:', error);
    // Handle error in UI
  }

}