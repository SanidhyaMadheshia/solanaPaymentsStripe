import { ArrowRight, Check, CreditCard, KeyRound, Package, Percent, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router";
import { Card, CardHeader, EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { buttonClass } from "@/components/ui-variants";
import { dash } from "@/lib/api";
import { formatSol, timeAgo } from "@/lib/format";
import type { Overview as OverviewData } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";
import { ErrorPanel, PageHeader } from "./shared";

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Wallet; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-sm">{label}</span>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-subtle">{sub}</p>}
    </Card>
  );
}

function RevenueChart({ daily }: { daily: OverviewData["daily"] }) {
  const max = Math.max(...daily.map((d) => Number(d.total)), 0);
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Revenue per day for the last 14 days">
        {daily.map((d) => {
          const v = Number(d.total);
          const h = max > 0 ? Math.max(4, (v / max) * 100) : 4;
          const label = `${new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${formatSol(d.total)} SOL, ${d.count} payment${d.count === 1 ? "" : "s"}`;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 items-end" title={label}>
              <div className={cn("w-full rounded-t-md transition-colors", v > 0 ? "bg-[#d4d4d8] group-hover:bg-fg" : "bg-surface-3")} style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-subtle">
        <span>{new Date(daily[0]?.date ?? Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function SetupChecklist({ setup }: { setup: OverviewData["setup"] }) {
  const steps = [
    { done: setup.hasWallet, title: "Set your receiving wallet", text: "Where customer payments are sent.", to: "/dashboard/settings", cta: "Open settings" },
    { done: setup.hasProduct, title: "Create a product and price", text: "What your customers are paying for.", to: "/dashboard/products", cta: "Add product" },
    { done: setup.hasApiKey, title: "Create an API key", text: "Lets your server create checkouts.", to: "/dashboard/api-keys", cta: "Create key" },
    { done: setup.hasPayment, title: "Take a test payment", text: "Create a payment link and pay it on Devnet.", to: "/dashboard/products", cta: "Create link" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader
        title="Get set up"
        description={`${done} of ${steps.length} steps complete`}
        action={
          <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div className="h-full bg-fg" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        }
      />
      <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                  s.done ? "border-sol-green/40 bg-sol-green/15 text-sol-green" : "border-line-strong text-muted",
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" aria-label="Done" /> : i + 1}
              </span>
              <p className={cn("text-sm font-medium", s.done && "text-muted line-through")}>{s.title}</p>
            </div>
            <p className="mt-2 flex-1 text-xs text-muted">{s.text}</p>
            {!s.done && (
              <Link to={s.to} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-fg underline underline-offset-4 hover:text-muted">
                {s.cta} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function Overview() {
  const { data, error, loading, reload } = useAsync((signal) => dash.get<OverviewData>("/overview", signal), []);

  return (
    <>
      <PageHeader title={data?.merchant.name ? `Welcome, ${data.merchant.name}` : "Overview"} description="Your payments at a glance." />
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <SetupChecklist setup={data.setup} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Wallet} label="Total revenue" value={`${formatSol(data.totals.revenue, 4)} SOL`} sub="All confirmed payments" />
            <Stat icon={CreditCard} label="Payments" value={String(data.totals.payments)} sub={`${data.totals.invoices} invoices created`} />
            <Stat icon={Percent} label="Conversion" value={`${Math.round(data.totals.conversion * 100)}%`} sub="Paid / created invoices" />
            <Stat icon={TrendingUp} label="Open invoices" value={String(data.totals.pending)} sub={`${data.totals.expired} expired`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Revenue" description="Last 14 days, in SOL" />
              <div className="p-5">
                <RevenueChart daily={data.daily} />
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader
                title="Recent invoices"
                action={
                  <Link to="/dashboard/payments" className="text-xs font-medium text-fg underline underline-offset-4 hover:text-muted">
                    View all
                  </Link>
                }
              />
              {data.recentInvoices.length === 0 ? (
                <EmptyState
                  icon={<Package className="h-5 w-5" />}
                  title="No invoices yet"
                  description="Create a product, then a payment link or an API call to start."
                  action={
                    <Link to="/dashboard/products" className={buttonClass("secondary", "sm")}>
                      Go to products
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {data.recentInvoices.map((inv) => (
                    <li key={inv.id}>
                      <Link to={`/dashboard/payments?invoice=${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{inv.productName ?? "Invoice"}</p>
                          <p className="text-xs text-subtle">{timeAgo(inv.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm tabular-nums">{formatSol(inv.amount)} SOL</span>
                          <StatusBadge status={inv.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {!data.setup.hasApiKey && (
            <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-muted" aria-hidden />
                <p className="text-sm text-muted">Ready to integrate? Create an API key and follow the integration guide.</p>
              </div>
              <Link to="/dashboard/integration" className={buttonClass("secondary", "sm")}>
                Integration guide
              </Link>
            </Card>
          )}
        </>
      ) : null}
    </>
  );
}
