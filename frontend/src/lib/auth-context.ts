import { createContext, useContext } from "react";
import type { Merchant } from "./types";

export interface AuthState {
  /** undefined while the stored session is being checked, null when logged out. */
  merchant: Merchant | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; businessName: string }) => Promise<void>;
  logout: () => Promise<void>;
  setMerchant: (m: Merchant) => void;
}

export const AuthContext = createContext<AuthState>({
  merchant: undefined,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setMerchant: () => {},
});

export const useAuth = () => useContext(AuthContext);
