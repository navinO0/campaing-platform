import React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export function Progress({ className, value = 0, max = 100, ...props }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800", className)}
      {...props}
    >
      <div
        className="h-full bg-emerald-600 transition-all duration-300 ease-in-out dark:bg-emerald-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
