import { formatCurrency, formatDate } from "@/lib/formatters";

interface NavDisplayProps {
  nav: number | null;
  date: string | null;
  currency?: string;
}

export function NavDisplay({ nav, date, currency = "USD" }: NavDisplayProps) {
  return (
    <div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">
        {formatCurrency(nav, currency)}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        {date ? `as of ${formatDate(date)}` : "No price data"}
      </p>
    </div>
  );
}
