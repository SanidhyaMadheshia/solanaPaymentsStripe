import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { ReactNode } from "react";

/**
 * Wallets that implement the Wallet Standard (Phantom, Solflare, Backpack, ...) are detected
 * automatically, so no per-wallet adapters (and their large dependency trees) are bundled.
 */
export function SolanaWalletProvider({ rpcUrl, children }: { rpcUrl: string; children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={rpcUrl} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
