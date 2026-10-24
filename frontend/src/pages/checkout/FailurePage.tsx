import { XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { buttonClass } from "@/components/ui-variants";
import { CheckoutShell, StateCard } from "./CheckoutShell";

export default function FailurePage() {
  const [params] = useSearchParams();
  const invoiceId = params.get("invoiceId");
  const cancelled = params.get("reason") === "cancelled";

  return (
    <CheckoutShell>
      <StateCard
        icon={<XCircle className="h-8 w-8" />}
        tone={cancelled ? "warning" : "danger"}
        title={cancelled ? "Payment cancelled" : "Payment failed"}
        actions={
          <>
            {invoiceId && (
              <Link to={`/checkout/${encodeURIComponent(invoiceId)}`} className={buttonClass("primary")}>
                Try again
              </Link>
            )}
            <Link to="/contact" className={buttonClass("secondary")}>
              Contact support
            </Link>
          </>
        }
      >
        {cancelled
          ? "You left the checkout before paying. No funds were taken."
          : "Your payment could not be completed. No funds were taken unless your wallet shows a confirmed transaction."}
      </StateCard>
    </CheckoutShell>
  );
}
