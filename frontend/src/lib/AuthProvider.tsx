import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, sessionToken, UNAUTHORIZED_EVENT } from "./api";
import { AuthContext, type AuthState } from "./auth-context";
import type { Merchant } from "./types";

interface AuthResponse {
  token: string;
  merchant: Merchant;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null | undefined>(() => (sessionToken.get() ? undefined : null));

  // Validate a stored session on load.
  useEffect(() => {
    if (!sessionToken.get()) return;
    let alive = true;
    api<{ merchant: Merchant }>("/auth/me", { dashboard: true })
      .then((r) => alive && setMerchant(r.merchant))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) sessionToken.set("");
        // Network errors: stay logged out in the UI; the token is kept for a retry on reload.
        setMerchant(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Any 401 from an authenticated request ends the session.
  useEffect(() => {
    const onUnauthorized = () => {
      sessionToken.set("");
      setMerchant(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const accept = (r: AuthResponse) => {
    sessionToken.set(r.token);
    setMerchant(r.merchant);
  };

  const login = useCallback(async (email: string, password: string) => {
    accept(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }));
  }, []);

  const register = useCallback(async (input: { email: string; password: string; businessName: string }) => {
    accept(await api<AuthResponse>("/auth/register", { method: "POST", body: input }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST", dashboard: true });
    } catch {
      /* already invalid */
    }
    sessionToken.set("");
    setMerchant(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ merchant, login, register, logout, setMerchant }), [merchant, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
