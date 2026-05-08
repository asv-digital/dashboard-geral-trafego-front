"use client";

import { cn } from "@/lib/utils";

export type PeriodOption = { v: number; label: string };

export const DEFAULT_PERIODS: PeriodOption[] = [
  { v: 1, label: "Hoje" },
  { v: 7, label: "7d" },
  { v: 14, label: "14d" },
  { v: 30, label: "30d" },
  { v: 60, label: "60d" },
  { v: 90, label: "90d" },
];

export const SHORT_PERIODS: PeriodOption[] = [
  { v: 1, label: "Hoje" },
  { v: 7, label: "7d" },
  { v: 14, label: "14d" },
  { v: 30, label: "30d" },
];

export function PeriodPicker({
  value,
  onChange,
  options = DEFAULT_PERIODS,
  size = "md",
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  options?: PeriodOption[];
  size?: "sm" | "md";
  className?: string;
}) {
  const padding = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex gap-0.5 border border-border rounded-lg p-0.5 bg-card",
        className,
      )}
    >
      {options.map(opt => {
        const active = value === opt.v;
        return (
          <button
            key={opt.v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.v)}
            className={cn(
              padding,
              "rounded transition-colors tabular-nums",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
