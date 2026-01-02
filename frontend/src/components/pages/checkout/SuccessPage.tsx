"use client"

import { useEffect, useState } from "react"
// import { useParams } from "next/navigation"
import { CheckCircle2, Copy, Check, ExternalLink, Zap, ArrowRight } from "lucide-react"
import { useParams } from "react-router"
import axios from "axios"

interface InvoiceResponse {
  txnSignature: string
  successUrl: string
  amount?: number
  currency?: string
  productName?: string
}

export default function SuccessPage() {
   const { invoiceId } = useParams<{ invoiceId: string }>();
   console.log("invoiceId", invoiceId);
//   const invoiceId = params.invoiceId as string

  const [res, setRes] = useState<InvoiceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!invoiceId) {
      
      setError("Invoice ID is missing")
      setLoading(false)
      return
    }

    async function fetchInvoice() {
      try {
        // const response = await fetch()
        const response = await axios.get<InvoiceResponse>(`${import.meta.env.VITE_BACKEND_URL}/invoice/txnSignature/${invoiceId}`);


        // if (!response.ok) {
        //   throw new Error("Failed to fetch invoice")
        // }
        console.log("response", response);
        const data: InvoiceResponse = response.data;

        setRes(data);

      } catch (err) {
        console.error("Error fetching invoice:", err)
        setError("Failed to load payment details")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId])

  const handleCopySignature = () => {
    if (res?.txnSignature) {
      navigator.clipboard.writeText(res.txnSignature)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#262626] p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-2 border-[#262626] border-t-[#14F195] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading payment confirmation...</p>
        </div>
      </div>
    )
  }

  if (error || !res) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] rounded-2xl border border-[#262626] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">{error || "Unable to load payment details"}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full py-3 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors border border-[#262626]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="border-b border-[#262626] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <span className="font-semibold">Solana Payments</span>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16">
        <div className="max-w-2xl w-full space-y-6">
          {/* Success Card */}
          <div className="bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] rounded-2xl border border-[#262626] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="border-b border-[#262626] p-8 bg-[#101010] text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Payment Successful!</h1>
              <p className="text-gray-400">Your transaction has been confirmed on Solana</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Payment Details */}
              {(res.productName || res.amount) && (
                <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#262626]">
                  <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Payment Details</h2>
                  <div className="space-y-3">
                    {res.productName && (
                      <div className="flex justify-between items-start">
                        <span className="text-gray-400">Product</span>
                        <span className="text-white font-medium text-right">{res.productName}</span>
                      </div>
                    )}
                    {res.amount && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Amount</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            {res.amount} {res.currency || "SOL"}
                          </div>
                        </div>
                      </div>
                    )}
                    {invoiceId && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Invoice ID</span>
                        <span className="text-white font-mono text-sm">{invoiceId.slice(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Signature */}
              <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#262626]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Transaction Signature</h2>
                  <button
                    onClick={handleCopySignature}
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
                <p className="text-white font-mono text-sm break-all bg-[#101010] p-4 rounded-lg border border-[#262626] mb-4">
                  {res.txnSignature}
                </p>
                <a
                  href={`https://explorer.solana.com/tx/${res.txnSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#14F195] hover:text-[#00FFA3] transition-colors text-sm font-medium"
                >
                  View on Solana Explorer
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Security Info */}
              <div className="flex items-start gap-3 p-4 bg-[#14F195]/5 rounded-lg border border-[#14F195]/20">
                <div className="w-5 h-5 rounded-full bg-[#14F195]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-[#14F195]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-[#14F195] font-medium mb-1">Transaction Verified</p>
                  <p className="text-xs text-gray-400">
                    Your payment has been verified on the Solana blockchain and is final.
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {res.successUrl && (
                  <a
                    href={res.successUrl}
                    className="flex-1 py-3 bg-gradient-to-r from-[#9945FF] via-[#8752F3] to-[#14F195] hover:opacity-90 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => (window.location.href = "/")}
                  className="flex-1 py-3 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg font-medium transition-colors border border-[#262626]"
                >
                  Back Home
                </button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-6 text-sm">
            <p className="text-gray-400 text-center">
              Keep this transaction signature for your records. You can verify it anytime on the Solana Explorer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
