import useSWR from "swr";
import { getReturns, getChart } from "@/lib/api";

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
