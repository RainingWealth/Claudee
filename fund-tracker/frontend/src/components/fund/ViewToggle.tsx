"use client";

import clsx from "clsx";
import type { ViewMode } from "@/hooks/useViewMode";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={value === "grid"}
        aria-label="Grid view"
        className={clsx(
          "px-2.5 py-1.5 rounded-md text-sm transition-colors",
          value === "grid"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        )}
      >
        ▦
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        aria-label="List view"
        className={clsx(
          "px-2.5 py-1.5 rounded-md text-sm transition-colors",
          value === "list"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        )}
      >
        ☰
      </button>
    </div>
  );
}
