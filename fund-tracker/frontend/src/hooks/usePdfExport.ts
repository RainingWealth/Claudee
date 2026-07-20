"use client";

import { useState } from "react";
import { getFund, getReturns, getScenarios, getNews } from "@/lib/api";

export function usePdfExport(fundId: number) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function exportPdf() {
    setIsGenerating(true);
    try {
      const [fund, returns, scenarios, news] = await Promise.all([
        getFund(fundId),
        getReturns(fundId),
        getScenarios(fundId),
        getNews(fundId),
      ]);

      // Dynamic import keeps @react-pdf/renderer out of the SSR bundle
      const { pdf } = await import("@react-pdf/renderer");
      const { FundSnapshot } = await import("@/components/pdf/FundSnapshot");
      const React = await import("react");

      const doc = React.createElement(FundSnapshot, { fund, returns, scenarios, news });
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fund-snapshot-${fund.ticker || fund.internal_code || fundId}.pdf`;
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
