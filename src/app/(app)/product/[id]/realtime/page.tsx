"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ActionLogItem } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { formatRelativeTime } from "@/lib/format";

// Mapping action → categoria + cor + emoji. Ações conhecidas têm visual
// próprio; desconhecidas caem em "system" cinza.
type ActionCategory = "scale" | "pause" | "warning" | "system" | "info";

const ACTION_META: Record<
  string,
  { category: ActionCategory; emoji: string; label?: string }
> = {
  auto_scale: { category: "scale", emoji: "📈", label: "ESCALOU" },
  auto_scale_down: { category: "warning", emoji: "📉", label: "REDUZIU" },
  auto_scale_skipped_cooldown: { category: "info", emoji: "⏸", label: "scale-cooldown" },
  auto_pause_no_sales: { category: "pause", emoji: "🛑", label: "PAUSOU" },
  auto_pause_breakeven: { category: "pause", emoji: "🛑", label: "PAUSOU breakeven" },
  auto_pause_frequency: { category: "pause", emoji: "🛑", label: "PAUSOU freq" },
  auto_pause_asc: { category: "pause", emoji: "🛑", label: "PAUSOU ASC" },
  pause_delayed_pending_sales: { category: "info", emoji: "⏳", label: "pause-postponed" },
  emergency_budget_pause: { category: "warning", emoji: "🚨", label: "EMERGÊNCIA" },
  soft_budget_pause: { category: "warning", emoji: "⚠️", label: "soft-pause" },
  budget_rebalance: { category: "info", emoji: "⚖️", label: "rebalance" },
  dayparting_reduce: { category: "info", emoji: "🌙", label: "dayparting-off" },
  dayparting_restore: { category: "info", emoji: "☀️", label: "dayparting-on" },
  ab_test_concluded: { category: "scale", emoji: "🏆", label: "A/B concluído" },
  creative_retire: { category: "warning", emoji: "🪦", label: "creative aposentado" },
  learning_phase_exit: { category: "info", emoji: "🎓", label: "learning encerrado" },
  sale_approved: { category: "scale", emoji: "💰", label: "venda" },
  sale_refunded: { category: "warning", emoji: "↩️", label: "reembolso" },
  sale_chargeback: { category: "pause", emoji: "💸", label: "chargeback" },
};

const CATEGORY_CLS: Record<ActionCategory, string> = {
  scale: "bg-success/10 text-success border-success/30",
  pause: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  system: "bg-muted/40 text-muted-foreground border-border",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const CATEGORY_FILTERS: Array<{ key: "all" | ActionCategory; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "scale", label: "Scale" },
  { key: "pause", label: "Pauses" },
  { key: "warning", label: "Atenção" },
  { key: "info", label: "Sistema" },
];

export default function RealtimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [filter, setFilter] = useState<"all" | ActionCategory>("all");

  const actions = useQuery({
    queryKey: ["actions", id, 100],
    queryFn: () => api.listActions(id, { limit: 100 }),
    refetchInterval: 30_000,
  });

  const items = actions.data?.actions ?? [];
  const filtered = filter === "all" ? items : items.filter(a => getCategory(a.action) === filter);

  return (
    <div className="p-6 md:p-8 space-y-4">
      <PageHeader
        title="Tempo real"
        subtitle="Feed de decisoes do agente. Atualiza a cada 30s."
      />

      <div className="flex gap-2 flex-wrap">
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-60">
                {items.filter(a => getCategory(a.action) === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {actions.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {filter === "all"
              ? "Nenhuma decisão ainda."
              : `Nenhuma ação na categoria "${filter}".`}
          </p>
          {items.length === 0 && (
            <p className="text-muted-foreground/70 text-xs mt-1">
              O agente roda a cada {intervalLabel()}. Aguarde ou clique &quot;rodar ciclo agora&quot; na visão geral.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <ActionEvent key={a.id} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function intervalLabel() {
  return "4h"; // default scheduler — poderia vir de /api/agent/status
}

function getCategory(action: string): ActionCategory {
  return ACTION_META[action]?.category ?? "system";
}

function ActionEvent({ action }: { action: ActionLogItem }) {
  const meta = ACTION_META[action.action] ?? { category: "system" as ActionCategory, emoji: "⚙️" };
  return (
    <article className={`border rounded-lg px-4 py-3 ${CATEGORY_CLS[meta.category]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{meta.emoji}</span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider font-medium">
              {meta.label ?? action.action}
            </div>
            {action.entityName && (
              <div className="text-sm font-medium truncate text-foreground">
                {action.entityName}
              </div>
            )}
          </div>
        </div>
        <span className="text-[11px] shrink-0 opacity-70 tabular-nums">
          {formatRelativeTime(action.executedAt)}
        </span>
      </div>
      {action.details && (
        <div className="text-xs text-muted-foreground mt-1.5 ml-7">{action.details}</div>
      )}
      {action.reasoning && (
        <details className="text-xs mt-1.5 ml-7">
          <summary className="cursor-pointer text-muted-foreground/70 hover:text-muted-foreground">
            por quê?
          </summary>
          <div className="text-muted-foreground mt-1.5 leading-relaxed">{action.reasoning}</div>
        </details>
      )}
    </article>
  );
}

