// "use client";

import { WalletConnectButton } from "@/components/connectButton";
import { MemoCard } from "@/components/MemoCard";
import { Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-1  max-h-0 bg-black/60 backdrop-blur-md">
        
      <div className="w-full max-w-md bg-[#0c0c0c] p-8 rounded-2xl border border-[#262626] shadow-lg space-y-6">

        {/* Solana Icon Header */}
        <div className="flex justify-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-[#9945FF] via-[#8752F3] to-[#14F195] rounded-xl flex items-center justify-center">
            <Wallet className="text-white w-6 h-6" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white text-center">
          Connect Your Wallet
        </h2>

        <p className="text-gray-400 text-center">
          Please connect your Solana wallet to continue.
        </p>

        {/* Your Existing Wallet Button */}
        <div className="flex justify-center">
          <WalletConnectButton />
        </div>

      </div>
    </div>
  );
}
