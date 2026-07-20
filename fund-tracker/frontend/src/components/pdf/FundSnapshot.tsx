"use client";

import {
  Document, Page, Text, View, StyleSheet, Font
} from "@react-pdf/renderer";
import type { FundDetail } from "@/types/fund";
import type { ReturnsData } from "@/types/returns";
import type { ScenariosData } from "@/types/scenario";
import type { NewsItem } from "@/types/news";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 32,
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  fundName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  ticker: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  generated: { fontSize: 8, color: "#9ca3af" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },
  table: { borderRadius: 4, border: "1 solid #e5e7eb" },
  tableRow: {
    flexDirection: "row", borderBottom: "1 solid #f3f4f6",
    paddingVertical: 4, paddingHorizontal: 8,
  },
  tableHeader: { backgroundColor: "#f9fafb" },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellRight: { flex: 1, fontSize: 8, textAlign: "right" },
  positive: { color: "#16a34a" },
  negative: { color: "#dc2626" },
  neutral: { color: "#2563eb" },
  navBig: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111827" },
  navDate: { fontSize: 8, color: "#9ca3af", marginTop: 2 },
  disclaimer: {
    marginTop: 12, padding: 8,
    backgroundColor: "#fffbeb", border: "1 solid #fde68a", borderRadius: 4,
  },
  disclaimerText: { fontSize: 7, color: "#78350f", lineHeight: 1.4 },
  footer: {
    position: "absolute", bottom: 20, left: 32, right: 32,
    flexDirection: "row", justifyContent: "space-between",
    borderTop: "1 solid #e5e7eb", paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#9ca3af" },
  newsItem: { marginBottom: 6 },
  newsTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  newsUrl: { fontSize: 7, color: "#6b7280", marginTop: 1 },
  newsSummary: { fontSize: 7, color: "#374151", marginTop: 1 },
});

function pct(v: number | null) {
  if (v == null) return "—";
  const p = (v * 100).toFixed(2);
  return v >= 0 ? `+${p}%` : `${p}%`;
}

function curr(v: number) {
  return `$${v.toFixed(2)}`;
}

interface FundSnapshotProps {
  fund: FundDetail;
  returns: ReturnsData;
  scenarios: ScenariosData;
  news: NewsItem[];
}

export function FundSnapshot({ fund, returns, scenarios, news }: FundSnapshotProps) {
  const generatedAt = new Date().toLocaleDateString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  } as Intl.DateTimeFormatOptions);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.fundName}>{fund.name}</Text>
            <Text style={styles.ticker}>
              {[fund.ticker, fund.isin, fund.internal_code].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View>
            <Text style={styles.generated}>Generated: {generatedAt}</Text>
            <Text style={styles.generated}>Data: {fund.latest_date ?? "—"}</Text>
          </View>
        </View>

        {/* Two column layout */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          {/* Left column */}
          <View style={{ flex: 1 }}>
            {/* NAV */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current NAV</Text>
              <Text style={styles.navBig}>
                {fund.latest_nav != null ? curr(fund.latest_nav) : "—"} {fund.currency}
              </Text>
              <Text style={styles.navDate}>as of {fund.latest_date ?? "—"}</Text>
            </View>

            {/* Returns */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trailing Returns</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold" }]}>Period</Text>
                  <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold" }]}>CAGR</Text>
                  <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold" }]}>Total Return</Text>
                </View>
                {returns.windows.map((w) => (
                  <View key={w.label} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{w.label}</Text>
                    <Text style={[styles.tableCellRight, (w.cagr ?? 0) >= 0 ? styles.positive : styles.negative]}>
                      {w.data_complete ? pct(w.cagr) : "—"}
                    </Text>
                    <Text style={[styles.tableCellRight, (w.cumulative_return ?? 0) >= 0 ? styles.positive : styles.negative]}>
                      {w.data_complete ? pct(w.cumulative_return) : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Top Holdings */}
            {fund.holdings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Holdings</Text>
                <View style={styles.table}>
                  {fund.holdings.slice(0, 5).map((h, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{h.holding_name}</Text>
                      <Text style={styles.tableCellRight}>
                        {h.weight != null ? `${(h.weight * 100).toFixed(2)}%` : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Right column */}
          <View style={{ flex: 1 }}>
            {/* Scenario projections */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scenario Projections (per $1,000 invested)</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, { fontFamily: "Helvetica-Bold" }]}>Horizon</Text>
                  <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: "#dc2626" }]}>Bear</Text>
                  <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: "#2563eb" }]}>Base</Text>
                  <Text style={[styles.tableCellRight, { fontFamily: "Helvetica-Bold", color: "#16a34a" }]}>Bull</Text>
                </View>
                {scenarios.projections.map((p) => (
                  <View key={p.horizon_years} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{p.horizon_years}Y</Text>
                    <Text style={[styles.tableCellRight, styles.negative]}>{curr(p.bear_value_per_1000)}</Text>
                    <Text style={[styles.tableCellRight, styles.neutral]}>{curr(p.base_value_per_1000)}</Text>
                    <Text style={[styles.tableCellRight, styles.positive]}>{curr(p.bull_value_per_1000)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* News */}
            {news.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent News (top 5)</Text>
                {news.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.newsItem}>
                    <Text style={styles.newsTitle}>{item.title}</Text>
                    {item.summary && (
                      <Text style={styles.newsSummary}>{item.summary}</Text>
                    )}
                    <Text style={styles.newsUrl}>{item.url}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>{scenarios.disclaimer}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Fund Tracker & Presenter · Educational Use Only</Text>
          <Text style={styles.footerText}>Not financial advice · Data from yfinance / CSV upload</Text>
        </View>
      </Page>
    </Document>
  );
}
