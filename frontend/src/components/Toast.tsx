import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ToastContext, type ToastApi, type ToastTone } from "./toast-context";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(() => ({ show, success: (m) => show(m, "success"), error: (m) => show(m, "error") }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-sm shadow-xl"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.tone === "success" && "text-sol-green", t.tone === "error" && "text-danger", t.tone === "info" && "text-info")} />
              <p className="flex-1 text-fg">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-subtle hover:text-fg" aria-label="Dismiss notification">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
