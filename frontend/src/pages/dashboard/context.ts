import { useOutletContext } from "react-router";
import type { AppConfig } from "@/lib/config";

export interface DashboardContext {
  config: AppConfig;
}

export const useDashboardContext = () => useOutletContext<DashboardContext>();
