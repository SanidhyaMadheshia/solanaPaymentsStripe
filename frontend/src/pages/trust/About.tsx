import { site } from "@/lib/site";
import { TrustLayout } from "./TrustLayout";

export default function About() {
  return (
    <TrustLayout title={`About ${site.name}`} subtitle="Payment infrastructure that makes accepting SOL feel like accepting cards.">
      <section>
        <h2>Why we built it</h2>
        <p>
          Web3 payments are usually hard to integrate: wallets, transaction building, confirmation tracking and edge cases all land on the merchant. {site.name}{" "}
          wraps that in a familiar, Stripe-style flow: products and prices, one API call to create an invoice, a hosted checkout and a webhook when the
          payment is final.
        </p>
      </section>
      <section>
        <h2>How it stays safe</h2>
        <ul>
          <li>Non-custodial: buyers send SOL directly to the merchant’s wallet. {site.name} never holds funds or private keys.</li>
          <li>Every payment is verified on-chain against the exact transfer that was requested.</li>
          <li>Webhooks are signed so merchants can trust that events come from their {site.name} instance.</li>
          <li>Each store has its own account, API keys and webhook signing secret.</li>
          <li>Open source, so you can audit how payments are verified.</li>
        </ul>
      </section>
      <section>
        <h2>Who it’s for</h2>
        <p>E-commerce stores adding crypto checkout, SaaS founders who want to monetise in SOL, and developers who want a simple API instead of wallet plumbing.</p>
      </section>
    </TrustLayout>
  );
}
