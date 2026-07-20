"use client";

import { useState } from "react";
import { FundSearchBar } from "@/components/fund/FundSearchBar";
import { FundGrid } from "@/components/fund/FundGrid";
import { FundListView } from "@/components/fund/FundListView";
import { ViewToggle } from "@/components/fund/ViewToggle";
import { useFundList } from "@/hooks/useFundData";
import { useViewMode } from "@/hooks/useViewMode";
import { deleteFund, seedDemo } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const { data: funds, isLoading, mutate } = useFundList();
  const [seeding, setSeeding] = useState(false);
  const [view, setView] = useViewMode();

  async function handleDelete(id: number) {
    if (!confirm("Remove this fund from your tracker?")) return;
    try {
      await deleteFund(id);
      mutate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove fund.");
    }
  }

  async function handleSeedDemo() {
    setSeeding(true);
    try {
      await seedDemo();
      mutate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not seed demo data.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fund Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track performance, returns, and projections for your funds.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add a Fund</h2>
        <FundSearchBar onFundAdded={() => mutate()} />
      </div>

      {/* Fund grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading funds..." />
        </div>
      ) : (
        <>
          {(!funds || funds.length === 0) ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <p className="text-sm text-blue-700 mb-3">
                No funds yet. Try the demo to see how it works.
              </p>
              <Button onClick={handleSeedDemo} disabled={seeding} variant="secondary">
                {seeding ? "Loading demo..." : "Load Demo Funds"}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <ViewToggle value={view} onChange={setView} />
            </div>
          )}
          {view === "grid" ? (
            <FundGrid funds={funds || []} onDelete={handleDelete} />
          ) : (
            <FundListView funds={funds || []} onDelete={handleDelete} />
          )}
        </>
      )}

      {/* Global disclaimer */}
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-xs text-amber-800">
        <strong>Educational purposes only.</strong> This tool is not financial advice.
        All data sourced from Yahoo Finance and user-uploaded CSVs. Returns are historical and
        do not guarantee future performance. Always consult a qualified financial advisor
        before making investment decisions.
      </div>
    </div>
  );
}
