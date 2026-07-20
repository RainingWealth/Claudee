"use client";

interface DisclaimerProps {
  text?: string;
  compact?: boolean;
}

const DEFAULT_DISCLAIMER =
  "IMPORTANT DISCLAIMER: These projections and all information presented are hypothetical, " +
  "based purely on historical data and statistical models. They do not constitute investment " +
  "advice, guarantees of future performance, or financial recommendations of any kind. " +
  "Past performance is not indicative of future results. For educational purposes only. " +
  "Please consult a qualified financial advisor before making any investment decisions.";

export function Disclaimer({ text, compact = false }: DisclaimerProps) {
  const content = text || DEFAULT_DISCLAIMER;

  if (compact) {
    return (
      <p className="text-xs text-gray-400 italic mt-2 leading-relaxed">
        {content}
      </p>
    );
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 mt-4">
      <div className="flex gap-2">
        <span className="text-amber-500 text-lg flex-shrink-0" aria-hidden>⚠</span>
        <p className="text-xs text-amber-800 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
