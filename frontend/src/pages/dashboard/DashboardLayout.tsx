import { BookOpen, ChevronsUpDown, CreditCard, ExternalLink, KeyRound, LayoutDashboard, LogOut, Menu, Package, Plug, Settings as SettingsIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Logo } from "@/components/SiteChrome";
import { Button, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { clusterLabel } from "@/lib/format";
import { useAppConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { DashboardContext } from "./context";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/api-keys", label: "API keys", icon: KeyRound },
  { to: "/dashboard/integration", label: "Integration", icon: Plug },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end ?? false}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn("h-4 w-4", isActive ? "text-fg" : "text-subtle")} aria-hidden />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function AccountMenu({ compact }: { compact?: boolean }) {
  const { merchant, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!merchant) return null;
  const initial = (merchant.name || merchant.email || "?").trim().charAt(0).toUpperCase();
  const signOut = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2", compact && "w-auto px-1.5 py-1.5")}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-sm font-semibold">{initial}</span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{merchant.name ?? "My store"}</span>
              <span className="block truncate text-xs text-subtle">{merchant.email}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 text-subtle" aria-hidden />
          </>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className={cn("absolute z-50 w-56 animate-fade-in overflow-hidden rounded-lg border border-line-strong bg-surface-2 py-1 shadow-xl", compact ? "right-0 top-full mt-2" : "bottom-full left-0 mb-2")}>
            {compact && (
              <div className="border-b border-line px-3 py-2">
                <p className="truncate text-sm font-medium">{merchant.name}</p>
                <p className="truncate text-xs text-subtle">{merchant.email}</p>
              </div>
            )}
            <Link role="menuitem" to="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-3">
              <SettingsIcon className="h-4 w-4" /> Settings
            </Link>
            <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-3">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const { config, error } = useAppConfig();
  const { merchant } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (merchant === null) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="font-medium">Cannot reach the SolPay API</p>
          <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
          <Button variant="secondary" className="mt-5" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }
  if (!config || merchant === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted" />
      </div>
    );
  }

  const ctx: DashboardContext = { config };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/60 px-4 py-5 lg:flex">
        <Link to="/" className="px-2" aria-label="Home">
          <Logo />
        </Link>
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>
        <div className="space-y-1 border-t border-line pt-4">
          <Link to="/docs" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
            <BookOpen className="h-4 w-4" aria-hidden /> Documentation
          </Link>
          <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
            <ExternalLink className="h-4 w-4" aria-hidden /> Devnet faucet
          </a>
          <div className="pt-2">
            <AccountMenu />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="lg:hidden" aria-label="Home">
              <Logo compact />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-xs font-medium text-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
            Test mode · {clusterLabel(config.cluster)}
          </span>
            <div className="lg:hidden">
              <AccountMenu compact />
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 animate-fade-in border-r border-line bg-surface p-4">
              <div className="mb-6 flex items-center justify-between">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="Close navigation">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet context={ctx} />
        </main>
      </div>
    </div>
  );
}
