import { Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router";
import { useAuth } from "@/lib/auth-context";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui-variants";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#fafafa" />
        <path d="M9 11.5h12.5l-2.5 2.5H6.5zM11.5 18h12.5l-2.5 2.5H9z" fill="#09090b" />
      </svg>
      {!compact && <span className="text-[15px] font-semibold tracking-tight text-fg">{site.name}</span>}
    </span>
  );
}

const links = [
  { to: "/#features", label: "Features" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/docs", label: "Docs" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { merchant } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label={`${site.name} home`}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {links.map((l) =>
            l.to.startsWith("/#") ? (
              <a key={l.to} href={l.to} className="text-sm text-muted transition-colors hover:text-fg">
                {l.label}
              </a>
            ) : (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cn("text-sm transition-colors hover:text-fg", isActive ? "text-fg" : "text-muted")}>
                {l.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <a href={site.githubUrl} target="_blank" rel="noreferrer" className={buttonClass("ghost", "icon", "hidden sm:inline-flex")} aria-label="GitHub repository">
            <Github className="h-4 w-4" />
          </a>
          {merchant ? (
            <Link to="/dashboard" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
                Log in
              </Link>
              <Link to="/register" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
                Sign up
              </Link>
            </>
          )}
          <button className={buttonClass("ghost", "icon", "md:hidden")} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
                {l.label}
              </a>
            ))}
            {merchant ? (
              <Link to="/dashboard" className={buttonClass("primary", "md", "mt-2")}>
                Dashboard
              </Link>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className={buttonClass("secondary", "md")}>
                  Log in
                </Link>
                <Link to="/register" className={buttonClass("primary", "md")}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const cols = [
    { title: "Product", items: [{ to: "/#features", label: "Features" }, { to: "/register", label: "Create account" }, { to: "/#how-it-works", label: "How it works" }] },
    { title: "Developers", items: [{ to: "/docs", label: "Documentation" }, { to: "/docs#webhooks", label: "Webhooks" }, { to: site.githubUrl, label: "GitHub", external: true }] },
    { title: "Company", items: [{ to: "/about", label: "About" }, { to: "/contact", label: "Contact" }, { to: "/privacy-policy", label: "Privacy" }, { to: "/terms", label: "Terms" }] },
  ];
  return (
    <footer className="border-t border-line bg-surface/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Non-custodial Solana payments for online stores. Funds go straight to your wallet.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="text-sm font-semibold text-fg">{c.title}</h3>
            <ul className="mt-3 space-y-2">
              {c.items.map((i) => (
                <li key={i.label}>
                  {"external" in i || i.to.startsWith("/#") ? (
                    <a href={i.to} {...("external" in i && { target: "_blank", rel: "noreferrer" })} className="text-sm text-muted hover:text-fg">
                      {i.label}
                    </a>
                  ) : (
                    <Link to={i.to} className="text-sm text-muted hover:text-fg">
                      {i.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-subtle">
        © {year} {site.name}. Built on Solana.
      </div>
    </footer>
  );
}
