import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "warning" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-blue-100 text-blue-800 border-blue-200",
    secondary: "bg-gray-100 text-gray-800 border-gray-200",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    destructive: "bg-rose-100 text-rose-800 border-rose-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    outline: "border border-gray-300 text-gray-700",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
