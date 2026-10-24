import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import { AlertTriangle, Clock, ExternalLink, Loader2, Lock, MonitorSmartphone, RefreshCw, ShieldCheck, TimerOff, Wallet, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button, CopyButton, Skeleton } from "@/components/ui";
import { buttonClass } from "@/components/ui-variants";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAppConfig, type AppConfig } from "@/lib/config";
import { explorerAddressUrl, explorerTxUrl, formatCountdown, formatSol, safeHttpUrl, shortAddress } from "@/lib/format";
import type { CheckoutResponse, CheckoutStatus, PublicInvoice, PublicSession } from "@/lib/types";
import { CheckoutShell, StateCard } from "./CheckoutShell";
import { SolanaWalletProvider } from "./SolanaWalletProvider";

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" }
  | { kind: "busy"; ttl: number }
  | { kind: "signing" }
  | { kind: "verifying"; signature: string }
  | { kind: "failed"; message: string; signature?: string | null }
  | { kind: "closed"; reason: "expired" | "cancelled" };

const POLL_MS = 2000;

/** Maps wallet-adapter errors to something a buyer understands. */
function walletErrorMessage(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (/reject|denied|declined|cancel/i.test(msg)) return "You cancelled the transaction in your wallet.";
  if (/insufficient|0x1\b|lamports/i.test(msg)) return "Your wallet doesn’t have enough SOL to cover the payment and network fee.";
  if (/blockhash/i.test(msg)) return "The transaction expired before it was sent. Please try again.";
  return msg || "The wallet could not send the transaction.";
}

function Countdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [left, setLeft] = useState(() => (new Date(expiresAt).getTime() - Date.now()) / 1000);
  const fired = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setLeft((new Date(expiresAt).getTime() - Date.now()) / 1000), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
  }, [left, onExpire]);
  const urgent = left < 120;
  return (
    <span className={urgent ? "text-warning" : "text-muted"} aria-live={urgent ? "polite" : "off"}>
      <Clock className="mr-1 inline h-3.5 w-3.5 -translate-y-px" aria-hidden />
      Expires in <span className="font-mono tabular-nums">{formatCountdown(left)}</span>
    </span>
  );
}

