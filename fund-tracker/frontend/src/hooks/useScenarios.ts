import useSWR from "swr";
import { getScenarios } from "@/lib/api";

export function useScenarios(fundId: number | null) {
  return useSWR(
    fundId ? `/funds/${fundId}/scenarios` : null,
    () => getScenarios(fundId!),
    { revalidateOnFocus: false }
  );
}
