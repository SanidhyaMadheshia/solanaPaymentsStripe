import { ArrowRight, BadgeCheck, Code2, Globe2, KeyRound, ShieldCheck, Store, Webhook, Wallet, Zap } from "lucide-react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CodeBlock } from "@/components/ui";
import { buttonClass } from "@/components/ui-variants";

const features = [
  { icon: Wallet, title: "Non-custodial", text: "Buyers pay straight into your wallet. SolPay never holds funds or private keys." },
  { icon: BadgeCheck, title: "Verified on-chain", text: "Every payment is checked against the exact expected transfer before an invoice is marked paid." },
  { icon: Webhook, title: "Signed webhooks", text: "HMAC-signed invoice.paid events with automatic retries and one-click resend." },
  { icon: Globe2, title: "Hosted checkout", text: "A polished, mobile-friendly checkout page with wallet connect and live status." },
  { icon: KeyRound, title: "Simple API", text: "One authenticated call creates an invoice and returns a checkout URL." },
  { icon: Store, title: "Built for stores", text: "Sign up, add products and get your own API keys and webhook secret in minutes." },
];

const steps = [
  { title: "Create your account", text: "Sign up, set your receiving wallet and add products with prices." },
  { title: "Create an invoice", text: "Your server calls the API with a product and price to get a checkout URL." },
  { title: "Customer pays", text: "They connect a Solana wallet on the hosted checkout and approve one transaction." },
  { title: "Get notified", text: "SolPay verifies the transfer on-chain and sends your server a signed webhook." },
];

const snippet = `const res = await fetch("https://pay.example.com/api/v1/userApi/invoices", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.SOLPAY_SECRET_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    product_id: "prod_…",
    price_id: "price_…",
    success_url: "https://shop.example.com/thanks",
  }),
});

const { checkout_url } = await res.json();
// Redirect the customer to checkout_url`;

function CheckoutMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-2xl border border-line-strong bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-subtle">Acme Store</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2 py-0.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Devnet
          </span>
        </div>
        <p className="mt-4 text-sm text-muted">Pro plan · Monthly</p>
        <p className="mt-1 text-3xl font-semibold">
          0.25 <span className="text-lg text-muted">SOL</span>
        </p>
        <div className="mt-5 space-y-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Quantity</span>
            <span className="text-fg">1</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Network fee</span>
            <span className="text-fg">≈ 0.000005 SOL</span>
          </div>
        </div>
        <div className="mt-5 flex h-11 items-center justify-center rounded-lg bg-fg text-sm font-semibold text-bg">Pay 0.25 SOL</div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-subtle">
          <ShieldCheck className="h-3.5 w-3.5" /> Verified on the Solana blockchain
        </p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
                    <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-muted">
                <Zap className="h-3.5 w-3.5" /> Stripe-style payments for Solana
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Accept SOL payments <span className="text-muted">in minutes</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted">
                Create products, call one API, redirect to a hosted checkout. SolPay verifies each payment on-chain and notifies your backend with a signed
                webhook. No wallets or keys to manage on your servers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className={buttonClass("primary", "lg")}>
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/docs" className={buttonClass("secondary", "lg")}>
                  <Code2 className="h-4 w-4" /> Read the docs
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
                {[
                  ["~1s", "Typical confirmation"],
                  ["0%", "Custody of funds"],
                  ["1 call", "To start a checkout"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-2xl font-semibold">{v}</dd>
                    <dd className="mt-1 text-xs text-subtle">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <CheckoutMock />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to get paid in SOL</h2>
              <p className="mt-4 text-muted">The payment primitives you know from Stripe, rebuilt for a blockchain where settlement is final in seconds.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="group rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-surface-2 text-fg transition-colors group-hover:border-line-strong">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-surface/40 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
              <ol className="mt-10 space-y-8">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-sm font-semibold text-fg">{i + 1}</span>
                    <div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="self-center">
              <CodeBlock code={snippet} title="server.js — create a checkout" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to take your first payment?</h2>
            <p className="mt-4 text-muted">SolPay runs on Solana Devnet. Integrate your store and test the full flow with free test SOL, with no real money involved.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register" className={buttonClass("primary", "lg")}>
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/docs" className={buttonClass("outline", "lg")}>
                View documentation
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
