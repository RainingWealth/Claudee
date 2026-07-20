import type { ReturnWindow } from "@/types/returns";
import { formatPercent, pctColor } from "@/lib/formatters";
import { MissingDataWarning } from "./MissingDataWarning";

interface ReturnsTableProps {
  windows: ReturnWindow[];
}

export function ReturnsTable({ windows }: ReturnsTableProps) {
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase">
            <th className="text-left py-1.5 font-medium">Period</th>
            <th className="text-right py-1.5 font-medium">CAGR</th>
            <th className="text-right py-1.5 font-medium">Total Return</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {windows.map((w) => (
            <tr key={w.label}>
              <td className="py-2 font-medium text-gray-700">{w.label}</td>
              <td className={`py-2 text-right tabular-nums font-semibold ${pctColor(w.cagr)}`}>
                {w.data_complete ? formatPercent(w.cagr) : "—"}
              </td>
              <td className={`py-2 text-right tabular-nums ${pctColor(w.cumulative_return)}`}>
                {w.data_complete ? formatPercent(w.cumulative_return) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {windows
        .filter((w) => !w.data_complete && w.warning)
        .map((w) => (
          <MissingDataWarning key={w.label} message={w.warning!} />
        ))}
    </div>
  );
}
