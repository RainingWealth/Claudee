"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { useChart } from "@/hooks/useReturns";
import { formatCurrency, formatChartDate } from "@/lib/formatters";
import { CHART_PERIODS, type ChartPeriod, COLORS } from "@/lib/constants";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import clsx from "clsx";

interface PerformanceChartProps {
  fundId: number;
  currency?: string;
}

export function PerformanceChart({ fundId, currency = "USD" }: PerformanceChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>("1y");
  const { data, isLoading } = useChart(fundId, period);

  return (
    <div>
      {/* Period Toggle */}
      <div className="flex gap-1 mb-3">
        {CHART_PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={clsx(
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              period === p
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <LoadingSpinner label="Loading chart..." />
        </div>
      ) : !data?.series?.length ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No price data available for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data.series.map((p) => ({ date: p.date, nav: p.nav }))}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
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
              tickFormatter={(v) => formatCurrency(v, currency)}
              tick={{ fontSize: 10, fill: COLORS.text }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value, currency), "NAV"]}
              labelFormatter={(label: string) => new Date(label).toLocaleDateString("en-US", { dateStyle: "medium" })}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }}
            />
            <Line
              type="monotone"
              dataKey="nav"
              stroke={COLORS.line}
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
