import { useState } from 'react';
import { CheckCircle2, Wallet, Copy, Check, Zap } from 'lucide-react';

export default function Checkout() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const orderDetails = {
    productName: 'Premium Subscription',
    description: 'Annual access to all premium features',
    amount: '0.5',
    currency: 'SOL',
    usdValue: '$85.00',
    orderId: '#ORD-2024-1847',
  };

  const solanaAddress = 'EaP5MoUPNmXfhvwVNvYDwjPUuJXjzSzVDkHtGFZgZqLN';

  const handleConnect = () => {
    setIsConnected(true);
    setWalletAddress('EaP5...ZqLN');
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(solanaAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setPaymentComplete(true);
    }, 2000);
  };

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] rounded-2xl border border-[#262626] p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-400 mb-6">Your transaction has been confirmed on Solana</p>
            <div className="bg-[#101010] rounded-lg p-4 mb-6 border border-[#262626]">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Amount Paid</span>
                <span className="text-white font-medium">
                  {orderDetails.amount} {orderDetails.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono text-xs">{orderDetails.orderId}</span>
              </div>
            </div>
            <button
              onClick={() => setPaymentComplete(false)}
              className="w-full py-3 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors border border-[#262626]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] rounded-2xl border border-[#262626] overflow-hidden shadow-2xl">
          <div className="border-b border-[#262626] p-6 bg-[#101010]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-white">Complete Payment</h1>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#14F195]/10 rounded-full border border-[#14F195]/20">
                <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-[#14F195]">Solana Network</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Secure payment powered by Solana blockchain</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-[#101010] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
                Order Summary
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{orderDetails.productName}</h3>
                    <p className="text-sm text-gray-400 mt-1">{orderDetails.description}</p>
                  </div>
                </div>

                <div className="h-px bg-[#262626] my-4"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Order ID</span>
                  <span className="text-white font-mono text-sm">{orderDetails.orderId}</span>
                </div>

                <div className="h-px bg-[#262626] my-4"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">Total Amount</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {orderDetails.amount} {orderDetails.currency}
                    </div>
                    <div className="text-sm text-gray-400">{orderDetails.usdValue} USD</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#101010] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
                Payment Method
              </h2>

              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#9945FF] via-[#8752F3] to-[#14F195] hover:opacity-90 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20"
                >
                  <Wallet className="w-5 h-5" />
                  Connect Solana Wallet
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#0a0a0a] rounded-lg border border-[#262626]">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">Solana Wallet Connected</p>
                      <p className="text-xs text-gray-400 truncate font-mono">{walletAddress}</p>
                    </div>
                    <div className="w-2 h-2 bg-[#14F195] rounded-full"></div>
                  </div>

                  <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#262626]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        Payment Address
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="flex items-center gap-1 text-xs text-[#14F195] hover:text-[#00FFA3] transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">{solanaAddress}</p>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={isPaying}
                    className="w-full py-4 bg-gradient-to-r from-[#9945FF] via-[#8752F3] to-[#14F195] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20"
                  >
                    {isPaying ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Processing Payment...
                      </span>
                    ) : (
                      `Pay ${orderDetails.amount} ${orderDetails.currency}`
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#14F195]/5 rounded-lg border border-[#14F195]/20">
              <div className="w-5 h-5 rounded-full bg-[#14F195]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-[#14F195]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#14F195] font-medium mb-1">Secure Payment</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your payment is secured by the Solana blockchain. Transactions are fast, low-cost, and
                  final.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#262626] p-4 bg-[#0a0a0a]">
            <p className="text-xs text-gray-500 text-center">
              Powered by Solana • Fast • Secure • Decentralized
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
