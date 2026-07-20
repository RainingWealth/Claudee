import useSWR from "swr";
import { getNews } from "@/lib/api";

export function useNews(fundId: number | null) {
  return useSWR(
    fundId ? `/funds/${fundId}/news` : null,
    () => getNews(fundId!),
    { revalidateOnFocus: false, dedupingInterval: 60_000 * 5 }
  );
}
