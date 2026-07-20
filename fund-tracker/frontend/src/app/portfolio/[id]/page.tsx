"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { usePortfolios } from "@/hooks/usePortfolios";
import { AddHoldingRow } from "@/components/portfolio/AddHoldingRow";
import { ContributionEditor } from "@/components/portfolio/ContributionEditor";
import { AllocationResults } from "@/components/portfolio/AllocationResults";
import { HoldingsResults } from "@/components/portfolio/HoldingsResults";
import { PortfolioPdfExportButton } from "@/components/portfolio/PortfolioPdfExportButton";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PortfolioHolding } from "@/types/portfolio";

export default function PortfolioDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const { get, setHoldings } = usePortfolios();
  const portfolio = get(id);

  if (!portfolio) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Portfolio not found.</p>
        <Link href="/portfolio" className="text-blue-600 hover:underline">← Back to portfolios</Link>
      </div>
    );
  }

  function addHolding(fund: { id: number; name: string; ticker: string | null; currency: string }) {
    const holding: PortfolioHolding = {
      fundId: fund.id,
      ticker: fund.ticker,
      name: fund.name,
      currency: fund.currency,
      ...(portfolio!.mode === "allocation" ? { targetWeightPct: 0 } : { contributions: [] }),
    };
    setHoldings(portfolio!.id, [...portfolio!.holdings, holding]);
  }

  function removeHolding(fundId: number) {
    setHoldings(portfolio!.id, portfolio!.holdings.filter((h) => h.fundId !== fundId));
  }

  function updateWeight(fundId: number, weight: number) {
    setHoldings(
      portfolio!.id,
      portfolio!.holdings.map((h) => (h.fundId === fundId ? { ...h, targetWeightPct: weight } : h))
    );
  }

  function normalizeWeights() {
    const total = portfolio!.holdings.reduce((s, h) => s + (h.targetWeightPct ?? 0), 0);
    if (total <= 0) return;
    setHoldings(
      portfolio!.id,
      portfolio!.holdings.map((h) => ({
        ...h,
        targetWeightPct: Math.round(((h.targetWeightPct ?? 0) / total) * 1000) / 10,
      }))
    );
  }

  function updateContributions(fundId: number, contributions: PortfolioHolding["contributions"]) {
    setHoldings(
      portfolio!.id,
      portfolio!.holdings.map((h) => (h.fundId === fundId ? { ...h, contributions } : h))
    );
  }

  const totalWeight = portfolio.holdings.reduce((s, h) => s + (h.targetWeightPct ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/portfolio" className="hover:text-gray-900">Portfolios</Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">{portfolio.name}</span>
        </div>
        <PortfolioPdfExportButton portfolio={portfolio} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{portfolio.name}</h1>
              <div className="flex gap-1.5 mt-1.5">
                <Badge>{portfolio.mode === "allocation" ? "Target Allocation" : "Actual Holdings"}</Badge>
                <Badge variant="default">{portfolio.baseCurrency}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">Holdings</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {portfolio.holdings.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No funds added yet.</p>
              ) : (
                <ul className="space-y-3">
                  {portfolio.holdings.map((h) => (
                    <li key={h.fundId} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{h.name}</p>
                          {h.ticker && <p className="text-xs text-gray-400">{h.ticker}</p>}
                        </div>
                        <button
                          onClick={() => removeHolding(h.fundId)}
                          className="text-gray-300 hover:text-red-500 flex-shrink-0"
                          aria-label="Remove holding"
                        >
                          ✕
                        </button>
                      </div>

                      {portfolio.mode === "allocation" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="0.1"
                            value={h.targetWeightPct ?? 0}
                            onChange={(e) => updateWeight(h.fundId, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      ) : (
                        <ContributionEditor
                          contributions={h.contributions ?? []}
                          currency={portfolio.baseCurrency}
                          onChange={(c) => updateContributions(h.fundId, c)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {portfolio.mode === "allocation" && portfolio.holdings.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className={Math.abs(totalWeight - 100) > 0.01 ? "text-amber-600" : "text-gray-400"}>
                    Total: {totalWeight.toFixed(1)}%
                  </span>
                  {Math.abs(totalWeight - 100) > 0.01 && (
                    <button onClick={normalizeWeights} className="text-blue-600 hover:underline">
                      Normalize to 100%
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <AddHoldingRow
                  excludeFundIds={portfolio.holdings.map((h) => h.fundId)}
                  onAdd={addHolding}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">
                {portfolio.mode === "allocation" ? "Blended Returns" : "Performance Since Buy-In"}
              </h2>
            </CardHeader>
            <CardBody>
              {portfolio.holdings.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Add at least one fund to see results.
                </p>
              ) : portfolio.mode === "allocation" ? (
                <AllocationResults holdings={portfolio.holdings} baseCurrency={portfolio.baseCurrency} />
              ) : (
                <HoldingsResults holdings={portfolio.holdings} baseCurrency={portfolio.baseCurrency} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
