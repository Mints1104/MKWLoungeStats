import { useCallback, useEffect, useRef, useState } from "react";

export function useAbortableRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlightRef = useRef(null);

  const abort = useCallback(() => {
    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }
  }, []);

  const run = useCallback(
    async (requestFn, { mapError } = {}) => {
      abort();

      const controller = new AbortController();
      inFlightRef.current = controller;

      try {
        setError("");
        setLoading(true);
        return await requestFn(controller.signal);
      } catch (err) {
        if (err?.name === "AbortError") {
          return null;
        }

        const message =
          typeof mapError === "function"
            ? mapError(err)
            : mapError || err?.message || "Request failed";
        setError(message);
        return null;
      } finally {
        if (inFlightRef.current === controller) {
          inFlightRef.current = null;
        }
        setLoading(false);
      }
    },
    [abort],
  );

  useEffect(() => abort, [abort]);

  return {
    loading,
    error,
    setError,
    run,
    abort,
  };
}

export default useAbortableRequest;