"use client";

import { useState } from "react";
import { useFundList } from "@/hooks/useFundData";

interface AddHoldingRowProps {
  excludeFundIds: number[];
  onAdd: (fund: { id: number; name: string; ticker: string | null; currency: string }) => void;
}

export function AddHoldingRow({ excludeFundIds, onAdd }: AddHoldingRowProps) {
  const { data: funds } = useFundList();
  const [selected, setSelected] = useState("");

  const available = (funds ?? []).filter((f) => !excludeFundIds.includes(f.id));

  if (!available.length) {
    return (
      <p className="text-xs text-gray-400 italic">
        {funds?.length
          ? "All tracked funds are already in this portfolio."
          : "No funds tracked yet — add some from the Dashboard first."}
      </p>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a tracked fund to add…</option>
        {available.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
            {f.ticker ? ` (${f.ticker})` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          const fund = available.find((f) => f.id === Number(selected));
          if (!fund) return;
          onAdd({ id: fund.id, name: fund.name, ticker: fund.ticker, currency: fund.currency });
          setSelected("");
        }}
        className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </div>
  );
}
