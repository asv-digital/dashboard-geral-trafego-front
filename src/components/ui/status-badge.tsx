import { cn } from "@/lib/utils";

/**
 * Status semantico unificado. Sempre usar uma destas chaves.
 * Eliminadas: elite/bom/mediano/critico, ahead/on_track/behind/critical, healthy/attention/risk.
 */
export type Tone = "success" | "warning" | "danger" | "info" | "muted";

const TONE_CLS: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-info/10 text-info border-info/30",
  muted: "bg-muted/40 text-muted-foreground border-border",
};

const DOT_CLS: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

export function StatusBadge({
  tone,
  label,
  dot = false,
  size = "md",
  className,
}: {
  tone: Tone;
  label: string;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 uppercase tracking-wider rounded border",
        padding,
        TONE_CLS[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLS[tone])} />}
      {label}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cn("h-2 w-2 rounded-full inline-block", DOT_CLS[tone], className)} />;
}
