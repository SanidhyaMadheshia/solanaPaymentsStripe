import { useState } from "react";
import { cn } from "@/lib/utils";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type Size = "sm" | "md" | "lg" | "icon";

export const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg font-semibold hover:bg-[#e4e4e7] active:bg-[#d4d4d8]",
  secondary: "bg-surface-3 text-fg border border-line-strong hover:bg-[#26262b]",
  outline: "border border-line-strong text-fg hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};
export const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-9 w-9",
};

/** Same look as Button, for router links / anchors. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn("inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200 whitespace-nowrap", variants[variant], sizes[size], className);
}

export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key = "default") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for insecure contexts (http://) where the clipboard API is unavailable.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), timeout);
  };
  return { copied, copy };
}

