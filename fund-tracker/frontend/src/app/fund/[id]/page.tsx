"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useFundDetail } from "@/hooks/useFundData";
import { useReturns } from "@/hooks/useReturns";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { NavDisplay } from "@/components/fund/NavDisplay";
import { ReturnsTable } from "@/components/fund/ReturnsTable";
import { PerformanceChart } from "@/components/fund/PerformanceChart";
import { FundSummary } from "@/components/fund/FundSummary";
import { NewsSection } from "@/components/fund/NewsSection";
import { ScenarioSection } from "@/components/fund/ScenarioSection";
import { usePdfExport } from "@/hooks/usePdfExport";

export default function FundDetailPage() {
  const params = useParams();
  const fundId = Number(params.id);

  const { data: fund, isLoading: fundLoading } = useFundDetail(fundId);
  const { data: returns, isLoading: returnsLoading } = useReturns(fundId);
  const { exportPdf, isGenerating } = usePdfExport(fundId);

  if (fundLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" label="Loading fund..." />
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Fund not found.</p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">{fund.name}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportPdf}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating PDF..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{fund.name}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {fund.ticker && <Badge>{fund.ticker}</Badge>}
                {fund.isin && <Badge variant="default">{fund.isin}</Badge>}
                {fund.internal_code && <Badge variant="default">{fund.internal_code}</Badge>}
                {fund.is_demo && <Badge variant="demo">Demo</Badge>}
                {fund.asset_class && <Badge>{fund.asset_class}</Badge>}
                {fund.style && <Badge>{fund.style}</Badge>}
              </div>
            </div>
            <NavDisplay nav={fund.latest_nav} date={fund.latest_date} currency={fund.currency} />
          </div>
        </CardHeader>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Returns + Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">Performance Chart</h2>
            </CardHeader>
            <CardBody>
              <PerformanceChart fundId={fundId} currency={fund.currency} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">Trailing Returns</h2>
            </CardHeader>
            <CardBody>
              {returnsLoading ? (
                <LoadingSpinner size="sm" label="Computing returns..." />
              ) : returns ? (
                <ReturnsTable windows={returns.windows} />
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">Forward Projections</h2>
            </CardHeader>
            <CardBody>
              <ScenarioSection fundId={fundId} />
            </CardBody>
          </Card>
        </div>

        {/* Right column: Summary + News */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">Fund Overview</h2>
            </CardHeader>
            <CardBody>
              <FundSummary fund={fund} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 text-sm">Recent News</h2>
            </CardHeader>
            <CardBody>
              <NewsSection fundId={fundId} />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sticky footer disclaimer */}
      <div className="sticky bottom-0 bg-amber-50 border-t border-amber-200 p-3 -mx-4 sm:-mx-6 lg:-mx-8">
        <p className="text-xs text-amber-800 text-center max-w-4xl mx-auto">
          <strong>Disclaimer:</strong> All information is for educational purposes only and does not
          constitute investment advice or a financial recommendation. Past performance does not
          guarantee future results. Projections are hypothetical and based solely on historical data.
          Consult a qualified financial advisor before making any investment decisions.
        </p>
      </div>
    </div>
  );
}
