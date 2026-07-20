"use client";

import { Document, Page, Text, View, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import type { Portfolio } from "@/types/portfolio";
import type { WeightedWindow, BlendedProjection, TimelinePoint, HoldingSummary } from "@/lib/portfolio";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 32, backgroundColor: "#ffffff" },
  header: {
    borderBottom: "1 solid #e5e7eb", paddingBottom: 8, marginBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  portfolioName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  subline: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  generated: { fontSize: 8, color: "#9ca3af" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },
  table: { borderRadius: 4, border: "1 solid #e5e7eb" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #f3f4f6", paddingVertical: 4, paddingHorizontal: 8 },
  tableHeader: { backgroundColor: "#f9fafb" },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellRight: { flex: 1, fontSize: 8, textAlign: "right" },
  positive: { color: "#16a34a" },
  negative: { color: "#dc2626" },
  neutral: { color: "#2563eb" },
  tileRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 4, padding: 8 },
  tileLabel: { fontSize: 7, color: "#6b7280" },
  tileValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 },
  disclaimer: { marginTop: 12, padding: 8, backgroundColor: "#fffbeb", border: "1 solid #fde68a", borderRadius: 4 },
  disclaimerText: { fontSize: 7, color: "#78350f", lineHeight: 1.4 },
  footer: {
    position: "absolute", bottom: 20, left: 32, right: 32,
    flexDirection: "row", justifyContent: "space-between",
    borderTop: "1 solid #e5e7eb", paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#9ca3af" },
});

function pct(v: number | null | undefined) {
  if (v == null) return "—";
  const p = (v * 100).toFixed(2);
  return v >= 0 ? `+${p}%` : `${p}%`;
}
function curr(v: number | null | undefined, currency = "USD") {
  if (v == null) return "—";
  return `${currency} ${v.toFixed(2)}`;
}

/** Builds an SVG path + axis bounds for a two-series (value/invested) line chart. */
function buildTimelinePath(timeline: TimelinePoint[], width: number, height: number) {
  if (timeline.length < 2) return null;
  const values = timeline.flatMap((t) => [t.value, t.invested]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values) * 1.05 || 1;
  const x = (i: number) => (width * i) / (timeline.length - 1);
  const y = (v: number) => height - (height * (v - min)) / (max - min || 1);
  const valuePath = timeline.map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(t.value).toFixed(1)}`).join(" ");
  const investedPath = timeline.map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(t.invested).toFixed(1)}`).join(" ");
  return { valuePath, investedPath };
}

interface PortfolioSnapshotProps {
  portfolio: Portfolio;
  disclaimer: string;
  // Allocation mode
  windows?: WeightedWindow[];
  projections?: BlendedProjection[];
  // Holdings mode
  timeline?: TimelinePoint[];
  summaries?: { name: string; summary: HoldingSummary }[];
  totalInvested?: number;
  totalValue?: number;
  simplePct?: number | null;
  xirrPct?: number | null;
}

export function PortfolioSnapshot({
  portfolio, disclaimer, windows, projections, timeline, summaries,
  totalInvested, totalValue, simplePct, xirrPct,
}: PortfolioSnapshotProps) {
  const generatedAt = new Date().toLocaleDateString("en-US", {
    dateStyle: "long", timeStyle: "short",
  } as Intl.DateTimeFormatOptions);

  const chartW = 480, chartH = 140;
  const paths = timeline ? buildTimelinePath(timeline, chartW, chartH) : null;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.portfolioName}>{portfolio.name}</Text>
            <Text style={styles.subline}>
              {portfolio.mode === "allocation" ? "Target Allocation" : "Actual Holdings"} ·{" "}
              {portfolio.holdings.length} fund{portfolio.holdings.length === 1 ? "" : "s"} · {portfolio.baseCurrency}
            </Text>
          </View>
          <Text style={styles.generated}>Generated: {generatedAt}</Text>
        </View>

        {portfolio.mode === "allocation" && windows && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weighted Trailing Returns</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold" }]}>Period</Text>
                <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold" }]}>Blended CAGR</Text>
                <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold" }]}>Blended Total Return</Text>
              </View>
              {windows.map((w) => (
                <View key={w.label} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{w.label}</Text>
                  <Text style={[styles.tableCellRight, (w.cagr ?? 0) >= 0 ? styles.positive : styles.negative]}>
                    {w.dataComplete ? pct(w.cagr) : "—"}
                  </Text>
                  <Text style={[styles.tableCellRight, (w.cumulativeReturn ?? 0) >= 0 ? styles.positive : styles.negative]}>
                    {w.dataComplete ? pct(w.cumulativeReturn) : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {portfolio.mode === "allocation" && projections && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blended Forward Projections (per $1,000)</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold" }]}>Horizon</Text>
                <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: "#dc2626" }]}>Bear</Text>
                <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: "#2563eb" }]}>Base</Text>
                <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: "#16a34a" }]}>Bull</Text>
              </View>
              {projections.map((p) => (
                <View key={p.horizonYears} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{p.horizonYears}Y</Text>
                  <Text style={[styles.tableCellRight, styles.negative]}>{curr(p.bearValuePer1000)}</Text>
                  <Text style={[styles.tableCellRight, styles.neutral]}>{curr(p.baseValuePer1000)}</Text>
                  <Text style={[styles.tableCellRight, styles.positive]}>{curr(p.bullValuePer1000)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {portfolio.mode === "holdings" && (
          <>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>TOTAL INVESTED</Text>
                <Text style={styles.tileValue}>{curr(totalInvested, portfolio.baseCurrency)}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>CURRENT VALUE</Text>
                <Text style={styles.tileValue}>{curr(totalValue, portfolio.baseCurrency)}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>SIMPLE RETURN</Text>
                <Text style={[styles.tileValue, (simplePct ?? 0) >= 0 ? styles.positive : styles.negative]}>
                  {pct(simplePct)}
                </Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>ANNUALISED (XIRR)</Text>
                <Text style={[styles.tileValue, (xirrPct ?? 0) >= 0 ? styles.positive : styles.negative]}>
                  {pct(xirrPct)}
                </Text>
              </View>
            </View>

            {paths && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Value Over Time (solid = value, dashed = invested)</Text>
                <Svg width={chartW} height={chartH}>
                  <Path d={paths.investedPath} stroke="#9ca3af" strokeWidth={1} fill="none" />
                  <Path d={paths.valuePath} stroke="#3b82f6" strokeWidth={2} fill="none" />
                </Svg>
              </View>
            )}

            {summaries && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Per-Holding Breakdown</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold" }]}>Fund</Text>
                    <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold" }]}>Invested</Text>
                    <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold" }]}>Current Value</Text>
                  </View>
                  {summaries.map(({ name, summary }) => (
                    <View key={summary.fundId} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{name}</Text>
                      <Text style={styles.tableCellRight}>{curr(summary.invested, portfolio.baseCurrency)}</Text>
                      <Text style={styles.tableCellRight}>{curr(summary.currentValue, portfolio.baseCurrency)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{disclaimer}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Fund Tracker & Presenter · Educational Use Only</Text>
          <Text style={styles.footerText}>Not financial advice · Historical data only</Text>
        </View>
      </Page>
    </Document>
  );
}
