"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Generic localStorage-backed state. SSR-safe: returns `initial` until
 * mounted on the client, then syncs to the stored value.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw));
    } catch {
      // Corrupt or inaccessible storage — fall back to initial value.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage full or unavailable — value still updates in memory.
        }
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    if (!hydrated) return;
    function onStorage(e: StorageEvent) {
      if (e.key !== key) return;
      try {
        setValue(e.newValue != null ? JSON.parse(e.newValue) : initial);
      } catch {
        // ignore malformed external updates
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  return [value, set];
}
