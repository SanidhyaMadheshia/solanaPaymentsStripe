import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";
export interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

export const ToastContext = createContext<ToastApi>({ show: () => {}, success: () => {}, error: () => {} });

export const useToast = () => useContext(ToastContext);
