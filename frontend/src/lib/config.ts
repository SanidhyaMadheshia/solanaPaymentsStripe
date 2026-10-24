import { useEffect, useState } from "react";
import { api } from "./api";

export type Cluster = "devnet" | "testnet" | "mainnet-beta";

export interface AppConfig {
  cluster: Cluster;
  rpcUrl: string;
  appUrl: string;
  registrationEnabled: boolean;
  platformFeeLamports: number;
}

let cached: Promise<AppConfig> | null = null;

/** Runtime config served by the backend, so one frontend build works for any cluster. */
export function loadAppConfig(): Promise<AppConfig> {
  if (!cached) {
    cached = api<AppConfig>("/config").catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let alive = true;
    loadAppConfig().then(
      (c) => alive && setConfig(c),
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { config, error };
}
