"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useScenarios } from "@/hooks/useScenarios";
import { formatPercent, formatCurrency } from "@/lib/formatters";
import { SCENARIO_HORIZONS, type ScenarioHorizon, COLORS } from "@/lib/constants";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import clsx from "clsx";

interface ScenarioSectionProps {
  fundId: number;
}

export function ScenarioSection({ fundId }: ScenarioSectionProps) {
  const { data, isLoading } = useScenarios(fundId);
  const [horizon, setHorizon] = useState<ScenarioHorizon>(3);

  const proj = data?.projections.find((p) => p.horizon_years === horizon);

  const chartData = proj
    ? [
        { label: "Bear", value: proj.bear_value_per_1000, color: COLORS.bear },
        { label: "Base", value: proj.base_value_per_1000, color: COLORS.base },
        { label: "Bull", value: proj.bull_value_per_1000, color: COLORS.bull },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Forward Projections
          <span className="text-xs font-normal text-gray-400 ml-1">(educational only)</span>
        </h3>
        <div className="flex gap-1">
          {SCENARIO_HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={clsx(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                horizon === h
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {h}Y
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="sm" label="Computing projections..." />
      ) : !proj ? (
        <p className="text-sm text-gray-400 italic">
          Insufficient price history to generate projections.
        </p>
      ) : (
        <>
          {/* Value cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Bear", cagr: proj.bear_cagr, value: proj.bear_value_per_1000, color: "text-red-600", bg: "bg-red-50 border-red-100" },
              { label: "Base", cagr: proj.base_cagr, value: proj.base_value_per_1000, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
              { label: "Bull", cagr: proj.bull_cagr, value: proj.bull_value_per_1000, color: "text-green-600", bg: "bg-green-50 border-green-100" },
            ].map(({ label, cagr, value, color, bg }) => (
              <div key={label} className={`rounded-lg border p-2.5 text-center ${bg}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-sm font-bold tabular-nums ${color}`}>
                  {formatPercent(cagr)}/yr
                </p>
                <p className="text-xs text-gray-600 mt-0.5 tabular-nums">
                  {formatCurrency(value)} per $1k
                </p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={60}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
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

          {proj.notes && (
            <p className="text-xs text-gray-500 italic mt-2 leading-relaxed">
              {proj.notes}
            </p>
          )}
        </>
      )}

      <Disclaimer text={data?.disclaimer} />
    </div>
  );
}
