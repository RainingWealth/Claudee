"use client";

import { useState } from "react";
import { getReturns, getScenarios, getPrices, getDisclaimer } from "@/lib/api";
import { weightedReturns, blendedProjections, computePortfolioTimeline, summarizeHolding, xirr, simpleReturn } from "@/lib/portfolio";
import type { Portfolio } from "@/types/portfolio";
import type { ReturnsData } from "@/types/returns";
import type { ScenariosData } from "@/types/scenario";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "portfolio";
}

export function usePortfolioPdfExport(portfolio: Portfolio) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function exportPdf() {
    setIsGenerating(true);
    try {
      const disclaimer = await getDisclaimer().catch(
        () => "For educational purposes only. Not investment advice. Past performance does not guarantee future results."
      );

      const { pdf } = await import("@react-pdf/renderer");
      const { PortfolioSnapshot } = await import("@/components/pdf/PortfolioSnapshot");
      const React = await import("react");

      let props: Record<string, unknown> = { portfolio, disclaimer };

      if (portfolio.mode === "allocation") {
        const fundIds = portfolio.holdings.map((h) => h.fundId);
        const [returnsResults, scenarioResults] = await Promise.all([
          Promise.all(fundIds.map(async (id) => [id, await getReturns(id).catch(() => null)] as const)),
          Promise.all(fundIds.map(async (id) => [id, await getScenarios(id).catch(() => null)] as const)),
        ]);
        const returnsMap = new Map(returnsResults.filter(([, v]) => v != null) as [number, ReturnsData][]);
        const scenariosMap = new Map(scenarioResults.filter(([, v]) => v != null) as [number, ScenariosData][]);

        props = {
          ...props,
          windows: weightedReturns(portfolio.holdings, returnsMap),
          projections: blendedProjections(portfolio.holdings, scenariosMap, [1, 3, 5]),
        };
      } else {
        const allContributions = portfolio.holdings.flatMap((h) => h.contributions ?? []);
        const earliest = allContributions.length
          ? allContributions.reduce((min, c) => (c.date < min ? c.date : min), allContributions[0].date)
          : undefined;

        const pricesResults = await Promise.all(
          portfolio.holdings.map(
            async (h) => [h.fundId, await getPrices(h.fundId, earliest).catch(() => ({ fund_id: h.fundId, period: "", series: [] }))] as const
          )
        );
        const pricesMap = new Map(pricesResults);

        const timeline = computePortfolioTimeline(
          portfolio.holdings.map((h) => ({
            contributions: h.contributions ?? [],
            series: pricesMap.get(h.fundId)?.series ?? [],
          }))
        );

        const summaries = portfolio.holdings.map((h) => ({
          name: h.name,
          summary: summarizeHolding(h, pricesMap.get(h.fundId)?.series ?? []),
        }));

        const totalInvested = summaries.reduce((s, x) => s + x.summary.invested, 0);
        const totalValue = summaries.reduce((s, x) => s + x.summary.currentValue, 0);
        const simplePct = simpleReturn(totalValue, totalInvested);
        const cashflows = [
          ...allContributions.map((c) => ({ amount: -c.amount, date: c.date })),
          { amount: totalValue, date: new Date().toISOString().slice(0, 10) },
        ];
        const xirrPct = xirr(cashflows);

        props = {
          ...props,
          timeline,
          summaries,
          totalInvested,
          totalValue,
          simplePct,
          xirrPct,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = React.createElement(PortfolioSnapshot as any, props);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-${slugify(portfolio.name)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }

  return { exportPdf, isGenerating };
}
