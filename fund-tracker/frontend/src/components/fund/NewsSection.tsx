"use client";

import { useState } from "react";
import { useNews } from "@/hooks/useNews";
import { refreshNews } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

interface NewsSectionProps {
  fundId: number;
}

export function NewsSection({ fundId }: NewsSectionProps) {
  const { data: items, isLoading, mutate } = useNews(fundId);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshNews(fundId);
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">What moved it recently</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading news..." size="sm" />
      ) : !items?.length ? (
        <p className="text-sm text-gray-400 italic">
          No news found. Click Refresh to fetch the latest.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 8).map((item) => (
            <li key={item.id} className="border-l-2 border-blue-200 pl-3">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline block leading-snug"
              >
                {item.title}
              </a>
              {item.summary && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              )}
              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                {item.source_name && <span>{item.source_name}</span>}
                {item.published_at && (
                  <span>{formatDate(item.published_at)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
