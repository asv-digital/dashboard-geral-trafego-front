import { cn } from "@/lib/utils";
import type { Tone } from "./status-badge";

export type DeltaDirection = "up_good" | "down_good" | "neutral";

function deltaTone(value: number | null | undefined, direction: DeltaDirection): Tone {
  if (value == null || direction === "neutral") return "muted";
  if (direction === "up_good") return value >= 0 ? "success" : "danger";
  return value <= 0 ? "success" : "danger";
}

function formatDelta(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  muted: "text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaDirection = "up_good",
  tone,
  size = "md",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  deltaDirection?: DeltaDirection;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dt = deltaTone(delta, deltaDirection);
  const valueCls =
    size === "sm" ? "text-xl mt-1" : size === "lg" ? "text-3xl mt-2" : "text-2xl mt-2";
  const padding = size === "sm" ? "p-3" : "p-5";
  return (
    <div className={cn("bg-card border border-border rounded-lg", padding, className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {delta != null && Number.isFinite(delta) && (
          <span className={cn("text-[10px] tabular-nums font-medium", TONE_TEXT[dt])}>
            {formatDelta(delta)}
          </span>
        )}
      </div>
      <div
        className={cn(
          "font-heading font-semibold tabular-nums",
          valueCls,
          tone && TONE_TEXT[tone],
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
