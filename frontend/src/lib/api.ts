import { API_BASE } from "./site";

const TOKEN_KEY = "solpay.session";
/** Fired when an authenticated request is rejected (session missing or expired). */
export const UNAUTHORIZED_EVENT = "solpay:unauthorized";

/** Login session token (Bearer sps_...). */
export const sessionToken = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? "",
  set: (t: string) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

export class ApiError extends Error {
  status: number;
  code: string | undefined;
  details: unknown;
  issues: { path: string; message: string }[] | undefined;
  constructor(status: number, message: string, code?: string, details?: unknown, issues?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.issues = issues;
  }
}

/** Turns an API error body into a human friendly message. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.issues?.length) return err.issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; ");
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

type Options = { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal; dashboard?: boolean };

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.dashboard) {
    const t = sessionToken.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
      signal: opts.signal ?? null,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Cannot reach the SolPay API. Is the backend running?", "network_error");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const d = (data ?? {}) as { message?: string; code?: string; details?: unknown; issues?: { path: string; message: string }[] };
    if (opts.dashboard && res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, d.message ?? `Request failed (${res.status})`, d.code, d.details, d.issues);
  }
  return data as T;
}

/** Dashboard API helper (adds the optional dashboard token). */
export const dash = {
  get: <T>(path: string, signal?: AbortSignal) => api<T>(`/dashboard${path}`, { dashboard: true, ...(signal && { signal }) }),
  post: <T>(path: string, body?: unknown) => api<T>(`/dashboard${path}`, { method: "POST", body: body ?? {}, dashboard: true }),
  put: <T>(path: string, body: unknown) => api<T>(`/dashboard${path}`, { method: "PUT", body, dashboard: true }),
  patch: <T>(path: string, body: unknown) => api<T>(`/dashboard${path}`, { method: "PATCH", body, dashboard: true }),
  del: (path: string) => api<void>(`/dashboard${path}`, { method: "DELETE", dashboard: true }),
};