function OrderSummary({ invoice, config }: { invoice: PublicInvoice | null; config: AppConfig }) {
  if (!invoice) {
    return (
      <div className="space-y-4 p-6 sm:p-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-8 h-24 w-full" />
      </div>
    );
  }
  const unit = invoice.priceAmount ?? invoice.amount;
  const fee = config.platformFeeLamports / 1e9;
  return (
    <div className="p-6 sm:p-8">
      <p className="text-sm font-medium text-muted">{invoice.merchantName || "Checkout"}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{invoice.productName || "Payment"}</h1>
      {invoice.description && <p className="mt-2 text-sm leading-relaxed text-muted">{invoice.description}</p>}

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wider text-subtle">Amount due</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {formatSol(invoice.amount)} <span className="text-xl text-muted">{invoice.currency}</span>
        </p>
      </div>

      <dl className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface-2/60 text-sm">
        <div className="flex justify-between px-4 py-3">
          <dt className="text-muted">
            {invoice.productName || "Item"} × {invoice.numberOfItems}
          </dt>
          <dd>
            {formatSol(unit)} {invoice.currency} each
          </dd>
        </div>
        {fee > 0 && (
          <div className="flex justify-between px-4 py-3">
            <dt className="text-muted">Processing fee</dt>
            <dd>{formatSol(fee.toFixed(9))} SOL</dd>
          </div>
        )}
        <div className="flex justify-between px-4 py-3">
          <dt className="text-muted">Network fee</dt>
          <dd className="text-muted">≈ 0.000005 SOL</dd>
        </div>
        {invoice.solAddress && (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-muted">Pay to</dt>
            <dd className="flex items-center gap-1">
              <a href={explorerAddressUrl(invoice.solAddress, config.cluster)} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-fg">
                {shortAddress(invoice.solAddress, 6)}
              </a>
              <CopyButton value={invoice.solAddress} label="Copy receiving address" />
            </dd>
          </div>
        )}
        {invoice.buyerEmail && (
          <div className="flex justify-between gap-3 px-4 py-3">
            <dt className="text-muted">Receipt to</dt>
            <dd className="truncate">{invoice.buyerEmail}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 font-mono text-xs text-subtle">Invoice {invoice.id}</p>
    </div>
  );
}

function CheckoutInner({ invoiceId, config }: { invoiceId: string; config: AppConfig }) {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, wallet, disconnect } = useWallet();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [session, setSession] = useState<PublicSession | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  const walletAddress = publicKey?.toBase58();

  const applyResponse = useCallback(
    (res: CheckoutResponse) => {
      setInvoice(res.invoice);
      setSession(res.session);
      if (res.status === "paid") {
        navigate(`/success/${invoiceId}`, { replace: true });
      } else if (res.status === "expired" || res.status === "cancelled") {
        setPhase({ kind: "closed", reason: res.status });
      } else if (res.status === "verifying" && res.session?.txSignature) {
        setPhase({ kind: "verifying", signature: res.session.txSignature });
      } else {
        setPhase({ kind: "ready" });
      }
    },
    [invoiceId, navigate],
  );

  const load = useCallback(
    async (wallet?: string) => {
      try {
        const res = await api<CheckoutResponse>(`/invoice/${encodeURIComponent(invoiceId)}`, wallet ? { headers: { "x-wallet-address": wallet } } : {});
        applyResponse(res);
        return res;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const ttl = (err.details as { ttl?: number } | undefined)?.ttl ?? 0;
          setSession(null);
          setPhase({ kind: "busy", ttl });
        } else if (err instanceof ApiError && err.status === 404) {
          setPhase({ kind: "error", message: "This checkout link is invalid or has been removed." });
        } else {
          setPhase({ kind: "error", message: errorMessage(err) });
        }
        return null;
      }
    },
    [invoiceId, applyResponse],
  );

  // Initial load shows the order summary even before a wallet is connected.
  useEffect(() => {
    void load(walletAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // Poll verification status after the transaction was sent.
  useEffect(() => {
    if (phase.kind !== "verifying" || !session) return;
    let stop = false;
    const tick = async () => {
      try {
        const st = await api<CheckoutStatus>(`/invoice/${encodeURIComponent(invoiceId)}/status?sessionId=${encodeURIComponent(session.id)}`);
        if (stop) return;
        if (st.invoiceStatus === "PAID") {
          navigate(`/success/${invoiceId}`, { replace: true });
          return;
        }
        if (st.session?.status === "FAILED") {
          setPhase({ kind: "failed", message: st.session.verifyError ?? "Payment could not be verified.", signature: st.session.txSignature });
          return;
        }
      } catch {
        /* transient; keep polling */
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [phase.kind, session, invoiceId, navigate]);

  // Retry automatically when another device's session lock expires.
  useEffect(() => {
    if (phase.kind !== "busy" || !walletAddress) return;
    const t = setTimeout(() => void load(walletAddress), Math.max(5, phase.ttl + 1) * 1000);
    return () => clearTimeout(t);
  }, [phase, walletAddress, load]);

  const pay = async () => {
    if (!walletAddress) return;
    setNotice(null);
    setPhase({ kind: "signing" });
    // Refresh the session right before signing so the transaction has a fresh blockhash.
    const fresh = await load(walletAddress);
    const s = fresh?.session;
    if (!fresh || !s || fresh.status === "verifying") return;
    setPhase({ kind: "signing" });
    let signature: string;
    try {
      const raw = Uint8Array.from(atob(s.txHash), (c) => c.charCodeAt(0));
      signature = await sendTransaction(Transaction.from(raw), connection, { preflightCommitment: "confirmed" });
    } catch (err) {
      setNotice(walletErrorMessage(err));
      setPhase({ kind: "ready" });
      return;
    }
    setPhase({ kind: "verifying", signature });
    try {
      await api(`/invoice/${encodeURIComponent(invoiceId)}/confirm`, { method: "POST", body: { sessionId: s.id, signature } });
    } catch (err) {
      setPhase({ kind: "failed", message: errorMessage(err), signature });
    }
  };

  const onExpire = useCallback(() => {
    if (phase.kind === "ready" || phase.kind === "loading") void load(walletAddress);
  }, [phase.kind, load, walletAddress]);

  const cancelUrl = safeHttpUrl(invoice?.cancelUrl);
  const cancelHref = cancelUrl ?? `/failure?invoiceId=${encodeURIComponent(invoiceId)}&reason=cancelled`;

  if (phase.kind === "error") {
    return (
      <CheckoutShell cluster={config.cluster}>
        <StateCard icon={<XCircle className="h-8 w-8" />} tone="danger" title="Checkout unavailable">
          {phase.message}
        </StateCard>
      </CheckoutShell>
    );
  }
  if (phase.kind === "closed") {
    return (
      <CheckoutShell cluster={config.cluster}>
        <StateCard
          icon={<TimerOff className="h-8 w-8" />}
          tone="warning"
          title={phase.reason === "expired" ? "This checkout has expired" : "This checkout was cancelled"}
          actions={
            cancelUrl && (
              <a href={cancelUrl} className={buttonClass("secondary")}>
                Return to {invoice?.merchantName || "store"}
              </a>
            )
          }
        >
          No payment was taken. Please return to the store and start a new checkout.
        </StateCard>
      </CheckoutShell>
    );
  }

  const busy = phase.kind === "signing" || phase.kind === "verifying";

  return (
    <CheckoutShell cluster={config.cluster}>
      <div className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl lg:grid-cols-[1.1fr_1fr]">
        <section aria-label="Order summary" className="border-b border-line lg:border-b-0 lg:border-r">
          <OrderSummary invoice={invoice} config={config} />
        </section>

        <section aria-label="Payment" className="flex flex-col bg-surface-2/40 p-6 sm:p-8">
          <div className="flex items-center justify-between text-sm">
            <h2 className="font-semibold">Pay with Solana</h2>
            {invoice?.expiresAt && phase.kind !== "verifying" && <Countdown expiresAt={invoice.expiresAt} onExpire={onExpire} />}
          </div>

          <div className="mt-6 flex-1 space-y-4">
            {!connected ? (
              <>
                <div className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
                  <Wallet className="mb-3 h-5 w-5 text-muted" aria-hidden />
                  Connect a Solana wallet such as Phantom, Solflare or Backpack. You’ll review and approve one transaction.
                </div>
                <WalletMultiButton>Connect wallet</WalletMultiButton>
                {(
                  <p className="text-xs text-subtle">
                    This is a test payment on Solana Devnet. Switch your wallet to Devnet and get free test SOL from{" "}
                    <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-fg underline underline-offset-4 hover:text-muted">
                      faucet.solana.com
                    </a>
                    .
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
                  {wallet?.adapter.icon ? (
                    <img src={wallet.adapter.icon} alt="" className="h-9 w-9 rounded-lg" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3">
                      <Wallet className="h-4 w-4 text-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{wallet?.adapter.name ?? "Wallet"} connected</p>
                    <p className="truncate font-mono text-xs text-muted">{shortAddress(walletAddress, 6)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void disconnect()} disabled={busy}>
                    Change
                  </Button>
                </div>

                {phase.kind === "busy" && (
                  <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                    <p className="flex items-center gap-2 font-medium text-warning">
                      <MonitorSmartphone className="h-4 w-4" /> Checkout open on another device
                    </p>
                    <p className="mt-1 text-muted">
                      A different wallet is completing this payment. We’ll retry automatically
                      {phase.ttl > 0 ? ` in about ${formatCountdown(phase.ttl)}` : ""}.
                    </p>
                  </div>
                )}

                {phase.kind === "failed" && (
                  <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
                    <p className="flex items-center gap-2 font-medium text-danger">
                      <AlertTriangle className="h-4 w-4" /> Payment not verified
                    </p>
                    <p className="mt-1 text-muted">{phase.message}</p>
                    {phase.signature && (
                      <a href={explorerTxUrl(phase.signature, config.cluster)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-fg underline underline-offset-4 hover:text-muted">
                        View transaction <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {notice && (
                  <div role="alert" className="rounded-xl border border-line-strong bg-surface p-3 text-sm text-muted">
                    {notice}
                  </div>
                )}

                {phase.kind === "verifying" ? (
                  <div className="rounded-xl border border-line-strong bg-surface p-5 text-center" role="status">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" aria-hidden />
                    <p className="mt-3 font-medium">Confirming your payment…</p>
                    <p className="mt-1 text-xs text-muted">This usually takes a few seconds. Please keep this page open.</p>
                    <a href={explorerTxUrl(phase.signature, config.cluster)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-fg underline underline-offset-4 hover:text-muted">
                      Track on Solana Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <Button size="lg" className="w-full" onClick={pay} loading={phase.kind === "signing"} disabled={!invoice || phase.kind === "busy" || phase.kind === "loading"}>
                    {phase.kind === "signing" ? (
                      "Approve in your wallet…"
                    ) : phase.kind === "failed" ? (
                      <>
                        <RefreshCw className="h-4 w-4" /> Try again
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" /> Pay {invoice ? `${formatSol(invoice.amount)} ${invoice.currency}` : ""}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="mt-8 space-y-4">
            <p className="flex items-start gap-2 text-xs text-subtle">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              Funds go directly to the merchant’s wallet. Your keys never leave your wallet, and the payment is verified on-chain.
            </p>
            {!busy && (
              <a href={cancelHref} className="block text-center text-sm text-muted hover:text-fg">
                Cancel and return{invoice?.merchantName ? ` to ${invoice.merchantName}` : ""}
              </a>
            )}
          </div>
        </section>
      </div>
    </CheckoutShell>
  );
}

export default function CheckoutPage() {
  const { invoiceId = "" } = useParams();
  const { config, error } = useAppConfig();

  if (error) {
    return (
      <CheckoutShell>
        <StateCard icon={<XCircle className="h-8 w-8" />} tone="danger" title="Checkout unavailable">
          {errorMessage(error)}
        </StateCard>
      </CheckoutShell>
    );
  }
  if (!config) {
    return (
      <CheckoutShell>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted" aria-label="Loading checkout" />
        </div>
      </CheckoutShell>
    );
  }
  return (
    <SolanaWalletProvider rpcUrl={config.rpcUrl}>
      <CheckoutInner invoiceId={invoiceId} config={config} />
    </SolanaWalletProvider>
  );
}
