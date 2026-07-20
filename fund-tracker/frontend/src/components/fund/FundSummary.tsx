import type { FundDetail } from "@/types/fund";
import { formatPercent } from "@/lib/formatters";

interface FundSummaryProps {
  fund: FundDetail;
}

export function FundSummary({ fund }: FundSummaryProps) {
  return (
    <div className="space-y-4">
      {fund.objective && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Objective
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
            {fund.objective}
          </p>
        </div>
      )}

      {fund.holdings.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Top Holdings
          </h3>
          <ul className="space-y-1.5">
            {fund.holdings.slice(0, 7).map((h, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{h.holding_name}</span>
                {h.weight != null && (
                  <span className="text-gray-500 tabular-nums ml-2 flex-shrink-0">
                    {(h.weight * 100).toFixed(2)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
