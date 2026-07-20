"use client";

import { useState } from "react";
import { searchFund } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface RowResult {
  query: string;
  status: "pending" | "added" | "exists" | "error";
  message?: string;
}

interface BulkAddFundsProps {
  onDone?: () => void;
}

function parseTickers(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BulkAddFunds({ onDone }: BulkAddFundsProps) {
  const [raw, setRaw] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);
  const [open, setOpen] = useState(false);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    const tickers = parseTickers(raw);
    if (!tickers.length) return;

    setRunning(true);
    const initial: RowResult[] = tickers.map((t) => ({ query: t, status: "pending" }));
    setResults(initial);

    for (let i = 0; i < tickers.length; i++) {
      try {
        const { created } = await searchFund(tickers[i]);
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: created ? "added" : "exists" } : r))
        );
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "error", message: err instanceof Error ? err.message : "Not found" }
              : r
          )
        );
      }
    }

    setRunning(false);
    onDone?.();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline"
      >
        + Bulk-add multiple tickers
      </button>
    );
  }

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3 mt-3">
      <p className="text-xs text-gray-500">
        Paste one ticker per line (or comma-separated) — e.g. Yahoo Finance symbols like{" "}
        <code className="bg-gray-100 px-1 rounded">SPY</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">VWRA.L</code>.
      </p>
      <form onSubmit={handleRun} className="space-y-2">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"SPY\nVWRA.L\nQQQ"}
          rows={4}
          disabled={running}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={running || !parseTickers(raw).length}>
            {running ? "Adding..." : `Add ${parseTickers(raw).length || ""} fund${parseTickers(raw).length === 1 ? "" : "s"}`}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={running}>
            Close
          </Button>
        </div>
      </form>

      {results.length > 0 && (
        <ul className="text-xs space-y-1 border border-gray-100 rounded-lg p-2 bg-gray-50">
          {results.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className={
                  r.status === "added"
                    ? "text-green-600"
                    : r.status === "exists"
                    ? "text-gray-400"
                    : r.status === "error"
                    ? "text-red-600"
                    : "text-gray-300"
                }
              >
                {r.status === "pending" && "…"}
                {r.status === "added" && "✓"}
                {r.status === "exists" && "•"}
                {r.status === "error" && "✕"}
              </span>
              <span className="font-mono">{r.query}</span>
              {r.status === "exists" && <span className="text-gray-400">already tracked</span>}
              {r.status === "error" && <span className="text-red-500">{r.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
