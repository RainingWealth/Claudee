"use client";

import { useState } from "react";
import Link from "next/link";
import { usePortfolios } from "@/hooks/usePortfolios";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PortfolioMode } from "@/types/portfolio";

export default function PortfoliosPage() {
  const { portfolios, create, remove } = usePortfolios();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<PortfolioMode>("allocation");
  const [creating, setCreating] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create(trimmed, mode);
    setName("");
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Combine tracked funds into a portfolio to see blended returns, or record real
          buy-ins and track performance since purchase.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Portfolio name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Retirement mix, Client A"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                What do you want to track?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("allocation")}
                  className={`flex-1 text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    mode === "allocation"
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium block">Target allocation</span>
                  <span className="text-xs text-gray-500">
                    Assign weights, see the blended historical return
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("holdings")}
                  className={`flex-1 text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    mode === "holdings"
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium block">Actual buy-ins</span>
                  <span className="text-xs text-gray-500">
                    Key in purchase dates &amp; amounts, track real return
                  </span>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!name.trim()}>
                Create portfolio
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setCreating(true)} variant="secondary">
            + New portfolio
          </Button>
        )}
      </div>

      {portfolios.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No portfolios yet.</p>
          <p className="text-sm">Create one above to combine funds and see blended returns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 text-sm truncate">{p.name}</h2>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge>{p.mode === "allocation" ? "Allocation" : "Holdings"}</Badge>
                      <Badge variant="default">{p.holdings.length} fund{p.holdings.length === 1 ? "" : "s"}</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete portfolio "${p.name}"?`)) remove(p.id);
                    }}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Delete portfolio"
                  >
                    ✕
                  </button>
                </div>
                <Link
                  href={`/portfolio/${p.id}`}
                  className="block w-full text-center text-xs text-blue-600 hover:text-blue-800 hover:underline py-1.5 border border-blue-100 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Open →
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
