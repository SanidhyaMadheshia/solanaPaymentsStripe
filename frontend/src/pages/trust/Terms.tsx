import { site } from "@/lib/site";
import { TrustLayout } from "./TrustLayout";

export default function Terms() {
  return (
    <TrustLayout title="Terms of Service" updated="October 2026">
      <p>By using {site.name}, as a merchant or as a customer paying through the hosted checkout, you agree to these terms.</p>
      <section>
        <h2>The service</h2>
        <p>
          {site.name} provides software to create invoices, present a hosted checkout and verify Solana payments. It is non-custodial: funds move directly from
          the buyer’s wallet to the merchant’s wallet, and {site.name} never takes possession of them.
        </p>
      </section>
      <section>
        <h2>Blockchain transactions are final</h2>
        <p>
          Confirmed Solana transactions cannot be reversed. Refunds, if any, are the merchant’s responsibility and must be arranged with the merchant directly.
          Always check the amount and network before approving a transaction in your wallet.
        </p>
      </section>
      <section>
        <h2>Merchant responsibilities</h2>
        <ul>
          <li>Keep your password, API keys and webhook secret private, and revoke or rotate anything you believe is compromised.</li>
          <li>Treat the signed webhook, not the browser redirect, as the source of truth for fulfilment.</li>
          <li>Comply with the laws, tax rules and consumer protection requirements that apply to your business.</li>
        </ul>
      </section>
      <section>
        <h2>Test networks</h2>
        <p>SolPay currently runs on Solana Devnet only. Devnet payments use test tokens with no monetary value; do not send real (Mainnet) SOL.</p>
      </section>
      <section>
        <h2>Disclaimer & liability</h2>
        <p>
          The service is provided “as is”, without warranties of any kind. To the maximum extent permitted by law, {site.name} is not liable for losses arising
          from network outages, wallet software, user error or the use of the service.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      </section>
    </TrustLayout>
  );
}
