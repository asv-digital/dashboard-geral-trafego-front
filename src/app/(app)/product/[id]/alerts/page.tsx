"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type AwarenessMismatchesResponse,
  type CreativeMismatch,
  type DecisionItem,
  type FatiguePrediction,
  type FatigueResponse,
  type MonthlyPaceResponse,
  type ProfitWaterfallResponse,
} from "@/lib/api";
import { formatBRL } from "@/lib/format";

type Severity = "critical" | "warning" | "info";

interface AlertItem {
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  action?: string;
}

export default function AlertsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const fatigue = useQuery({
    queryKey: ["analytics", "fatigue", id],
    queryFn: () => api.fatiguePredictions(id),
    refetchInterval: 5 * 60_000,
  });
  const mismatches = useQuery({
    queryKey: ["analytics", "mismatches", id],
    queryFn: () => api.awarenessMismatches(id, 30),
    refetchInterval: 10 * 60_000,
  });
  const pace = useQuery({
    queryKey: ["analytics", "monthly-pace", id],
    queryFn: () => api.monthlyPace(id),
    refetchInterval: 5 * 60_000,
  });
  const waterfall = useQuery({
    queryKey: ["analytics", "waterfall", id],
    queryFn: () => api.profitWaterfall(id, 7),
    refetchInterval: 5 * 60_000,
  });
  const decisions = useQuery({
    queryKey: ["analytics", "decisions", id],
    queryFn: () => api.decisionQueue(id),
    refetchInterval: 5 * 60_000,
  });

  const alerts = consolidateAlerts({
    fatigue: fatigue.data,
    mismatches: mismatches.data,
    pace: pace.data,
    waterfall: waterfall.data,
    decisions: decisions.data?.items ?? [],
  });

  const isLoading = fatigue.isLoading || mismatches.isLoading || pace.isLoading || waterfall.isLoading;

  const grouped = {
    critical: alerts.filter(a => a.severity === "critical"),
    warning: alerts.filter(a => a.severity === "warning"),
    info: alerts.filter(a => a.severity === "info"),
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Alertas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tudo que precisa de olho agora — consolidado de fadiga, mismatch, pacing, profit e decisões.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/20 rounded animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-success text-sm">✅ Sem alertas. Tudo limpo.</p>
        </div>
      ) : (
        <>
          {grouped.critical.length > 0 && (
            <Section title="Crítico" severity="critical" items={grouped.critical} />
          )}
          {grouped.warning.length > 0 && (
            <Section title="Atenção" severity="warning" items={grouped.warning} />
          )}
          {grouped.info.length > 0 && (
            <Section title="Informativo" severity="info" items={grouped.info} />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  severity,
  items,
}: {
  title: string;
  severity: Severity;
  items: AlertItem[];
}) {
  const cls = {
    critical: "bg-destructive/5 border-destructive/30",
    warning: "bg-yellow-500/5 border-yellow-500/30",
    info: "bg-blue-500/5 border-blue-500/30",
  }[severity];
  const headingCls = {
    critical: "text-destructive",
    warning: "text-yellow-500",
    info: "text-blue-400",
  }[severity];

  return (
    <section>
      <h3 className={`text-xs uppercase tracking-wider font-medium mb-2 ${headingCls}`}>
        {title} ({items.length})
      </h3>
      <div className={`border rounded-lg overflow-hidden ${cls}`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-border last:border-b-0 text-sm flex items-start gap-3"
          >
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                severity === "critical"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : severity === "warning"
                    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
              }`}
            >
              {item.category}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.detail}</div>
              {item.action && (
                <div className="text-xs text-muted-foreground/80 italic mt-1">→ {item.action}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function consolidateAlerts(input: {
  fatigue?: FatigueResponse;
  mismatches?: AwarenessMismatchesResponse;
  pace?: MonthlyPaceResponse;
  waterfall?: ProfitWaterfallResponse;
  decisions: DecisionItem[];
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  // CM negativo = crítico
  if (input.waterfall && input.waterfall.contributionMargin < 0 && input.waterfall.spend > 0) {
    alerts.push({
      severity: "critical",
      category: "Profit",
      title: `Contribution margin negativa (${formatBRL(input.waterfall.contributionMargin)} em 7d)`,
      detail: `Receita não cobre CAC + custos. ROAS ${input.waterfall.roas?.toFixed(2) ?? "—"}x.`,
      action: "Reduzir budget 50% e revisar oferta antes de continuar.",
    });
  }

  // Pacing crítico
  if (input.pace && input.pace.status === "critical") {
    alerts.push({
      severity: "critical",
      category: "Pacing",
      title: `Meta mensal em risco grave`,
      detail: `${input.pace.currentSales}/${input.pace.targetSales} vendas (D${input.pace.dayOfMonth}/${input.pace.daysInMonth}). Pace ${input.pace.paceRatio !== null ? Math.round(input.pace.paceRatio * 100) : "—"}%.`,
      action: input.pace.requiredDailySales !== null ? `Precisa ${input.pace.requiredDailySales} vendas/dia pros próximos ${input.pace.daysLeft} dias.` : undefined,
    });
  } else if (input.pace && input.pace.status === "behind") {
    alerts.push({
      severity: "warning",
      category: "Pacing",
      title: "Atrás da meta mensal",
      detail: `${input.pace.currentSales}/${input.pace.targetSales} vendas, pace ${input.pace.paceRatio !== null ? Math.round(input.pace.paceRatio * 100) : "—"}%. Agente já ajustou threshold de scale.`,
    });
  }

  // Mismatches graves
  const grave = input.mismatches?.items.filter(m => m.matchScore === "mismatch") ?? [];
  grave.forEach((m: CreativeMismatch) => {
    alerts.push({
      severity: "critical",
      category: "Schwartz",
      title: `Mismatch grave: "${m.creativeName}"`,
      detail: `Stage ${m.awarenessStage} em ${m.audience}. CPA atual ${m.cpa ? formatBRL(m.cpa) : "—"}.`,
      action: "Mover criativo pra Remarketing/ASC ou trocar copy pra problem/solution-aware.",
    });
  });

  // Fatigue critical
  const fatigueCrit = input.fatigue?.predictions.filter(p => p.status === "critical") ?? [];
  fatigueCrit.forEach((p: FatiguePrediction) => {
    alerts.push({
      severity: "critical",
      category: "Fadiga",
      title: `URGENTE: "${p.name}" morrendo`,
      detail: p.reason,
      action: p.daysToDeath ? `~${p.daysToDeath}d até virar loser. Substituir agora.` : undefined,
    });
  });

  // Fatigue declining = warning
  const fatigueDecl = input.fatigue?.predictions.filter(p => p.status === "declining") ?? [];
  fatigueDecl.slice(0, 5).forEach((p: FatiguePrediction) => {
    alerts.push({
      severity: "warning",
      category: "Fadiga",
      title: `Em queda: "${p.name}"`,
      detail: p.reason,
    });
  });

  // Mismatches warn (info)
  const warns = input.mismatches?.items.filter(m => m.matchScore === "warn") ?? [];
  warns.slice(0, 5).forEach((m: CreativeMismatch) => {
    alerts.push({
      severity: "info",
      category: "Schwartz",
      title: `Combinação fraca: "${m.creativeName}"`,
      detail: `Stage ${m.awarenessStage} em ${m.audience}. ${m.reason}`,
    });
  });

  // Decisions com priority < 10 = top 3 (critico/urgente)
  const topDecisions = input.decisions.filter(d => d.priority < 10).slice(0, 3);
  topDecisions.forEach(d => {
    alerts.push({
      severity: "warning",
      category: "Ação",
      title: d.title,
      detail: d.reasoning,
      action: d.estimatedImpact,
    });
  });

  return alerts;
}
