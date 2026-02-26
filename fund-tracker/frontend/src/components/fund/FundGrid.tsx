"use client";

import type { FundSummary } from "@/types/fund";
import { FundCard } from "./FundCard";

interface FundGridProps {
  funds: FundSummary[];
  onDelete?: (id: number) => void;
}

export function FundGrid({ funds, onDelete }: FundGridProps) {
  if (!funds.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg mb-1">No funds tracked yet.</p>
        <p className="text-sm">Search for a ticker, ISIN, or fund code above to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {funds.map((fund) => (
        <FundCard key={fund.id} fund={fund} onDelete={onDelete} />
      ))}
    </div>
  );
}
