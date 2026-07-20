"use client";

import Link from "next/link";
import type { FundSummary } from "@/types/fund";
import { useReturns } from "@/hooks/useReturns";
import { formatCurrency, formatPercent, pctColor } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

interface FundListViewProps {
  funds: FundSummary[];
  onDelete?: (id: number) => void;
}

function FundRow({ fund, onDelete }: { fund: FundSummary; onDelete?: (id: number) => void }) {
  const { data: returns } = useReturns(fund.id);
  const windows = returns?.windows ?? [];
  const byLabel = (label: string) => windows.find((w) => w.label === label);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <Link href={`/fund/${fund.id}`} className="block">
          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{fund.name}</p>
          <div className="flex gap-1.5 mt-1">
            {fund.ticker && <Badge variant="default">{fund.ticker}</Badge>}
            {fund.is_demo && <Badge variant="demo">Demo</Badge>}
          </div>
        </Link>
      </td>
      <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">
        {fund.asset_class || "—"}
      </td>
      <td className="py-3 px-2 text-right text-sm font-medium tabular-nums whitespace-nowrap">
        {formatCurrency(fund.latest_nav, fund.currency)}
      </td>
      {["2Y", "3Y", "5Y"].map((label) => {
        const w = byLabel(label);
        return (
          <td
            key={label}
            className={`py-3 px-2 text-right text-sm font-semibold tabular-nums whitespace-nowrap ${pctColor(w?.cagr)}`}
          >
            {w?.data_complete ? formatPercent(w.cagr) : "—"}
          </td>
        );
      })}
      <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
        <Link
          href={`/fund/${fund.id}`}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mr-3"
        >
          View →
        </Link>
        {onDelete && (
          <button
            onClick={() => onDelete(fund.id)}
            className="text-gray-300 hover:text-red-500 transition-colors"
            aria-label="Remove fund"
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}

export function FundListView({ funds, onDelete }: FundListViewProps) {
  if (!funds.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg mb-1">No funds tracked yet.</p>
        <p className="text-sm">Search for a ticker, ISIN, or fund code above to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
            <th className="text-left py-2.5 pl-4 pr-2 font-medium">Fund</th>
            <th className="text-left py-2.5 px-2 font-medium">Class</th>
            <th className="text-right py-2.5 px-2 font-medium">NAV</th>
            <th className="text-right py-2.5 px-2 font-medium">2Y CAGR</th>
            <th className="text-right py-2.5 px-2 font-medium">3Y CAGR</th>
            <th className="text-right py-2.5 px-2 font-medium">5Y CAGR</th>
            <th className="py-2.5 pl-2 pr-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {funds.map((fund) => (
            <FundRow key={fund.id} fund={fund} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
