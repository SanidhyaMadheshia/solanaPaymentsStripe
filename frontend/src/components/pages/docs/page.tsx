"use client"

import { Copy, Check, Zap, AlertCircle, CheckCircle2, ArrowRight, Wallet } from "lucide-react"
import { useState } from "react"

export default function Documentation() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative bg-[#0a0a0a] rounded-lg border border-[#262626] overflow-hidden font-mono">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
        <span className="text-xs text-gray-400">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#14F195] transition-colors"
        >
          {copiedCode === id ? (
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
      <pre className="p-4 overflow-x-auto text-sm text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/80 backdrop-blur-lg border-b border-[#262626]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-semibold">SolPay</span>
          </div>
          <div className="flex items-center gap-6 text-sm">

            {/* <a href="/"></a> */}
            <button className="px-4 py-2 bg-gradient-to-r from-[#9945FF] via-[#8752F3] to-[#14F195] rounded-lg hover:opacity-90 transition-all text-sm font-medium"
              onClick={() => {
                window.location.href = "/signup"
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#14F195]/10 rounded-full border border-[#14F195]/20">
            <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-[#14F195]">Built on Solana</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-[#14F195] to-[#9945FF] bg-clip-text text-transparent">
            Accept Solana Payments in Minutes
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            A Stripe-like payment infrastructure for Solana — fast, secure, non-custodial. Start accepting SOL payments
            with enterprise-grade reliability.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button className="px-8 py-3 bg-gradient-to-r from-[#9945FF] via-[#8752F3] to-[#14F195] rounded-lg hover:opacity-90 transition-all font-medium flex items-center justify-center gap-2"
              onClick={() => {
                window.location.href = "/"
              }}
            >
              Get API Key <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#050505] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {[
              { num: "1", title: "Create Product", desc: "Define your product" },
              { num: "2", title: "Create Invoice", desc: "Generate session" },
              { num: "3", title: "Redirect User", desc: "Hosted checkout" },
              { num: "4", title: "Wallet Signs", desc: "Client-side signing" },
              { num: "5", title: "Backend Verifies", desc: "On-chain validation" },
              { num: "6", title: "Success Redirect", desc: "Confirmation" },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-6 flex-1 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                    {step.num}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
                {idx < 5 && (
                  <div className="hidden md:flex justify-center py-4">
                    <ArrowRight className="w-5 h-5 text-[#14F195] transform rotate-90 md:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation */}


      {/* Backend Integration */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#050505] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-4">Backend Integration (Node.js)</h2>
            <p className="text-gray-400 mb-6">
              Your backend creates invoices and sessions. It generates unsigned Solana transactions but never touches
              private keys.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#14F195]/20 rounded-full flex items-center justify-center text-sm">
                  📝
                </span>
                Create Invoice API
              </h3>
              <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6 space-y-4">
                <CodeBlock id="create-invoice" language="http" code="POST /api/v1/userApi/getSessionUrl" />
                <div>
                  <p className="text-sm text-gray-400 mb-2">Request Body:</p>
                  <CodeBlock
                    id="invoice-req"
                    language="json"
                    code={`{
    
    "product_id" : "f4e8381d-1e4f-4ece-b5e9-de18adc066a5",
    "price_id" : "c128c6cd-f680-4fd0-8b25-04365f660b13",
    "buyer_email" : "sanidhyamadheshia@gmail.com",
    "success_url" : "http://localhost:5173/sucss",
    "cancel_url" : "http://localhost:5173/fail",
    "webhook_url" : "http://localhost:3000/webhook",
    "solAddress" : "SanFqibGFx9jRXW1p4uGDD11frUag7yhCjgPLmwUoNB",
    "numberOfItems" : 1
}`}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Response:</p>
                  <CodeBlock
                    id="invoice-res"
                    language="json"
                    code={`{
    "message": "Invoice created. Redirect customer to checkout.",
    "invoice_id": "cmjsxj7fu0004e5dbasu74yk9",
    "checkout_url": "https://yourgateway.com/checkout/cmjsxj7fu0004e5dbasu74yk9",
    "amount": "1",
    "currency": "SOL",
    "expires_at": "2025-12-30T18:52:30.857Z"
}`}
                  />
                </div>
                <div className="bg-[#14F195]/5 border border-[#14F195]/20 rounded-lg p-4 text-sm">
                  <p className="font-medium text-[#14F195] mb-2">💡 Pro Tips:</p>
                  <ul className="text-gray-300 space-y-1 text-xs">
                    <li>• Only one active session per invoice</li>
                    <li>• Sessions auto-expire after 5 minutes</li>
                    <li>• Checkout links are temporary and secure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Frontend Wallet Setup */}


      {/* Hosted Checkout */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#050505] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-4">Hosted Checkout Page</h2>
            <p className="text-gray-400 mb-6">
              Redirect users to our hosted checkout. It handles wallet connection, session management, payment details,
              and secure redirects automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-2xl p-8">
              <h3 className="font-semibold mb-4">Checkout Flow</h3>
              <div className="space-y-3">
                {["Fetch Invoice", "Open Socket", "Sign Tx", "Verify", "Redirect"].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#14F195]/20 rounded-full flex items-center justify-center text-xs font-semibold text-[#14F195]">
                      {idx + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#262626] rounded-2xl p-8">
              <h3 className="font-semibold mb-4">The checkout handles:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14F195] flex-shrink-0 mt-0.5" /> Wallet connection UI
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14F195] flex-shrink-0 mt-0.5" /> Session locking &
                  verification
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14F195] flex-shrink-0 mt-0.5" /> Payment details display
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14F195] flex-shrink-0 mt-0.5" /> Transaction signing UX
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14F195] flex-shrink-0 mt-0.5" /> Loading & confirmation states
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>



      {/* WebSockets */}
      {/* Webhooks */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#050505] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold mb-4">Webhooks</h2>
            <p className="text-gray-400 max-w-3xl">
              Webhooks are how SolPay notifies your backend about payment events in real time.
              They are <span className="text-white font-medium">server-to-server POST requests</span> and are the
              <span className="text-white font-medium"> source of truth</span> for payment confirmation.
            </p>
          </div>

          {/* Key Concepts */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
              <CheckCircle2 className="w-5 h-5 text-[#14F195] mb-3" />
              <h3 className="font-semibold mb-2">Guaranteed Delivery</h3>
              <p className="text-sm text-gray-400">
                Events are delivered <b>at least once</b>. Your endpoint must safely handle duplicate requests.
              </p>
            </div>

            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
              <Zap className="w-5 h-5 text-[#14F195] mb-3" />
              <h3 className="font-semibold mb-2">Fast Acknowledgment</h3>
              <p className="text-sm text-gray-400">
                Always respond quickly with a <b>2xx status</b>. Heavy processing should happen asynchronously.
              </p>
            </div>

            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
              <AlertCircle className="w-5 h-5 text-[#14F195] mb-3" />
              <h3 className="font-semibold mb-2">Retries on Failure</h3>
              <p className="text-sm text-gray-400">
                If your endpoint does not return <b>2xx</b>, SolPay retries delivery automatically.
              </p>
            </div>
          </div>

          {/* Payload */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Webhook Payload</h3>
            <p className="text-sm text-gray-400">
              Every webhook request contains a JSON payload describing the payment event.
            </p>

            <CodeBlock
              id="webhook-payload"
              language="json"
              code={`{
  "invoiceId": "cmjsxj7fu0004e5dbasu74yk9",
  "paymentId": "pay_7f82ab9",
  "status": "PAID",
  "amount": 1,
  "txHash": "5N8s...XfQe"
}`}
            />
          </div>

          {/* Expected Response */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Expected Response</h3>
            <p className="text-sm text-gray-400 max-w-3xl">
              SolPay considers a webhook <b>successfully delivered</b> when your server responds
              with any <b>2xx HTTP status</b>.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
                <p className="text-sm font-medium text-[#14F195] mb-2">✅ Success</p>
                <CodeBlock
                  id="webhook-success"
                  language="http"
                  code={`HTTP/1.1 200 OK`}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Any 2xx response indicates the event was received and acknowledged.
                </p>
              </div>

              <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
                <p className="text-sm font-medium text-red-400 mb-2">❌ Failure</p>
                <CodeBlock
                  id="webhook-failure"
                  language="http"
                  code={`HTTP/1.1 500 Internal Server Error`}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Non-2xx responses or timeouts trigger automatic retries.
                </p>
              </div>
            </div>
          </div>

          {/* Example Handler */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Example Webhook Handler (Node.js)</h3>
            <p className="text-sm text-gray-400 max-w-3xl">
              Respond immediately, then process the event asynchronously.
            </p>

            <CodeBlock
              id="webhook-handler"
              language="ts"
              code={`app.post("/webhook", async (req, res) => {
  const event = req.body;

  // Always acknowledge first
  res.status(200).send("OK");

  // Process asynchronously
  if (event.status === "PAID") {
    // Fulfill order
    // Update database
    // Grant access
  }
});`}
            />
          </div>

          {/* Best Practices */}
          <div className="bg-[#14F195]/5 border border-[#14F195]/20 rounded-xl p-6">
            <h3 className="font-semibold mb-3 text-[#14F195]">Best Practices</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Treat webhooks as the final payment confirmation</li>
              <li>• Make handlers idempotent using <code>invoiceId</code> or <code>paymentId</code></li>
              <li>• Never perform long-running tasks before responding</li>
              <li>• Do not rely on frontend redirects for payment status</li>
            </ul>
          </div>
        </div>
      </section>


      {/* Security Model */}


      {/* Error Handling */}

      {/* Test vs Live Mode */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold mb-4">Test Mode vs Live Mode</h2>
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-2xl p-8">
            <p className="text-gray-400 mb-6">Environment separation keeps your development and production safe:</p>
            <CodeBlock
              id="env-config"
              language="env"
              code={`# Development
PAYMENTS_MODE=dev
SOLANA_RPC_URL=https://api.devnet.solana.com

# Production
PAYMENTS_MODE=live
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`}
            />
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#262626]">
                <p className="text-sm font-semibold text-[#14F195] mb-2">Dev Mode</p>
                <p className="text-xs text-gray-400">Test with free Devnet SOL. No real transactions.</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#262626]">
                <p className="text-sm font-semibold text-[#14F195] mb-2">Live Mode</p>
                <p className="text-xs text-gray-400">Production with real SOL on Mainnet.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* End-to-End Flow */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#050505] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold mb-4">End-to-End Payment Flow</h2>
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-2xl p-8">
            <div className="space-y-4">
              {[
                { num: "1", title: "User clicks Pay button", time: "~100ms" },
                { num: "2", title: "Redirected to hosted checkout", time: "~200ms" },
                { num: "3", title: "Connects wallet (if needed)", time: "~2-5s" },
                { num: "4", title: "Reviews payment details", time: "Variable" },
                { num: "5", title: "Signs transaction in wallet", time: "~1-3s" },
                { num: "6", title: "Backend verifies signature", time: "~500ms" },
                { num: "7", title: "Sees confirmation overlay", time: "Instant" },
                { num: "8", title: "Redirected to success page", time: "~1s" },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {step.num}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{step.title}</p>
                  </div>
                  <span className="text-xs text-gray-500">{step.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#262626] py-16 px-4 bg-[#050505]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#14F195]" />
                SolPay
              </h3>
              <p className="text-sm text-gray-400">Fast, secure, non-custodial payments for everyone.</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Documentation</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Webhooks
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Examples
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Community</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Status</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    System Status
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Roadmap
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#262626] pt-8 text-center text-sm text-gray-500">
            <p>Built on Solana • Fast • Secure • Final</p>
            <p className="mt-2">© 2025 SolPay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
