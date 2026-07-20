"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { newId } from "@/lib/id";
import type { Portfolio, PortfolioHolding, PortfolioMode } from "@/types/portfolio";

const STORAGE_KEY = "ft.portfolios.v1";

/**
 * CRUD over portfolios persisted in localStorage.
 *
 * This is the seam for a future server-backed version: swap the internals
 * to fetch()/mutate calls against /api/v1/portfolios without touching any
 * component that consumes this hook.
 */
export function usePortfolios() {
  const [portfolios, setPortfolios] = useLocalStorage<Portfolio[]>(STORAGE_KEY, []);

  const create = useCallback(
    (name: string, mode: PortfolioMode, baseCurrency = "USD"): Portfolio => {
      const now = new Date().toISOString();
      const portfolio: Portfolio = {
        id: newId(),
        name,
        baseCurrency,
        mode,
        holdings: [],
        createdAt: now,
        updatedAt: now,
      };
      setPortfolios((prev) => [...prev, portfolio]);
      return portfolio;
    },
    [setPortfolios]
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Portfolio, "id" | "createdAt">>) => {
      setPortfolios((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
        )
      );
    },
    [setPortfolios]
  );

  const remove = useCallback(
    (id: string) => {
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
    },
    [setPortfolios]
  );

  const setHoldings = useCallback(
    (id: string, holdings: PortfolioHolding[]) => {
      update(id, { holdings });
    },
    [update]
  );

  const get = useCallback((id: string) => portfolios.find((p) => p.id === id), [portfolios]);

  return { portfolios, create, update, remove, setHoldings, get };
}
