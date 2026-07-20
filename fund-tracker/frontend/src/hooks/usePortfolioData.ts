"use client";

import useSWR from "swr";
import { getReturns, getScenarios, getPrices } from "@/lib/api";
import type { ReturnsData } from "@/types/returns";
import type { ScenariosData } from "@/types/scenario";
import type { ChartData } from "@/types/returns";

/** Batch-fetches trailing returns for every fund in a portfolio. */
export function useBatchReturns(fundIds: number[]) {
  const key = fundIds.length ? `portfolio-returns:${fundIds.join(",")}` : null;
  const { data, isLoading, error } = useSWR(key, async () => {
    const results = await Promise.all(
      fundIds.map(async (id) => {
        try {
          return [id, await getReturns(id)] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );
    return new Map<number, ReturnsData | null>(results);
  });
  return { data: data ?? new Map<number, ReturnsData | null>(), isLoading, error };
}

/** Batch-fetches scenario projections for every fund in a portfolio. */
export function useBatchScenarios(fundIds: number[]) {
  const key = fundIds.length ? `portfolio-scenarios:${fundIds.join(",")}` : null;
  const { data, isLoading, error } = useSWR(key, async () => {
    const results = await Promise.all(
      fundIds.map(async (id) => {
        try {
          return [id, await getScenarios(id)] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );
    return new Map<number, ScenariosData | null>(results);
  });
  return { data: data ?? new Map<number, ScenariosData | null>(), isLoading, error };
}

/** Batch-fetches full NAV price history (from `start`) for every fund in a portfolio. */
export function useBatchPrices(fundIds: number[], start?: string) {
  const key = fundIds.length ? `portfolio-prices:${fundIds.join(",")}:${start ?? ""}` : null;
  const { data, isLoading, error } = useSWR(key, async () => {
    const results = await Promise.all(
      fundIds.map(async (id) => {
        try {
          return [id, await getPrices(id, start)] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );
    return new Map<number, ChartData | null>(results);
  });
  return { data: data ?? new Map<number, ChartData | null>(), isLoading, error };
}
