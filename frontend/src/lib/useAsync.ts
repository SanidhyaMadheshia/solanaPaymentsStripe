import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

/** Small data-loading hook: runs `fn` on mount / when deps change, with abort + manual reload. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fnRef.current(ctrl.signal).then(
      (d) => {
        if (ctrl.signal.aborted) return;
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e) => {
        if (ctrl.signal.aborted || (e as Error)?.name === "AbortError") return;
        setError(e);
        setLoading(false);
      },
    );
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}
