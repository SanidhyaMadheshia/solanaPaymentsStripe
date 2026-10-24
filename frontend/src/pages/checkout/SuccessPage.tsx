import { ArrowRight, CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { CopyField } from "@/components/ui";
import { buttonClass } from "@/components/ui-variants";
import { api, ApiError, errorMessage } from "@/lib/api";
import { explorerTxUrl, formatDate, formatSol, safeHttpUrl, shortAddress } from "@/lib/format";
import type { PaymentReceipt } from "@/lib/types";
import { CheckoutShell, StateCard } from "./CheckoutShell";

export default function SuccessPage() {
  const { invoiceId = "" } = useParams();
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<PaymentReceipt>(`/invoice/txnSignature/${encodeURIComponent(invoiceId)}`, { signal: ctrl.signal })
      .then(setReceipt)
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof ApiError && e.status === 404 ? "We couldn’t find a confirmed payment for this invoice yet." : errorMessage(e));
      });
    return () => ctrl.abort();
  }, [invoiceId]);

  if (error) {
    return (
      <CheckoutShell>
        <StateCard
          icon={<XCircle className="h-8 w-8" />}
          tone="danger"
          title="Payment not found"
          actions={
            <Link to={`/checkout/${encodeURIComponent(invoiceId)}`} className={buttonClass("secondary")}>
              Back to checkout
            </Link>
          }
        >
          {error}
        </StateCard>
      </CheckoutShell>
    );
  }
  if (!receipt) {
    return (
      <CheckoutShell>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted" aria-label="Loading receipt" />
        </div>
      </CheckoutShell>
    );
  }

  const continueUrl = safeHttpUrl(receipt.successUrl);
  return (
    <CheckoutShell cluster={receipt.cluster}>
      <StateCard
        icon={<CheckCircle2 className="h-8 w-8" />}
        tone="success"
        title="Payment successful"
        actions={
          <>
            {continueUrl && (
              <a href={continueUrl} className={buttonClass("primary", "lg")}>
                Continue <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <a href={explorerTxUrl(receipt.txnSignature, receipt.cluster)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg")}>
              View on Explorer <ExternalLink className="h-4 w-4" />
            </a>
          </>
        }
      >
        <p>Your payment was confirmed on the Solana blockchain.</p>
        <dl className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface-2/60 text-left text-sm">
          {receipt.productName && (
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">Item</dt>
              <dd className="text-right text-fg">
                {receipt.productName}
                {receipt.numberOfItems > 1 ? ` × ${receipt.numberOfItems}` : ""}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">Amount paid</dt>
            <dd className="font-semibold text-fg">
              {formatSol(receipt.amount)} {receipt.currency}
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">Date</dt>
            <dd className="text-fg">{formatDate(receipt.paidAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted">Transaction</dt>
            <dd className="min-w-0">
              <CopyField value={receipt.txnSignature} display={shortAddress(receipt.txnSignature, 8)} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted">Invoice</dt>
            <dd className="min-w-0">
              <CopyField value={invoiceId} display={shortAddress(invoiceId, 8)} />
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-subtle">Keep the transaction signature for your records.</p>
      </StateCard>
    </CheckoutShell>
  );
}
