"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import clsx from "clsx";
import { useBatchReturns, useBatchScenarios } from "@/hooks/usePortfolioData";
import { weightedReturns, blendedProjections } from "@/lib/portfolio";
import { formatPercent, formatCurrency, pctColor } from "@/lib/formatters";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { COLORS } from "@/lib/constants";
import type { PortfolioHolding } from "@/types/portfolio";

interface AllocationResultsProps {
  holdings: PortfolioHolding[];
  baseCurrency: string;
}

export function AllocationResults({ holdings, baseCurrency }: AllocationResultsProps) {
  const [horizon, setHorizon] = useState(3);
  const fundIds = holdings.map((h) => h.fundId);
  const { data: returnsMap, isLoading: returnsLoading } = useBatchReturns(fundIds);
  const { data: scenariosMap, isLoading: scenariosLoading } = useBatchScenarios(fundIds);

  const totalWeight = holdings.reduce((s, h) => s + (h.targetWeightPct ?? 0), 0);

  if (returnsLoading || scenariosLoading) {
    return <LoadingSpinner label="Computing blended returns..." />;
  }

  const windows = weightedReturns(
    holdings.filter((h) => returnsMap.get(h.fundId)),
    new Map(
      Array.from(returnsMap.entries()).filter(([, v]) => v != null) as [number, NonNullable<ReturnType<typeof returnsMap.get>>][]
    )
  );

  const projections = blendedProjections(
    holdings.filter((h) => scenariosMap.get(h.fundId)),
    new Map(
      Array.from(scenariosMap.entries()).filter(([, v]) => v != null) as [number, NonNullable<ReturnType<typeof scenariosMap.get>>][]
    ),
    [1, 3, 5]
  );
  const proj = projections.find((p) => p.horizonYears === horizon);

  const chartData = proj
    ? [
        { label: "Bear", value: proj.bearValuePer1000, color: COLORS.bear },
        { label: "Base", value: proj.baseValuePer1000, color: COLORS.base },
        { label: "Bull", value: proj.bullValuePer1000, color: COLORS.bull },
      ]
    : [];

  return (
    <div className="space-y-6">
      {Math.abs(totalWeight - 100) > 0.01 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          Weights sum to {totalWeight.toFixed(1)}%, not 100% — returns below are computed on{" "}
          <strong>normalized</strong> weights (rescaled proportionally).
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Weighted Trailing Returns</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="text-left py-1.5 font-medium">Period</th>
              <th className="text-right py-1.5 font-medium">Blended CAGR</th>
              <th className="text-right py-1.5 font-medium">Blended Total Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {windows.map((w) => (
              <tr key={w.label}>
                <td className="py-2 font-medium text-gray-700">{w.label}</td>
                <td className={`py-2 text-right tabular-nums font-semibold ${pctColor(w.cagr)}`}>
                  {w.cagr != null ? formatPercent(w.cagr) : "—"}
                </td>
                <td className={`py-2 text-right tabular-nums ${pctColor(w.cumulativeReturn)}`}>
                  {w.cumulativeReturn != null ? formatPercent(w.cumulativeReturn) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {windows.some((w) => !w.dataComplete) && (
          <p className="text-xs text-amber-700 mt-2">
            Some constituent funds have incomplete history for one or more windows — blended
            figures for those windows may be understated.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Blended Forward Projection <span className="text-xs font-normal text-gray-400">(educational only)</span>
          </h3>
          <div className="flex gap-1">
            {[1, 3, 5].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={clsx(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  horizon === h ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {h}Y
              </button>
            ))}
          </div>
        </div>
        {proj && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Bear", cagr: proj.bearCagr, value: proj.bearValuePer1000, color: "text-red-600", bg: "bg-red-50 border-red-100" },
                { label: "Base", cagr: proj.baseCagr, value: proj.baseValuePer1000, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
                { label: "Bull", cagr: proj.bullCagr, value: proj.bullValuePer1000, color: "text-green-600", bg: "bg-green-50 border-green-100" },
              ].map(({ label, cagr, value, color, bg }) => (
                <div key={label} className={`rounded-lg border p-2.5 text-center ${bg}`}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-sm font-bold tabular-nums ${color}`}>{formatPercent(cagr)}/yr</p>
                  <p className="text-xs text-gray-600 mt-0.5 tabular-nums">{formatCurrency(value)} per $1k</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), `${horizon}Y value per $1k`]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
        <Disclaimer text="Blended from each holding's individual scenario projections, weighted by target allocation. Hypothetical — not a forecast." />
      </div>
    </div>
  );
}
