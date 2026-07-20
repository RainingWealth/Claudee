import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "demo" | "success" | "warning" | "error";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  demo: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
