"use client";

import { useState } from "react";
import { searchFund } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface FundSearchBarProps {
  onFundAdded?: () => void;
}

export function FundSearchBar({ onFundAdded }: FundSearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      await searchFund(q);
      setQuery("");
      onFundAdded?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to find fund. Check the identifier and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter ticker (SPY), ISIN (US78462F1030), or fund code"
          className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Add Fund"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span aria-hidden>✕</span> {error}
        </p>
      )}
    </form>
  );
}
