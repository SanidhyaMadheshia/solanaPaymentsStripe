import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { buttonClass } from "@/components/ui-variants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-6xl font-bold text-subtle">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">The page you are looking for doesn’t exist or has moved.</p>
        <div className="mt-8 flex gap-3">
          <Link to="/" className={buttonClass("secondary")}>
            Go home
          </Link>
          <Link to="/dashboard" className={buttonClass("primary")}>
            Dashboard
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
