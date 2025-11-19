import { Transaction } from "@solana/web3.js";




export async function pay ({
  txBase64
} : {
  txBase64 : string
}) {

  const raw = Uint8Array.from(
    atob(txBase64),
    c => c.charCodeAt(0)
  );

  const tx = Transaction.from(raw);


  const signed = await 

}