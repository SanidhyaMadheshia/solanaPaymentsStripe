import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

/** Shared layout for About / Contact / Privacy / Terms. */
export function TrustLayout({ title, subtitle, updated, children }: { title: string; subtitle?: string; updated?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 py-16 sm:px-6">
        <article className="mx-auto max-w-3xl">
          <header className="border-b border-line pb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
            {updated && <p className="mt-3 text-xs text-subtle">Last updated {updated}</p>}
          </header>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-muted [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
