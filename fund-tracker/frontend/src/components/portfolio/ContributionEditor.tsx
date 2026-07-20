"use client";

import { useState } from "react";
import { newId } from "@/lib/id";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Contribution } from "@/types/portfolio";

interface ContributionEditorProps {
  contributions: Contribution[];
  currency: string;
  onChange: (contributions: Contribution[]) => void;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ContributionEditor({ contributions, currency, onChange }: ContributionEditorProps) {
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");

  function addRow(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || !amt || amt <= 0) return;
    onChange([...contributions, { id: newId(), date, amount: amt }]);
    setAmount("");
  }

  function removeRow(id: string) {
    onChange(contributions.filter((c) => c.id !== id));
  }

  const total = contributions.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-2">
      {contributions.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {contributions
            .slice()
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-1.5 text-sm bg-white">
                <span className="text-gray-500">{formatDate(c.date)}</span>
                <span className="font-medium tabular-nums">{formatCurrency(c.amount, currency)}</span>
                <button
                  type="button"
                  onClick={() => removeRow(c.id)}
                  className="text-gray-300 hover:text-red-500 ml-2"
                  aria-label="Remove contribution"
                >
                  ✕
                </button>
              </li>
            ))}
        </ul>
      )}
      <form onSubmit={addRow} className="flex gap-1.5 items-center">
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 tabular-nums"
        />
        <button
          type="submit"
          disabled={!amount || parseFloat(amount) <= 0}
          className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </form>
      {contributions.length > 0 && (
        <p className="text-xs text-gray-400">
          Total invested: <span className="tabular-nums">{formatCurrency(total, currency)}</span>
        </p>
      )}
    </div>
  );
}
