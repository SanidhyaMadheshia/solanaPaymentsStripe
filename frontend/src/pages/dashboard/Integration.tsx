import { ArrowRight, BookOpen, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Card, CardHeader, CodeBlock } from "@/components/ui";
import { dash } from "@/lib/api";
import { API_ORIGIN } from "@/lib/site";
import { createInvoiceCurl, createInvoiceNode, webhookHandlerNode, webhookPayload } from "@/lib/snippets";
import type { Merchant, Product } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";
import { PageHeader } from "./shared";

export default function Integration() {
  const products = useAsync((s) => dash.get<{ products: Product[] }>("/products", s), []);
  const settings = useAsync((s) => dash.get<Merchant>("/settings", s), []);
  const keys = useAsync((s) => dash.get<{ apiKeys: { revoked: boolean }[] }>("/api-keys", s), []);
  const [lang, setLang] = useState<"node" | "curl">("node");

  // API host (Render) can differ from the dashboard host (Vercel).
  const base = API_ORIGIN || window.location.origin;
  const firstProduct = products.data?.products.find((p) => p.active && p.prices.some((x) => x.active));
  const firstPrice = firstProduct?.prices.find((p) => p.active);
  const code = lang === "node" ? createInvoiceNode(base, firstProduct?.id, firstPrice?.id) : createInvoiceCurl(base, firstProduct?.id, firstPrice?.id);

  const checks = [
    { done: Boolean(settings.data?.walletAddress), label: "Receiving wallet configured", to: "/dashboard/settings" },
    { done: Boolean(firstPrice), label: "Active product with a price", to: "/dashboard/products" },
    { done: Boolean(keys.data?.apiKeys.some((k) => !k.revoked)), label: "Secret API key created", to: "/dashboard/api-keys" },
  ];

  return (
    <>
      <PageHeader
        title="Integration"
        description="Everything your server needs to start a checkout and handle payment events."
        actions={
          <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm text-fg underline underline-offset-4 hover:text-muted">
            <BookOpen className="h-4 w-4" /> Full documentation
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Checklist" />
        <ul className="grid gap-px bg-line sm:grid-cols-3">
          {checks.map((c) => (
            <li key={c.label} className="bg-surface">
              <Link to={c.to} className="flex items-center gap-3 px-5 py-4 text-sm hover:bg-surface-2">
                {c.done ? <CheckCircle2 className="h-5 w-5 text-sol-green" aria-label="Done" /> : <Circle className="h-5 w-5 text-subtle" aria-label="To do" />}
                <span className={cn(c.done ? "text-muted" : "text-fg")}>{c.label}</span>
                {!c.done && <ArrowRight className="ml-auto h-4 w-4 text-subtle" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold">1. Create an invoice from your server</h2>
          <p className="mt-1 text-sm text-muted">
            Call the API with a product and price ID. {firstProduct ? `The example uses “${firstProduct.name}”.` : "Create a product to prefill the IDs below."} Redirect the customer to the
            returned <code className="text-fg">checkout_url</code>.
          </p>
          <div className="mt-4 mb-2 flex gap-1" role="tablist" aria-label="Language">
            {(["node", "curl"] as const).map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={lang === l}
                onClick={() => setLang(l)}
                className={cn("rounded-md px-3 py-1 text-sm", lang === l ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
              >
                {l === "node" ? "Node.js" : "cURL"}
              </button>
            ))}
          </div>
          <CodeBlock code={code} title={lang === "node" ? "server.js" : "terminal"} />
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Handle the webhook</h2>
          <p className="mt-1 text-sm text-muted">
            When a payment is verified on-chain, SolPay POSTs an <code className="text-fg">invoice.paid</code> event to your <code className="text-fg">webhook_url</code>{" "}
            {settings.data?.defaultWebhookUrl ? (
              <>
                (or your default, <code className="text-fg">{settings.data.defaultWebhookUrl}</code>)
              </>
            ) : (
              "(or the default webhook URL from Settings)"
            )}
            . Verify the <code className="text-fg">X-SolPay-Signature</code> header with your webhook secret from{" "}
            <Link to="/dashboard/settings" className="text-fg underline underline-offset-4 hover:text-muted">Settings</Link>, stored as <code className="text-fg">SOLPAY_WEBHOOK_SECRET</code>.
          </p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <CodeBlock code={webhookHandlerNode} title="webhook.js" />
            <CodeBlock code={webhookPayload} title="Payload" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Test on Devnet</h2>
          <p className="mt-1 text-sm text-muted">
            Create a payment link from the Products page, open it, switch your wallet to Devnet and pay.
            {(
              <>
                {" "}
                Get free test SOL at{" "}
                <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-fg underline underline-offset-4 hover:text-muted">
                  faucet.solana.com
                </a>
                .
              </>
            )}{" "}
            The invoice shows up as Paid under Payments, along with its webhook delivery status.
          </p>
        </section>
      </div>
    </>
  );
}
