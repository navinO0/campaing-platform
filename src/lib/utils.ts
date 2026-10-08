import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0%";
  return `${(num * 100).toFixed(1)}%`;
}
