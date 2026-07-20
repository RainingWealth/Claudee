"use client";

import { usePortfolioPdfExport } from "@/hooks/usePortfolioPdfExport";
import { Button } from "@/components/ui/Button";
import type { Portfolio } from "@/types/portfolio";

export function PortfolioPdfExportButton({ portfolio }: { portfolio: Portfolio }) {
  const { exportPdf, isGenerating } = usePortfolioPdfExport(portfolio);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={exportPdf}
      disabled={isGenerating || portfolio.holdings.length === 0}
    >
      {isGenerating ? "Generating PDF..." : "Export PDF"}
    </Button>
  );
}
