import { useEffect, useState } from 'react';
import { CheckCircle2, Wallet, Copy, Check, Zap } from 'lucide-react';
import { useParams } from 'react-router';
import { socket } from '../../../lib/socket';
import axios from 'axios';


import type { InvoiceResponse, Invoice, Session, InvoiceResponseERR } from '@/lib/types';
import { pay } from '@/lib/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/connectButton';

export default function Checkout() {

  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [invoice, setInvoice] = useState<Invoice>({} as Invoice);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [session, setSession] = useState<Session>();
  const [sessionAllowed, setSessionAllowed] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);
  const [solanaAddress, setSolanaAddress] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [txnCompleted, setTxnCompleted] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);


  const { invoiceId } = useParams();
  const { sendTransaction, connected, publicKey } = useWallet();
  console.log("connection : ", connected);

  const { connection } = useConnection();


  // 1️⃣ Fetch invoice + ask backend if session can be initiated
  useEffect(() => {
    console.log("connected changed :", connected);
    async function fetchInvoice() {
      try {
        const { data } = await axios.get<InvoiceResponse | InvoiceResponseERR>(
          `${import.meta.env.VITE_BACKEND_URL}/invoice/${invoiceId}`, {
          headers: {
            "x-wallet-address": publicKey?.toString() || "",
          },
        }
        );
        if (!(data && 'invoice' in data)) {
          // console.error("invoice fetch error", data);
          alert(data.message + data.status || "Error fetching invoice");
          setLoadingInvoice(false);
          window.location.href = "/failure";
          return;
        }
        if(data.invoice.status === "PAID") {
          window.location.href = `/success/${invoiceId}`;
          return;
        }
        setInvoice(data.invoice);
        setSession(data.session!);
        setLoadingInvoice(false);
        setSessionAllowed(true);
        setIsConnected(true);
        setWalletAddress(publicKey?.toString() || "");
        setSolanaAddress(data.invoice.solAddress || '');
        socket.connect();
        const onConnect = async () => {
          console.log("socketId : ", socket.id);
          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/invoice/${invoiceId}`,
            {
              socketId: socket.id,
              sessionId: data.session?.id,
            }
          );
          console.log(res);
          socket.emit("payment:initiate", invoiceId as string);
        };
        socket.on("connect", onConnect);
        // cleanup
        return () => {
          socket.off("connect", onConnect);
        };
      } catch (err) {
        console.error(err);
        setLoadingInvoice(false);
      }
    }
    if (connected) {
      console.log("fetching invoice");
      fetchInvoice();
    }

  }, [connected]);
  // Listen for backend verification event
  useEffect(() => {
    function handleVerified(data: any) {
      console.log("Payment verified by backend:", data);

      if (data?.success) {
        setIsVerified(true);
        window.location.href = `/success/${invoiceId}`;
      }
    }

    socket.on("payment:verified", handleVerified);
    return () => {
      socket.off("payment:verified", handleVerified);
    };
  }, [invoice]);



  const handleCopyAddress = () => {
    navigator.clipboard.writeText(solanaAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayment = async () => {
    try {
      setIsPaying(true);
      console.log("pay paramms : ", {
        txBase64: session?.txHash!,
        sendTransaction,
        connection,
      });
           
      const signature = await pay({
        txBase64: session?.txHash!,
        sendTransaction,
        connection,
      });

      if(!signature) {
        window.location.href='/failure';
        return;
      }

      setIsPaying(false);
      socket.emit("Client:PaymentDone", {
        txnSignature: signature ?? "",
        sessionId: session?.id,
        SocketId: socket.id!
      });

      

      // wait for backend to confirm it
      setIsWaitingForVerification(true);

    } catch (err) {
      console.error("Payment error:", err);
      setIsPaying(false);
    }
  };


  const orderDetails = {
    productName: invoice.productName || "Loading product...",
    description: "No description available.",
    amount: invoice.amount,
    currency: invoice.currency,
    usdValue: "None",
    orderId: invoiceId,
  };



  if (sessionAllowed === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 text-center">
        <div className="bg-[#1a1a1a] p-10 rounded-2xl border border-[#262626] max-w-md w-full">
          <h2 className="text-xl font-semibold text-white mb-2">
            Session Already Active
          </h2>
          <p className="text-gray-400">
            Another user has already initiated payment for this invoice.
          </p>
        </div>
      </div>
    );
  }



  // 3️⃣ Wallet connect overlay




  // 4️⃣ If payment completed
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


  // console.log(solana);
  console.log("isConnected", isConnected);
  return (
    <div className="relative min-h-screen bg-[#050505] flex flex-row items-center justify-center p-4 ">

      {isWaitingForVerification && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-white text-center space-y-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-300">Waiting for payment confirmation...</p>
          </div>
        </div>
      )}
      {!connected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg">
          hello
          <WalletButton />
        </div>
      )}


      <div className={`${!connected ? "blur-lg pointer-events-none select-none" : ""} max-w-2xl w-full`}>



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

            <p className="text-gray-400 text-sm">
              Secure payment powered by Solana blockchain
            </p>

            {/* TIMER AFTER WALLET CONNECTED */}
            {isConnected && sessionTimeLeft !== null && (
              <p className="text-[#14F195] text-xs mt-2">
                Session expires in: <span className="font-semibold">{sessionTimeLeft}s</span>
              </p>
            )}
          </div>


          {/* If invoice loading show skeleton */}
          <div className="p-6 space-y-6">
            <div className="bg-[#101010] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
                Order Summary
              </h2>

              {loadingInvoice ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-[#1f1f1f] rounded w-1/2"></div>
                  <div className="h-3 bg-[#1f1f1f] rounded w-3/4"></div>
                  <div className="h-px bg-[#262626] my-4"></div>
                  <div className="h-4 bg-[#1f1f1f] rounded w-1/3"></div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>


            {/* PAYMENT METHOD (unchanged UI) */}
            <div className="bg-[#101010] rounded-xl p-6 border border-[#262626]">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
                Payment Method
              </h2>

              {isConnected ? (
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
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-white font-mono text-sm break-all">
                      {solanaAddress}
                    </p>
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
              ) : (
                <p className="text-gray-500 text-sm">
                  Connect your wallet from the popup to continue.
                </p>
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
                  Your payment is secured by the Solana blockchain. Transactions are fast, low-cost, and final.
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
