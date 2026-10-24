import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CodeBlock } from "@/components/ui";
import { API_ORIGIN } from "@/lib/site";
import { createInvoiceCurl, createInvoiceNode, createInvoiceResponse, retrieveInvoiceCurl, webhookHandlerNode, webhookPayload } from "@/lib/snippets";

const toc = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "create-invoice", label: "Create an invoice" },
  { id: "retrieve-invoice", label: "Retrieve an invoice" },
  { id: "checkout", label: "Hosted checkout" },
  { id: "webhooks", label: "Webhooks" },
  { id: "errors", label: "Errors" },
  { id: "networks", label: "Devnet" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line pb-12 pt-2 last:border-0">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        <a href={`#${id}`} className="hover:text-fg">
          {title}
        </a>
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-fg [&_pre_code]:bg-transparent [&_pre_code]:p-0">
        {children}
      </div>
    </section>
  );
}

function Callout({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${tone === "warning" ? "border-warning/30 bg-warning/5" : "border-line-strong bg-surface-2/50"}`}>
      <Icon className={`h-4 w-4 shrink-0 translate-y-0.5 ${tone === "warning" ? "text-warning" : "text-muted"}`} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function ParamTable({ rows }: { rows: [string, string, boolean, string][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-2/60 text-left text-xs uppercase tracking-wider text-subtle">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Field</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([name, type, required, desc]) => (
            <tr key={name}>
              <td className="whitespace-nowrap px-4 py-2.5 align-top">
                <code>{name}</code>
                {required && <span className="ml-2 text-xs font-medium text-warning">required</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 align-top text-subtle">{type}</td>
              <td className="px-4 py-2.5 align-top">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Docs() {
  const base = API_ORIGIN || window.location.origin;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-4 py-12 sm:px-6">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24" aria-label="Documentation">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">On this page</p>
            <ul className="space-y-1 border-l border-line">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-sm text-muted hover:border-fg hover:text-fg">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-10">
          <header>
            <p className="text-sm font-medium text-muted">Documentation</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Accept Solana payments</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Create an invoice from your server, redirect the customer to the hosted checkout, and fulfil the order when the signed webhook arrives.
            </p>
          </header>

          <Section id="overview" title="Overview">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <Link to="/register" className="text-fg underline underline-offset-4 hover:text-muted">Create an account</Link>, set your receiving wallet, create a
                product with a price and create a secret API key.
              </li>
              <li>
                Your server calls <code>POST /api/v1/userApi/invoices</code> and receives a <code>checkout_url</code>.
              </li>
              <li>The customer connects a wallet on the hosted checkout and approves a single transfer.</li>
              <li>SolPay waits for confirmation and checks that the exact amount reached your wallet.</li>
              <li>
                The invoice becomes <code>PAID</code>, the customer is sent to your <code>success_url</code> and your server receives an{" "}
                <code>invoice.paid</code> webhook.
              </li>
            </ol>
            <Callout>SolPay is non-custodial. Funds go straight from the customer’s wallet to yours; SolPay never holds keys or money.</Callout>
          </Section>

          <Section id="quickstart" title="Quickstart">
            <p>A minimal Express route that starts a checkout:</p>
            <CodeBlock code={createInvoiceNode(base)} title="server.js" />
          </Section>

          <Section id="authentication" title="Authentication">
            <p>
              Server-to-server calls use a secret key sent as a bearer token. Create keys under <strong className="text-fg">Dashboard → API keys</strong>. The
              full key is shown only once.
            </p>
            <CodeBlock code={`Authorization: Bearer sk_3f9a…`} language="http" />
            <Callout tone="warning">Never use a secret key in browser or mobile code. Keep it in your server’s environment and revoke it if it leaks.</Callout>
          </Section>

          <Section id="create-invoice" title="Create an invoice">
            <CodeBlock code={`POST ${base}/api/v1/userApi/invoices`} language="http" />
            <ParamTable
              rows={[
                ["product_id", "string", true, "ID of an active product."],
                ["price_id", "string", true, "ID of an active price belonging to the product."],
                ["numberOfItems", "integer", false, "Quantity, 1–10,000. Defaults to 1. The amount is price × quantity."],
                ["buyer_email", "string", false, "Customer email, shown on the checkout and included in the webhook."],
                ["success_url", "URL", false, "Where the customer is sent after a confirmed payment."],
                ["cancel_url", "URL", false, "Where the customer goes if they cancel."],
                ["webhook_url", "URL", false, "Overrides the default webhook URL from Settings for this invoice."],
                ["solAddress", "string", false, "Overrides the receiving wallet for this invoice."],
              ]}
            />
            <CodeBlock code={createInvoiceCurl(base)} title="Request" />
            <CodeBlock code={createInvoiceResponse} title="Response · 201 Created" />
            <p>
              Invoices expire after 30 minutes by default (<code>INVOICE_TTL_MINUTES</code>). The legacy endpoint <code>/api/v1/userApi/getSessionUrl</code> still
              works.
            </p>
          </Section>

          <Section id="retrieve-invoice" title="Retrieve an invoice">
            <p>
              Check the status of an invoice at any time, for example to reconcile if a webhook was missed. <code>status</code> is one of <code>PENDING</code>,{" "}
              <code>PAID</code>, <code>EXPIRED</code> or <code>CANCELLED</code>.
            </p>
            <CodeBlock code={retrieveInvoiceCurl(base)} title="Request" />
          </Section>

          <Section id="checkout" title="Hosted checkout">
            <p>The checkout page shows the order summary immediately. When the customer connects a wallet:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>A checkout session locks the invoice to that wallet for 10 minutes, so two devices can’t pay the same invoice at once.</li>
              <li>The customer approves one transaction with the exact transfer (plus an optional platform fee).</li>
              <li>SolPay polls the chain until the transaction reaches the configured commitment and verifies every transfer, the fee payer and the timing.</li>
              <li>The customer sees a receipt with an Explorer link and a button back to your <code>success_url</code>.</li>
            </ul>
            <Callout tone="warning">Don’t fulfil orders based on the redirect to success_url. Use the webhook or retrieve the invoice from your server.</Callout>
          </Section>

          <Section id="webhooks" title="Webhooks">
            <p>
              When an invoice is paid, SolPay sends a <code>POST</code> with a JSON body to the invoice’s <code>webhook_url</code>. Any <code>2xx</code> response
              counts as delivered. Other responses and timeouts (10 s) are retried with exponential backoff (30 s, 1 m, 2 m … up to 8 attempts). You can resend
              any event from the Payments page.
            </p>
            <CodeBlock code={webhookPayload} title="Payload" />
            <h3 className="pt-2 font-semibold text-fg">Verifying signatures</h3>
            <p>
              Every request includes <code>X-SolPay-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code>, an HMAC-SHA256 of <code>{"`${t}.${rawBody}`"}</code>{" "}
              using your store’s webhook secret (<strong className="text-fg">Dashboard → Settings → Webhook signing secret</strong>). Reject requests with an invalid signature or a timestamp more than 5 minutes old.
            </p>
            <CodeBlock code={webhookHandlerNode} title="webhook.js" />
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Delivery is at-least-once, so make your handler idempotent using <code>invoiceId</code>.</li>
              <li>Respond quickly and do slow work asynchronously.</li>
            </ul>
          </Section>

          <Section id="errors" title="Errors">
            <p>
              Errors return JSON with a <code>message</code> and a machine-readable <code>code</code>. Validation errors also include <code>issues</code>.
            </p>
            <CodeBlock
              code={`{
  "message": "Invalid request",
  "code": "validation_error",
  "issues": [{ "path": "success_url", "message": "Must be an http(s) URL" }]
}`}
              title="400 Bad Request"
            />
            <ParamTable
              rows={[
                ["400", "bad_request", false, "Invalid input, archived product/price or no receiving wallet configured."],
                ["401", "unauthorized", false, "Missing, malformed or revoked API key."],
                ["404", "not_found", false, "Product, price or invoice does not exist."],
                ["409", "conflict", false, "Checkout already in progress from another wallet, or a signature was reused."],
              ]}
            />
          </Section>

          <Section id="networks" title="Devnet">
            <p>
              SolPay runs on <strong className="text-fg">Solana Devnet</strong>. All payments use test SOL with no monetary value, so you can build and test your
              store integration end to end without real money.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Switch your wallet (Phantom, Solflare, Backpack) to Devnet in its settings.</li>
              <li>
                Get free test SOL at{" "}
                <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-fg underline underline-offset-4 hover:text-fg">
                  faucet.solana.com
                </a>
                .
              </li>
              <li>Transactions can be inspected on Solana Explorer with <code>?cluster=devnet</code>.</li>
            </ul>
            <Callout tone="warning">Never send Mainnet SOL to a Devnet checkout. It will not be detected and cannot be recovered by SolPay.</Callout>
          </Section>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
