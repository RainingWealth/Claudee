import useSWR from "swr";
import { getReturns, getChart, getPrices } from "@/lib/api";

export function useReturns(fundId: number | null) {
  return useSWR(
    fundId ? `/funds/${fundId}/returns` : null,
    () => getReturns(fundId!),
    { revalidateOnFocus: false }
  );
}

export function useChart(fundId: number | null, period: string) {
  return useSWR(
    fundId ? `/funds/${fundId}/chart/${period}` : null,
    () => getChart(fundId!, period),
    { revalidateOnFocus: false, keepPreviousData: true }
  );
}

/**
 * Full (or date-bounded) NAV series for a fund. Unlike useChart (capped at
 * 1y/3y/5y), this supports arbitrary start dates — used for portfolio
 * buy-in return calculations.
 */
export function usePrices(fundId: number | null, start?: string, end?: string) {
  return useSWR(
    fundId ? `/funds/${fundId}/prices/${start ?? ""}/${end ?? ""}` : null,
    () => getPrices(fundId!, start, end),
    { revalidateOnFocus: false }
  );
}
