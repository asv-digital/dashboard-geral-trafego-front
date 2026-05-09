"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, RefreshCw, Zap, Pause, Play, AlertTriangle } from "lucide-react";
import {
  api,
  type ActivityItem,
  type DecisionItem,
  type DecisionQueueResponse,
  type HeartbeatItem,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusDot, type Tone } from "@/components/ui/status-badge";

const CYCLE_HOURS_DEFAULT = 4;

export default function OrquestradorPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(0);

  // Tick por segundo pra countdown vivo
  useEffect(() => {
    const sync = () => setNow(Date.now());
    sync();
    const id = window.setInterval(sync, 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data: heartbeats } = useQuery({
    queryKey: ["global", "heartbeats"],
    queryFn: () => api.globalHeartbeats(),
    refetchInterval: 30_000,
  });
  const { data: activity } = useQuery({
    queryKey: ["global", "activity"],
    queryFn: () => api.globalActivity(),
    refetchInterval: 15_000,
  });
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });

  const heartbeatItems = useMemo(() => heartbeats?.heartbeats ?? [], [heartbeats]);
  const activityItems = useMemo(() => activity?.activity ?? [], [activity]);
  const productList = useMemo(() => products?.products ?? [], [products]);

  // Decision queue agregada cross-product
  const decisionQueries = useQueries({
    queries: productList.map(p => ({
      queryKey: ["analytics", "decisions", p.id],
      queryFn: () => api.decisionQueue(p.id),
      refetchInterval: 5 * 60_000,
    })),
  });

  // Forçar ciclo agora em todos os produtos
  const forceCycleAll = useMutation({
    mutationFn: async () => {
      await Promise.all(productList.map(p => api.runAgentProduct(p.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global", "heartbeats"] });
      queryClient.invalidateQueries({ queryKey: ["global", "activity"] });
    },
  });

  const overallHealth = computeOverallHealth(heartbeatItems, now);

  const stats = useMemo(() => computeActionStats(activityItems), [activityItems]);
  const decisionItems = useMemo(() => {
    const all: Array<DecisionItem & { productSlug: string; productId: string }> = [];
    decisionQueries.forEach((q, i) => {
      const p = productList[i];
      const data = q.data as DecisionQueueResponse | undefined;
      if (!p || !data) return;
      data.items.forEach(item =>
        all.push({ ...item, productSlug: p.slug, productId: p.id }),
      );
    });
    return all.sort((a, b) => a.priority - b.priority).slice(0, 8);
  }, [decisionQueries, productList]);

  const recentlyActive = heartbeatItems.some(h => {
    if (!h.lastCollectionAt) return false;
    return now - new Date(h.lastCollectionAt).getTime() < 30_000;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <PageHeader
        title="Orquestrador"
        subtitle="Centro de controle do agente — ciclos, fila de decisoes e acoes em tempo real."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge tone={overallHealth.tone} label={overallHealth.label} dot />
            <button
              onClick={() => forceCycleAll.mutate()}
              disabled={forceCycleAll.isPending || productList.length === 0}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Zap className={`w-3 h-3 ${forceCycleAll.isPending ? "animate-pulse" : ""}`} />
              {forceCycleAll.isPending ? "rodando..." : "Forcar ciclo agora"}
            </button>
          </div>
        }
      />

      {/* Cards principais: ciclo + atividade + falhas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CycleCountdownCard heartbeats={heartbeatItems} now={now} pulse={recentlyActive} />
        <SummaryCard
          icon={<Activity className="w-4 h-4" />}
          label="Acoes hoje"
          value={String(activityItems.filter(a => isToday(a.executedAt)).length)}
          hint={`${activityItems.filter(a => isLast24h(a.executedAt)).length} nas ultimas 24h`}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Falhas consecutivas"
          value={String(
            heartbeatItems.reduce((acc, h) => acc + (h.consecutiveFailures || 0), 0),
          )}
          hint={`${productList.length} produtos monitorados`}
          tone={
            heartbeatItems.some(h => h.consecutiveFailures >= 3)
              ? "danger"
              : heartbeatItems.some(h => h.consecutiveFailures > 0)
                ? "warning"
                : "success"
          }
        />
      </section>

      {/* Stats por categoria — 7 dias */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Acoes do agente — ultimos 7 dias
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CategoryStatCard
            icon={<Play className="w-3.5 h-3.5" />}
            label="Escalas"
            count={stats.scale7d}
            tone="success"
          />
          <CategoryStatCard
            icon={<Pause className="w-3.5 h-3.5" />}
            label="Pauses"
            count={stats.pause7d}
            tone="danger"
          />
          <CategoryStatCard
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            label="Rotacoes"
            count={stats.rotate7d}
            tone="info"
          />
          <CategoryStatCard
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Alertas"
            count={stats.warning7d}
            tone="warning"
          />
        </div>
      </section>

      {/* Timeline visual 24h */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Linha do tempo · ultimas 24h
        </h2>
        <Timeline24h items={activityItems} now={now} />
      </section>

      {/* Saúde do agente por produto */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Saude do agente por produto
        </h2>
        {heartbeatItems.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            Sem produtos monitorados ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {heartbeatItems.map(h => (
              <AgentHealthCard key={h.productId} heartbeat={h} now={now} />
            ))}
          </div>
        )}
      </section>

      {/* Próximas decisões na fila */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Proximas acoes na fila ({decisionItems.length})
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {decisionItems.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground italic">
              Nenhuma acao priorizada agora. O agente esta apenas monitorando.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {decisionItems.map((d, idx) => (
                <DecisionRow key={`${d.productId}-${d.title}-${idx}`} decision={d} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Feed em tempo real */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          Acoes em tempo real
          {recentlyActive && (
            <span className="inline-flex items-center gap-1 text-[10px] text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              ao vivo
            </span>
          )}
        </h2>
        <div className="bg-card border border-border rounded-lg divide-y divide-border max-h-[420px] overflow-y-auto">
          {activityItems.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground italic">
              Sem acoes registradas. Quando o agente rodar pela primeira vez, aparecem aqui.
            </div>
          ) : (
            activityItems.slice(0, 50).map(item => (
              <ActionRow key={item.id} item={item} now={now} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CycleCountdownCard({
  heartbeats,
  now,
  pulse,
}: {
  heartbeats: HeartbeatItem[];
  now: number;
  pulse: boolean;
}) {
  const last = heartbeats.reduce<number>((acc, h) => {
    if (!h.lastCollectionAt) return acc;
    return Math.max(acc, new Date(h.lastCollectionAt).getTime());
  }, 0);
  const next = last > 0 ? last + CYCLE_HOURS_DEFAULT * 60 * 60 * 1000 : 0;
  const diff = next - now;
  const overdue = next > 0 && diff < 0;
  const ready = next > 0 && diff < 30_000;
  const eta =
    next === 0
      ? "—"
      : ready
        ? "rodando..."
        : overdue
          ? "ja passou"
          : formatCountdown(diff);

  return (
    <div
      className={`bg-card border rounded-lg p-4 ${
        pulse ? "border-success/40" : ready || overdue ? "border-warning/40" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className={`w-4 h-4 ${pulse ? "animate-spin text-success" : ""}`} />
        <span className="text-[10px] uppercase tracking-wider">Proximo ciclo</span>
      </div>
      <div className="text-2xl font-heading font-semibold mt-1 tabular-nums">{eta}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">
        ultima coleta:{" "}
        {last > 0 ? formatRelativeTime(new Date(last), now) : "nunca"}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const toneCls = tone
    ? tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-destructive"
          : ""
    : "";
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-heading font-semibold mt-1 tabular-nums ${toneCls}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function CategoryStatCard({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: Tone;
}) {
  const toneCls =
    tone === "success"
      ? "text-success border-success/30 bg-success/5"
      : tone === "danger"
        ? "text-destructive border-destructive/30 bg-destructive/5"
        : tone === "warning"
          ? "text-warning border-warning/30 bg-warning/5"
          : "text-info border-info/30 bg-info/5";
  return (
    <div className={`border rounded-lg p-3 ${toneCls}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider opacity-70 inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </div>
      <div className="text-2xl font-heading font-semibold mt-1 tabular-nums">{count}</div>
    </div>
  );
}

function Timeline24h({ items, now }: { items: ActivityItem[]; now: number }) {
  // Agrupa em buckets de hora (24 buckets)
  const buckets = useMemo(() => {
    const result: Array<{ hour: number; total: number; tone: Tone }> = [];
    const windowStart = now - 24 * 60 * 60 * 1000;
    for (let i = 0; i < 24; i++) {
      result.push({ hour: i, total: 0, tone: "muted" });
    }
    items.forEach(item => {
      const t = new Date(item.executedAt).getTime();
      if (t < windowStart || t > now) return;
      const hoursAgo = Math.floor((now - t) / (60 * 60 * 1000));
      const idx = 23 - hoursAgo;
      if (idx >= 0 && idx < 24) {
        result[idx].total++;
        const tone = actionTone(item.action);
        if (toneSeverity(tone) > toneSeverity(result[idx].tone)) {
          result[idx].tone = tone;
        }
      }
    });
    return result;
  }, [items, now]);

  const maxTotal = Math.max(...buckets.map(b => b.total), 1);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-end gap-1 h-20">
        {buckets.map((b, i) => {
          const heightPct = (b.total / maxTotal) * 100;
          const toneBg =
            b.tone === "success"
              ? "bg-success"
              : b.tone === "danger"
                ? "bg-destructive"
                : b.tone === "warning"
                  ? "bg-warning"
                  : b.tone === "info"
                    ? "bg-info"
                    : "bg-muted/40";
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end items-center group relative"
              title={`${b.total} acoes ha ${23 - i}h`}
            >
              {b.total > 0 ? (
                <div
                  className={`w-full rounded-t ${toneBg} transition-all hover:opacity-80`}
                  style={{ height: `${Math.max(heightPct, 8)}%` }}
                />
              ) : (
                <div className="w-full h-px bg-muted/30" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-muted-foreground tabular-nums">
        <span>-24h</span>
        <span>-18h</span>
        <span>-12h</span>
        <span>-6h</span>
        <span>agora</span>
      </div>
    </div>
  );
}

function AgentHealthCard({ heartbeat, now }: { heartbeat: HeartbeatItem; now: number }) {
  const lastCollection = heartbeat.lastCollectionAt ? new Date(heartbeat.lastCollectionAt) : null;
  const hoursSince =
    lastCollection && now > 0 ? (now - lastCollection.getTime()) / (1000 * 60 * 60) : null;
  const tone: Tone =
    hoursSince === null
      ? "muted"
      : hoursSince > 8
        ? "danger"
        : hoursSince > 5
          ? "warning"
          : "success";
  const label =
    hoursSince === null
      ? "Sem dado"
      : tone === "success"
        ? "Saudavel"
        : tone === "warning"
          ? "Atrasado"
          : "Parado";

  return (
    <Link
      href={`/product/${heartbeat.productId}`}
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors block"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {heartbeat.product?.name ?? "Produto sem nome"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Ultimo ciclo:{" "}
            <span className="text-foreground tabular-nums">
              {lastCollection ? formatRelativeTime(lastCollection, now) : "nunca rodou"}
            </span>
          </div>
          {heartbeat.lastAutomationAt && (
            <div className="text-[11px] text-muted-foreground tabular-nums">
              Ultima acao: {formatRelativeTime(heartbeat.lastAutomationAt, now)}
            </div>
          )}
          {heartbeat.consecutiveFailures > 0 && (
            <div className="text-[11px] text-destructive mt-1">
              {heartbeat.consecutiveFailures} falha(s) consecutiva(s)
            </div>
          )}
          {heartbeat.lastError && (
            <div className="text-[10px] text-destructive/80 mt-1 truncate">
              {heartbeat.lastError.slice(0, 100)}
            </div>
          )}
        </div>
        <StatusBadge tone={tone} label={label} dot size="sm" />
      </div>
    </Link>
  );
}

function DecisionRow({
  decision,
}: {
  decision: DecisionItem & { productSlug: string };
}) {
  const tone: Tone =
    decision.priority < 5 ? "danger" : decision.priority < 10 ? "warning" : "info";
  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <StatusDot tone={tone} className="mt-1.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{decision.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{decision.reasoning}</div>
            {decision.estimatedImpact && (
              <div className="text-[11px] text-muted-foreground/80 italic mt-1">
                → {decision.estimatedImpact}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {decision.productSlug}
          </div>
          <div className="text-[10px] text-muted-foreground tabular-nums mt-1">
            #{decision.priority}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ item, now }: { item: ActivityItem; now: number }) {
  const tone = actionTone(item.action);
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot tone={tone} />
          <span className="font-mono text-primary">{item.action}</span>
          {item.product?.slug && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
              · {item.product.slug}
            </span>
          )}
        </div>
        <span className="text-muted-foreground tabular-nums shrink-0">
          {formatRelativeTime(item.executedAt, now)}
        </span>
      </div>
      <div className="text-muted-foreground mt-1 ml-3.5">
        {item.entityName || item.entityType}
        {item.details ? ` — ${item.details}` : ""}
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────

function actionTone(action: string): Tone {
  if (action.includes("scale_down") || action.includes("emergency") || action.includes("chargeback")) return "danger";
  if (action.includes("pause")) return "danger";
  if (action.includes("scale") || action.includes("sale_approved") || action.includes("ab_test_concluded")) return "success";
  if (action.includes("warning") || action.includes("alert") || action.includes("refund") || action.includes("retire")) return "warning";
  return "info";
}

function toneSeverity(t: Tone): number {
  return ["muted", "info", "success", "warning", "danger"].indexOf(t);
}

function computeOverallHealth(
  hearts: HeartbeatItem[],
  now: number,
): { tone: Tone; label: string } {
  if (hearts.length === 0) return { tone: "muted", label: "Sem dado" };
  let worst: Tone = "success";
  for (const h of hearts) {
    if (!h.lastCollectionAt) {
      if (toneSeverity("muted") > toneSeverity(worst)) worst = "muted";
      continue;
    }
    const hoursSince = (now - new Date(h.lastCollectionAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 8 && toneSeverity("danger") > toneSeverity(worst)) worst = "danger";
    else if (hoursSince > 5 && toneSeverity("warning") > toneSeverity(worst)) worst = "warning";
  }
  const label =
    worst === "success"
      ? "Agente saudavel"
      : worst === "warning"
        ? "Agente com atrasos"
        : worst === "danger"
          ? "Agente parado"
          : "Sem dado";
  return { tone: worst, label };
}

function computeActionStats(items: ActivityItem[]) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = items.filter(i => new Date(i.executedAt).getTime() >= sevenDaysAgo);
  return {
    scale7d: recent.filter(i => i.action.includes("scale") && !i.action.includes("scale_down")).length,
    pause7d: recent.filter(i => i.action.includes("pause") && !i.action.includes("postponed")).length,
    rotate7d: recent.filter(i => i.action.includes("rotate") || i.action.includes("ab_test")).length,
    warning7d: recent.filter(
      i => i.action.includes("warning") || i.action.includes("alert") || i.action.includes("refund") || i.action.includes("chargeback"),
    ).length,
  };
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function isLast24h(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "0s";
  const total = Math.floor(diffMs / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

