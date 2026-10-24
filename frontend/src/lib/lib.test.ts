import { afterEach, describe, expect, it, vi } from "vitest";
import { safeNext, explorerTxUrl, formatCountdown, formatSol, safeHttpUrl, shortAddress, timeAgo } from "./format";

describe("formatSol", () => {
  it("trims zeros and groups thousands without float error", () => {
    expect(formatSol("0.50000000")).toBe("0.5");
    expect(formatSol("1234567.1")).toBe("1,234,567.1");
    expect(formatSol("0.1", 4)).toBe("0.1");
    expect(formatSol("0.123456789", 4)).toBe("0.1234");
    expect(formatSol("0")).toBe("0");
    expect(formatSol(null)).toBe("0");
    expect(formatSol(0.3)).toBe("0.3");
  });
});

describe("helpers", () => {
  it("shortens addresses", () => {
    expect(shortAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe("7xKX…gAsU");
    expect(shortAddress(null)).toBe("—");
  });
  it("formats countdowns", () => {
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(3725)).toBe("1:02:05");
    expect(formatCountdown(-5)).toBe("0:00");
  });
  it("relative time", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(timeAgo("2026-01-01T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-01-01T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-01-01T09:00:00Z", now)).toBe("3h ago");
  });
  it("explorer URLs include the cluster except on mainnet", () => {
    expect(explorerTxUrl("sig", "devnet")).toBe("https://explorer.solana.com/tx/sig?cluster=devnet");
    expect(explorerTxUrl("sig", "mainnet-beta")).toBe("https://explorer.solana.com/tx/sig");
  });
  it("only redirects into the dashboard after login", () => {
    expect(safeNext("/dashboard/products")).toBe("/dashboard/products");
    expect(safeNext("/dashboard?x=1")).toBe("/dashboard?x=1");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("/dashboardevil")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
  it("only allows http(s) redirect targets", () => {
    expect(safeHttpUrl("https://shop.example.com/x")).toBe("https://shop.example.com/x");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});

describe("api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses JSON errors into ApiError and fires the unauthorized event for the dashboard", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
    const events: string[] = [];
    vi.stubGlobal("window", { dispatchEvent: (e: Event) => events.push(e.type) });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: "Dashboard token required", code: "dashboard_token_required" }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { dash, sessionToken, ApiError, UNAUTHORIZED_EVENT } = await import("./api");
    sessionToken.set("tok");
    const err = (await dash.get("/overview").catch((e: unknown) => e)) as InstanceType<typeof ApiError>;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("dashboard_token_required");
    expect(events).toEqual([UNAUTHORIZED_EVENT]);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("reports network failures clearly and formats validation issues", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const { api, errorMessage, ApiError } = await import("./api");
    const err = (await api("/config").catch((e: unknown) => e)) as InstanceType<typeof ApiError>;
    expect(err.code).toBe("network_error");
    expect(errorMessage(new ApiError(400, "Invalid request", "validation_error", undefined, [{ path: "amount", message: "Too small" }]))).toBe("amount: Too small");
  });
});
