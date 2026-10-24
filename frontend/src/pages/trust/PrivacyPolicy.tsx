import { site } from "@/lib/site";
import { TrustLayout } from "./TrustLayout";

export default function PrivacyPolicy() {
  return (
    <TrustLayout title="Privacy Policy" updated="October 2026">
      <p>
        This policy explains what information {site.name} processes when merchants use the service and when customers pay through the hosted checkout.
      </p>
      <section>
        <h2>Information we process</h2>
        <ul>
          <li>Merchant account data: business name, login email, a salted hash of your password (never the password itself), receiving wallet address and webhook URL.</li>
          <li>Invoice data supplied by the merchant, such as product, amount and (optionally) the buyer’s email address.</li>
          <li>The buyer’s public wallet address and transaction signature. These are public on the Solana blockchain.</li>
          <li>Standard server logs (IP address, user agent, timestamps) used for security and debugging.</li>
        </ul>
      </section>
      <section>
        <h2>What we never collect</h2>
        <p>We never ask for, receive or store private keys, seed phrases or card details. Transactions are signed inside the buyer’s own wallet.</p>
      </section>
      <section>
        <h2>How information is used</h2>
        <ul>
          <li>To create invoices, verify payments and notify the merchant via webhooks.</li>
          <li>To provide support and detect, prevent and address abuse or technical issues.</li>
        </ul>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>
          Payment details are shared with the merchant you are paying. Transactions are broadcast to the Solana network through an RPC provider. We do not sell
          personal data.
        </p>
      </section>
      <section>
        <h2>Retention & your rights</h2>
        <p>
          Invoice records are kept for as long as the merchant needs them for accounting. On-chain data cannot be deleted by anyone. To request access to or
          deletion of off-chain data, contact <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      </section>
    </TrustLayout>
  );
}
