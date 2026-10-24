import type { Cluster } from "./config";

/** Formats a decimal SOL string without float rounding: trims trailing zeros, groups thousands. */
export function formatSol(value: string | number | null | undefined, maxDecimals = 9): string {
  if (value === null || value === undefined || value === "") return "0";
  const s = typeof value === "number" ? value.toFixed(9) : String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return s;
  const neg = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, "");
  const grouped = whole!.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}${trimmed ? "." + trimmed : ""}`;
}

export function shortAddress(addr: string | null | undefined, chars = 4): string {
  if (!addr) return "—";
  return addr.length <= chars * 2 + 3 ? addr : `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function formatDate(iso: string | Date | null | undefined, withTime = true): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
  });
}

export function timeAgo(iso: string | Date | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 0) return "just now";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d ago`;
  return formatDate(iso, false);
}

/** mm:ss countdown, or h:mm:ss for longer durations. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function clusterParam(cluster: Cluster | undefined) {
  return !cluster || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
}

export const explorerTxUrl = (sig: string, cluster?: Cluster) => `https://explorer.solana.com/tx/${sig}${clusterParam(cluster)}`;
export const explorerAddressUrl = (addr: string, cluster?: Cluster) =>
  `https://explorer.solana.com/address/${addr}${clusterParam(cluster)}`;

export function clusterLabel(cluster: Cluster | undefined) {
  if (cluster === "mainnet-beta") return "Mainnet";
  if (cluster === "testnet") return "Testnet";
  return "Devnet";
}

/** Only allow http(s) URLs to be used as navigation targets. */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Only allow post-login redirects back into the dashboard (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/dashboard(\/|\?|$)/.test(next) ? next : "/dashboard";
}
