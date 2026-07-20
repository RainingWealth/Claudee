import clsx from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div
        className={clsx(
          "animate-spin rounded-full border-gray-200 border-t-blue-600",
          sizes[size]
        )}
        role="status"
        aria-label={label || "Loading"}
      />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={clsx("animate-pulse bg-gray-200 rounded h-4", className)} />
  );
}
