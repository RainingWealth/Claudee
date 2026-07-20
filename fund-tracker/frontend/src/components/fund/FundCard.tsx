"use client";

import Link from "next/link";
import type { FundSummary } from "@/types/fund";
import { useReturns } from "@/hooks/useReturns";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { NavDisplay } from "./NavDisplay";
import { formatPercent, pctColor } from "@/lib/formatters";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface FundCardProps {
  fund: FundSummary;
  onDelete?: (id: number) => void;
}

export function FundCard({ fund, onDelete }: FundCardProps) {
  const { data: returns, isLoading: returnsLoading } = useReturns(fund.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 text-sm leading-snug truncate">
              {fund.name}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {fund.ticker && (
                <Badge variant="default">{fund.ticker}</Badge>
              )}
              {fund.is_demo && <Badge variant="demo">Demo</Badge>}
              {fund.asset_class && (
                <Badge variant="default">{fund.asset_class}</Badge>
              )}
            </div>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(fund.id)}
              className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-0.5"
              aria-label="Remove fund"
            >
              ✕
            </button>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-3">
        {/* Latest NAV */}
        <NavDisplay
          nav={fund.latest_nav}
          date={fund.latest_date}
          currency={fund.currency}
        />

        {/* Returns pills */}
        {returnsLoading ? (
          <LoadingSpinner size="sm" />
        ) : returns?.windows ? (
          <div className="flex gap-2">
            {returns.windows.map((w) => (
              <div key={w.label} className="flex-1 text-center">
                <p className="text-xs text-gray-400">{w.label}</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${pctColor(w.cagr)}`}
                >
                  {w.data_complete ? formatPercent(w.cagr) : "—"}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* View detail link */}
        <Link
          href={`/fund/${fund.id}`}
          className="block w-full text-center text-xs text-blue-600 hover:text-blue-800 hover:underline py-1 border border-blue-100 rounded-md hover:bg-blue-50 transition-colors"
        >
          View Full Report →
        </Link>
      </CardBody>
    </Card>
  );
}
