import { cn } from "@/lib/utils";
import { StatusDot, type Tone } from "./status-badge";

/**
 * Pulse line: 1 frase no topo do produto que resume estado em 5 segundos.
 * Ex: "Saudavel: 8 vendas/d, CPA R$58, scale liberado."
 *     "Atencao: hook rate caindo em 2 criativos, frequencia 3.4."
 *     "Risco: lucro negativo 4d seguidos, freio recomendado."
 */
export function PulseLine({
  tone,
  message,
  detail,
  className,
}: {
  tone: Tone;
  message: string;
  detail?: string;
  className?: string;
}) {
  const TONE_BG: Record<Tone, string> = {
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
    danger: "bg-destructive/5 border-destructive/30",
    info: "bg-info/5 border-info/20",
    muted: "bg-muted/30 border-border",
  };
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 flex items-start gap-3",
        TONE_BG[tone],
        className,
      )}
    >
      <StatusDot tone={tone} className="mt-1.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug">{message}</div>
        {detail && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
