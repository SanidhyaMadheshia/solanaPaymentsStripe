import { ExternalLink, Inbox, RefreshCw, Search, Send, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useToast } from "@/components/toast-context";
import { Badge, Button, Card, ConfirmModal, CopyField, EmptyState, Input, Modal, Skeleton, Spinner, StatusBadge } from "@/components/ui";
import { dash, errorMessage } from "@/lib/api";
import { explorerAddressUrl, explorerTxUrl, formatDate, formatSol, shortAddress, timeAgo } from "@/lib/format";
import type { Invoice, InvoiceDetail, InvoiceStatus } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";
import { useDashboardContext } from "./context";
import { ErrorPanel, PageHeader } from "./shared";

const filters: { value: InvoiceStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function webhookBadge(inv: Invoice) {
  if (!inv.webhookUrl) return <Badge>Not configured</Badge>;
  if (inv.webhookDeliveredAt) return <Badge tone="success">Delivered</Badge>;
  if (inv.status !== "PAID") return <Badge>Waiting for payment</Badge>;
  if (inv.webhookLastError) return <Badge tone="danger">Failing · {inv.webhookAttempts} attempts</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function InvoiceDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { config } = useDashboardContext();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync((signal) => (id ? dash.get<InvoiceDetail>(`/invoices/${id}`, signal) : Promise.resolve(null)), [id]);
  const [resending, setResending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const resend = async () => {
    if (!id) return;
    setResending(true);
    try {
      const r = await dash.post<{ result: string; webhookLastError: string | null }>(`/invoices/${id}/resend-webhook`);
      if (r.result === "delivered") toast.success("Webhook delivered");
      else toast.error(`Webhook failed: ${r.webhookLastError ?? r.result}`);
      reload();
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setResending(false);
    }
  };

  const cancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await dash.post(`/invoices/${id}/cancel`);
      toast.success("Invoice cancelled");
      setConfirmCancel(false);
      reload();
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal open={Boolean(id)} onClose={onClose} title="Invoice details" size="lg">
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading || !data ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">{data.productName ?? "Invoice"}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {formatSol(data.amount)} <span className="text-lg text-muted">{data.currency}</span>
              </p>
            </div>
            <StatusBadge status={data.status} />
          </div>

          <dl className="divide-y divide-line">
            <Row label="Invoice ID">
              <CopyField value={data.id} />
            </Row>
            <Row label="Checkout URL">
              <div className="flex items-center gap-2">
                <CopyField value={data.checkoutUrl} className="min-w-0" />
                <a href={data.checkoutUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-fg" aria-label="Open checkout">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </Row>
            <Row label="Quantity">
              {data.numberOfItems} × {formatSol(data.priceAmount ?? data.amount)} {data.currency}
            </Row>
            <Row label="Created">{formatDate(data.createdAt)}</Row>
            {data.status === "PENDING" && <Row label="Expires">{formatDate(data.expiresAt)}</Row>}
            {data.paidAt && <Row label="Paid">{formatDate(data.paidAt)}</Row>}
            {data.buyerEmail && <Row label="Customer">{data.buyerEmail}</Row>}
            {data.buyerWallet && (
              <Row label="Paid from">
                <a href={explorerAddressUrl(data.buyerWallet, config.cluster)} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-fg">
                  {shortAddress(data.buyerWallet, 8)}
                </a>
              </Row>
            )}
            {data.solAddress && (
              <Row label="Paid to">
                <a href={explorerAddressUrl(data.solAddress, config.cluster)} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-fg">
                  {shortAddress(data.solAddress, 8)}
                </a>
              </Row>
            )}
            {data.txHash && (
              <Row label="Transaction">
                <a href={explorerTxUrl(data.txHash, config.cluster)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-fg underline underline-offset-4 hover:text-muted">
                  {shortAddress(data.txHash, 10)} <ExternalLink className="h-3 w-3" />
                </a>
              </Row>
            )}
          </dl>

          <div className="rounded-xl border border-line bg-surface-2/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Webhook</p>
                <p className="mt-0.5 truncate text-xs text-muted">{data.webhookUrl ?? "No webhook URL for this invoice"}</p>
              </div>
              <div className="flex items-center gap-2">
                {webhookBadge(data)}
                {data.status === "PAID" && data.webhookUrl && (
                  <Button size="sm" variant="secondary" onClick={resend} loading={resending}>
                    <Send className="h-3.5 w-3.5" /> Resend
                  </Button>
                )}
              </div>
            </div>
            {data.webhookLastError && !data.webhookDeliveredAt && (
              <p className="mt-3 text-xs text-danger">
                Last error: {data.webhookLastError}
                {data.webhookNextAttemptAt && ` · next retry ${formatDate(data.webhookNextAttemptAt)}`}
              </p>
            )}
          </div>

          {data.sessions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Checkout attempts</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {data.sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{shortAddress(s.buyerWallet, 6)}</p>
                      <p className="text-xs text-subtle">{timeAgo(s.createdAt)}</p>
                      {s.verifyError && <p className="mt-1 text-xs text-danger">{s.verifyError}</p>}
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.status === "PENDING" && (
            <div className="flex justify-end">
              <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
                <XCircle className="h-4 w-4" /> Cancel invoice
              </Button>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        loading={cancelling}
        danger
        title="Cancel this invoice?"
        description="The checkout link will stop working. This cannot be undone."
        confirmLabel="Cancel invoice"
      />
    </Modal>
  );
}

export default function Payments() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as InvoiceStatus | "";
  const openId = params.get("invoice");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const [extra, setExtra] = useState<Invoice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, error, loading, reload } = useAsync(
    (signal) => {
      const sp = new URLSearchParams({ limit: "25" });
      if (status) sp.set("status", status);
      if (q) sp.set("q", q);
      return dash.get<{ invoices: Invoice[]; nextCursor: string | null }>(`/invoices?${sp}`, signal);
    },
    [status, q],
  );
  useEffect(() => {
    setExtra([]);
    setCursor(data?.nextCursor ?? null);
  }, [data]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const sp = new URLSearchParams({ limit: "25", cursor });
      if (status) sp.set("status", status);
      if (q) sp.set("q", q);
      const page = await dash.get<{ invoices: Invoice[]; nextCursor: string | null }>(`/invoices?${sp}`);
      setExtra((e) => [...e, ...page.invoices]);
      setCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key === "invoice" ? false : true });
  };

  const rows = [...(data?.invoices ?? []), ...extra];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every invoice created through the API or a payment link."
        actions={
          <Button variant="secondary" size="sm" onClick={reload}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Filter by status">
          {filters.map((f) => (
            <button
              key={f.label}
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setParam("status", f.value || null)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", status === f.value ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID, product, email, tx" className="pl-9" aria-label="Search invoices" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <ErrorPanel error={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Inbox className="h-5 w-5" />} title={q || status ? "No matching invoices" : "No payments yet"} description={q || status ? "Try a different filter or search." : "Invoices appear here as soon as they are created."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Product</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Customer</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer transition-colors hover:bg-surface-2" onClick={() => setParam("invoice", inv.id)}>
                    <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums">
                      <button className="text-left hover:underline focus-visible:underline" onClick={(e) => { e.stopPropagation(); setParam("invoice", inv.id); }}>
                        {formatSol(inv.amount)} {inv.currency}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3 text-muted">
                      {inv.productName ?? "—"}
                      {inv.numberOfItems > 1 && <span className="text-subtle"> × {inv.numberOfItems}</span>}
                    </td>
                    <td className="hidden max-w-[220px] truncate px-5 py-3 text-muted md:table-cell">{inv.buyerEmail ?? (inv.buyerWallet ? shortAddress(inv.buyerWallet) : "—")}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-muted" title={formatDate(inv.createdAt)}>
                      {timeAgo(inv.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cursor && (
          <div className="flex justify-center border-t border-line p-3">
            <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
          </div>
        )}
      </Card>

      <InvoiceDrawer id={openId} onClose={() => setParam("invoice", null)} onChanged={reload} />
    </>
  );
}
