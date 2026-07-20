"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useBatchPrices } from "@/hooks/usePortfolioData";
import { computePortfolioTimeline, summarizeHolding, xirr, simpleReturn } from "@/lib/portfolio";
import { formatCurrency, formatPercent, formatChartDate, pctColor } from "@/lib/formatters";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { COLORS } from "@/lib/constants";
import type { PortfolioHolding } from "@/types/portfolio";

interface HoldingsResultsProps {
  holdings: PortfolioHolding[];
  baseCurrency: string;
}

export function HoldingsResults({ holdings, baseCurrency }: HoldingsResultsProps) {
  const fundIds = holdings.map((h) => h.fundId);
  const allContributions = holdings.flatMap((h) => h.contributions ?? []);
  const earliestBuyIn = allContributions.length
    ? allContributions.reduce((min, c) => (c.date < min ? c.date : min), allContributions[0].date)
    : undefined;

  const { data: pricesMap, isLoading } = useBatchPrices(fundIds, earliestBuyIn);

  if (isLoading) return <LoadingSpinner label="Computing portfolio history..." />;

  if (!allContributions.length) {
    return (
      <p className="text-sm text-gray-400 italic">
        No buy-ins recorded yet. Add a purchase date and amount for a holding above to see
        portfolio value over time.
      </p>
    );
  }

  const holdingsWithSeries = holdings.map((h) => ({
    holding: h,
    series: pricesMap.get(h.fundId)?.series ?? [],
  }));

  const timeline = computePortfolioTimeline(
    holdingsWithSeries.map(({ holding, series }) => ({
      contributions: holding.contributions ?? [],
      series,
    }))
  );

  const summaries = holdingsWithSeries.map(({ holding, series }) => ({
    holding,
    summary: summarizeHolding(holding, series),
  }));

  const totalInvested = summaries.reduce((s, x) => s + x.summary.invested, 0);
  const totalValue = summaries.reduce((s, x) => s + x.summary.currentValue, 0);
  const simple = simpleReturn(totalValue, totalInvested);

  const cashflows = [
    ...allContributions.map((c) => ({ amount: -c.amount, date: c.date })),
    { amount: totalValue, date: new Date().toISOString().slice(0, 10) },
  ];
  const annualized = xirr(cashflows);

  const unresolvedCount = summaries.reduce((s, x) => s + x.summary.unresolvedContributions, 0);

  return (
    <div className="space-y-6">
      {unresolvedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          {unresolvedCount} buy-in{unresolvedCount === 1 ? "" : "s"} predate{unresolvedCount === 1 ? "s" : ""}{" "}
          the available price history for their fund and were excluded from the totals below.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total Invested</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(totalInvested, baseCurrency)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Current Value</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(totalValue, baseCurrency)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Simple Return</p>
          <p className={`text-lg font-bold tabular-nums ${pctColor(simple)}`}>
            {simple != null ? formatPercent(simple) : "—"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">
            Annualised (XIRR)
          </p>
          <p className={`text-lg font-bold tabular-nums ${pctColor(annualized)}`}>
            {annualized != null ? formatPercent(annualized) : "—"}
          </p>
        </div>
      </div>

      {timeline.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Value Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeline} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 10, fill: COLORS.text }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v, baseCurrency)}
                tick={{ fontSize: 10, fill: COLORS.text }}
                tickLine={false}
                axisLine={false}
                width={78}
              />
              <Tooltip
                formatter={(value: number, key: string) => [
                  formatCurrency(value, baseCurrency),
                  key === "value" ? "Portfolio value" : "Invested",
                ]}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString("en-US", { dateStyle: "medium" })}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }}
              />
              <Legend
                formatter={(value) => (value === "value" ? "Portfolio value" : "Invested")}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Line type="monotone" dataKey="value" stroke={COLORS.line} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="invested" stroke={COLORS.grid} dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Per-Holding Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="text-left py-1.5 font-medium">Fund</th>
              <th className="text-right py-1.5 font-medium">Invested</th>
              <th className="text-right py-1.5 font-medium">Current Value</th>
              <th className="text-right py-1.5 font-medium">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summaries.map(({ holding, summary }) => {
              const r = simpleReturn(summary.currentValue, summary.invested);
              return (
                <tr key={holding.fundId}>
                  <td className="py-2 font-medium text-gray-700 truncate max-w-[160px]">{holding.name}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(summary.invested, baseCurrency)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(summary.currentValue, baseCurrency)}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${pctColor(r)}`}>
                    {r != null ? formatPercent(r) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Disclaimer
        text="Return figures reflect historical price movement only and are not a guarantee of
        future performance. XIRR is a money-weighted annualised return accounting for the timing
        and size of each buy-in. Educational purposes only — not investment advice."
      />
    </div>
  );
}
