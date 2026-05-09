import { cn } from "@/lib/utils";
import type { Tone } from "./status-badge";
import { InfoTooltip } from "./info-tooltip";

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
  tooltipTerm,
  tooltipText,
  sparkline,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  deltaDirection?: DeltaDirection;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
  tooltipTerm?: string;
  tooltipText?: string;
  sparkline?: number[];
}) {
  const dt = deltaTone(delta, deltaDirection);
  const valueCls =
    size === "sm" ? "text-xl mt-1" : size === "lg" ? "text-3xl mt-2" : "text-2xl mt-2";
  const padding = size === "sm" ? "p-3" : "p-5";
  return (
    <div className={cn("bg-card border border-border rounded-lg", padding, className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
          {label}
          {(tooltipTerm || tooltipText) && (
            <InfoTooltip term={tooltipTerm} text={tooltipText} />
          )}
        </span>
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
      {sparkline && sparkline.length > 1 && (
        <Sparkline values={sparkline} tone={tone ?? dt} />
      )}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const stroke =
    tone === "success"
      ? "var(--color-success)"
      : tone === "danger"
        ? "var(--color-destructive)"
        : tone === "warning"
          ? "var(--color-warning)"
          : tone === "info"
            ? "var(--color-info)"
            : "currentColor";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-6 mt-1.5 opacity-70"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
