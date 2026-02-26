import useSWR from "swr";
import { listFunds, getFund } from "@/lib/api";

export function useFundList(demo?: boolean) {
  const key = demo !== undefined ? [`/funds`, demo] : `/funds`;
  return useSWR(key, () => listFunds(demo), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function useFundDetail(id: number | null) {
  return useSWR(id ? `/funds/${id}` : null, () => getFund(id!), {
    revalidateOnFocus: false,
  });
}
