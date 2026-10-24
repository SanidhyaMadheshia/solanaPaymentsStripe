import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/SiteChrome";
import { clusterLabel } from "@/lib/format";
import type { Cluster } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Minimal chrome for buyer-facing pages: logo, network badge, footer links. */
export function CheckoutShell({ cluster, children, className }: { cluster?: Cluster | undefined; children: ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-screen flex-col">
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        {cluster && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-xs font-medium text-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
            Solana {clusterLabel(cluster)}
          </span>
        )}
      </header>
      <main className={cn("mx-auto w-full max-w-5xl flex-1 px-4 pb-12 sm:px-6", className)}>{children}</main>
      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-6 text-xs text-subtle">
        <span>Secured by the Solana blockchain</span>
        <Link to="/terms" className="hover:text-fg">
          Terms
        </Link>
        <Link to="/privacy-policy" className="hover:text-fg">
          Privacy
        </Link>
        <Link to="/contact" className="hover:text-fg">
          Help
        </Link>
      </footer>
    </div>
  );
}

export function StateCard({ icon, tone = "neutral", title, children, actions }: { icon: ReactNode; tone?: "success" | "danger" | "warning" | "neutral"; title: string; children?: ReactNode; actions?: ReactNode }) {
  const ring = {
    success: "bg-sol-green/10 text-sol-green border-sol-green/30",
    danger: "bg-danger/10 text-danger border-danger/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    neutral: "bg-surface-2 text-muted border-line-strong",
  }[tone];
  return (
    <div className="mx-auto mt-8 max-w-md animate-slide-up rounded-2xl border border-line bg-surface p-8 text-center shadow-2xl">
      <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full border", ring)}>{icon}</div>
      <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
      {actions && <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">{actions}</div>}
    </div>
  );
}
