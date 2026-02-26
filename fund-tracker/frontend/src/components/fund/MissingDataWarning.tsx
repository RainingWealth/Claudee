interface MissingDataWarningProps {
  message: string;
}

export function MissingDataWarning({ message }: MissingDataWarningProps) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2.5 py-2 mt-1">
      <span aria-hidden className="flex-shrink-0">⚠</span>
      <span>{message}</span>
    </div>
  );
}
