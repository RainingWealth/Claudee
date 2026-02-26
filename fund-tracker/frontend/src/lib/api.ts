/**
 * Typed API client for the Fund Tracker FastAPI backend.
 * Uses Next.js rewrite rules to proxy /api/v1/* to the backend.
 */
import type { FundSummary, FundDetail } from "@/types/fund";
import type { ReturnsData, ChartData } from "@/types/returns";
import type { NewsItem } from "@/types/news";
import type { ScenariosData } from "@/types/scenario";

const BASE = "/api/v1";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// ── Funds ──────────────────────────────────────────────────────────────────────

export async function searchFund(query: string) {
  return apiFetch<{ fund: FundSummary; created: boolean }>("/funds/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function listFunds(demo?: boolean): Promise<FundSummary[]> {
  const qs = demo !== undefined ? `?demo=${demo}` : "";
  return apiFetch<FundSummary[]>(`/funds${qs}`);
}

export async function getFund(id: number): Promise<FundDetail> {
  return apiFetch<FundDetail>(`/funds/${id}`);
}

export async function deleteFund(id: number): Promise<void> {
  await apiFetch<void>(`/funds/${id}`, { method: "DELETE" });
}

// ── Returns ────────────────────────────────────────────────────────────────────

export async function getReturns(fundId: number): Promise<ReturnsData> {
  return apiFetch<ReturnsData>(`/funds/${fundId}/returns`);
}

export async function getChart(fundId: number, period: string): Promise<ChartData> {
  return apiFetch<ChartData>(`/funds/${fundId}/chart?period=${period}`);
}

// ── News ───────────────────────────────────────────────────────────────────────

export async function getNews(fundId: number, refresh = false): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/funds/${fundId}/news?refresh=${refresh}`);
}

export async function refreshNews(fundId: number) {
  return apiFetch<{ fetched: number; new_items: number }>(
    `/funds/${fundId}/news/refresh`,
    { method: "POST" }
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

export async function getScenarios(fundId: number, refresh = false): Promise<ScenariosData> {
  return apiFetch<ScenariosData>(`/funds/${fundId}/scenarios?refresh=${refresh}`);
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadCsv(
  file: File,
  fundName: string,
  internalCode?: string
) {
  const form = new FormData();
  form.append("file", file);
  form.append("fund_name", fundName);
  if (internalCode) form.append("internal_code", internalCode);

  const resp = await fetch(`${BASE}/upload/csv`, { method: "POST", body: form });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ── Demo ───────────────────────────────────────────────────────────────────────

export async function seedDemo() {
  return apiFetch<{ funds_seeded: number; message: string }>("/demo/seed", {
    method: "POST",
  });
}

export async function resetDemo() {
  return apiFetch<{ funds_deleted: number; message: string }>("/demo/reset", {
    method: "DELETE",
  });
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refreshFund(fundId: number) {
  return apiFetch<{ fund_id: number; rows_updated: number; latest_date: string | null }>(
    `/refresh/${fundId}`,
    { method: "POST" }
  );
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getDisclaimer(): Promise<string> {
  const data = await apiFetch<{ disclaimer: string }>("/config/disclaimer");
  return data.disclaimer;
}
