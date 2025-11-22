// // "use client";

// // import React, { createContext, useContext, useState, useMemo } from "react";
// // import {
// //   useWallets,
// //   type UiWallet,
// //   type UiWalletAccount
// // } from "@wallet-standard/react";


// // import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
// // import { StandardConnect } from "@wallet-standard/core";
// // import { useSignAndSendTransaction } from "@solana/react";
// // import type { Connection, SendOptions, Transaction, TransactionSignature } from "@solana/web3.js";

// // // Create RPC connection
// // const RPC_ENDPOINT = "https://api.devnet.solana.com";
// // const WS_ENDPOINT = "wss://api.devnet.solana.com";
// // const chain = "solana:devnet";
// // const rpc = createSolanaRpc(RPC_ENDPOINT);
// // const ws = createSolanaRpcSubscriptions(WS_ENDPOINT);

// // interface SolanaContextState {
// //   // RPC
// //   rpc: ReturnType<typeof createSolanaRpc>;
// //   ws: ReturnType<typeof createSolanaRpcSubscriptions>;
// //   chain: typeof chain;

// //   // Wallet State
// //   wallets: UiWallet[];
// //   selectedWallet: UiWallet | null;
// //   selectedAccount: UiWalletAccount | null;
// //   isConnected: boolean;

// //   // Wallet Actions
// //   setWalletAndAccount: (
// //     wallet: UiWallet | null,
// //     account: UiWalletAccount | null
// //   ) => void;
// // }

// // export const SolanaContext = createContext<SolanaContextState | undefined>(undefined);

// // export function useSolana() {
// //   const context = useContext(SolanaContext);
// //   if (!context) {
// //     throw new Error("useSolana must be used within a SolanaProvider");
// //   }
// //   return context;
// // }

// // export function SolanaProvider({ children }: { children: React.ReactNode }) {
// //   const allWallets = useWallets();

// //   // Filter for Solana wallets only that support signAndSendTransaction
// //   const wallets = useMemo(() => {
// //     return allWallets.filter(
// //       (wallet) =>
// //         wallet.chains?.some((c) => c.startsWith("solana:")) &&
// //         wallet.features.includes(StandardConnect) &&
// //         wallet.features.includes("solana:signAndSendTransaction")
// //     );
// //   }, [allWallets]);

// //   // State management
// //   const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
// //   const [selectedAccount, setSelectedAccount] =
// //     useState<UiWalletAccount | null>(null);

// //   // Check if connected (account must exist in the wallet's accounts)
// //   const isConnected = useMemo(() => {
// //     if (!selectedAccount || !selectedWallet) return false;

// //     // Find the wallet and check if it still has this account
// //     const currentWallet = wallets.find((w) => w.name === selectedWallet.name);
// //     return !!(
// //       currentWallet &&
// //       currentWallet.accounts.some(
// //         (acc) => acc.address === selectedAccount.address
// //       )
// //     );
// //   }, [selectedAccount, selectedWallet, wallets]);

 

// //   const setWalletAndAccount = (
// //     wallet: UiWallet | null,
// //     account: UiWalletAccount | null
// //   ) => {
// //     setSelectedWallet(wallet);
// //     setSelectedAccount(account);
// //   };

  

// //   // Create context value
// //   const contextValue = useMemo<SolanaContextState>(
// //     () => ({
// //       // Static RPC values
// //       rpc,
// //       ws,
// //       chain,

// //       // Dynamic wallet values
// //       wallets,
// //       selectedWallet,
// //       selectedAccount,
// //       isConnected,
// //       setWalletAndAccount
// //     }),
// //     [wallets, selectedWallet, selectedAccount, isConnected]
// //   );

// //   return (
// //     <SolanaContext.Provider value={contextValue}>
// //       {children}
// //     </SolanaContext.Provider>
// //   );
// // }





// import React, {  useMemo } from "react";
// import {
//   ConnectionProvider,
//   WalletProvider,
// } from "@solana/wallet-adapter-react";
// import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
// import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
// import { clusterApiUrl } from "@solana/web3.js";

// // Import the wallet adapter styles
// import "@solana/wallet-adapter-react-ui/styles.css";

// interface SolanaProviderProps {
//   children: React.ReactNode;
// }

// export const SolanaProvider: React.FC<SolanaProviderProps> = ({ children }) => {
//   // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
//   const network = WalletAdapterNetwork.Devnet;

//   // You can also provide a custom RPC endpoint
//   const endpoint = useMemo(() => clusterApiUrl(network), [network]);

//   return (
//     <ConnectionProvider endpoint={endpoint}>
//       <WalletProvider wallets={[]} autoConnect>
//         <WalletModalProvider>{children}</WalletModalProvider>
//       </WalletProvider>
//     </ConnectionProvider>
//   );
// };



import {  useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import {
  PhantomWalletAdapter,
  
  SolflareWalletAdapter
} from "@solana/wallet-adapter-wallets";

export const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const endpoint = "https://api.devnet.solana.com";

  const wallets = useMemo(
    () => [
      
      new PhantomWalletAdapter(),
      
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
