"use client";

import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  type ActionLogItem,
  type AwarenessMismatchesResponse,
  type BriefingResponse,
  type CreativeMismatch,
  type CreativeVolumeScoreResponse,
  type DecisionQueueResponse,
  type MonthlyPaceResponse,
  type PaceStatus,
  type ProfitWaterfallResponse,
  type TimeseriesMetric,
} from "@/lib/api";
import { formatBRL, formatNumber } from "@/lib/format";

export default function ProductOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
  });
  const waterfall = useQuery({
    queryKey: ["analytics", "waterfall", id],
    queryFn: () => api.profitWaterfall(id, 7),
    refetchInterval: 5 * 60_000,
  });
  const volume = useQuery({
    queryKey: ["analytics", "volume", id],
    queryFn: () => api.creativeVolumeScore(id),
    refetchInterval: 10 * 60_000,
  });
  const decisions = useQuery({
    queryKey: ["analytics", "decisions", id],
    queryFn: () => api.decisionQueue(id),
    refetchInterval: 5 * 60_000,
  });
  const briefing = useQuery({
    queryKey: ["analytics", "briefing", id],
    queryFn: () => api.briefing(id, false),
    refetchInterval: 30 * 60_000,
  });
  const heartbeats = useQuery({
    queryKey: ["agent", "heartbeats"],
    queryFn: () => api.agentHeartbeats(),
    refetchInterval: 60_000,
  });
  const recentActions = useQuery({
    queryKey: ["actions", id, 8],
    queryFn: () => api.listActions(id, { limit: 8 }),
    refetchInterval: 60_000,
  });
  const pace = useQuery({
    queryKey: ["analytics", "monthly-pace", id],
    queryFn: () => api.monthlyPace(id),
    refetchInterval: 5 * 60_000,
  });
  const mismatches = useQuery({
    queryKey: ["analytics", "mismatches", id],
    queryFn: () => api.awarenessMismatches(id, 30),
    refetchInterval: 10 * 60_000,
  });

  const briefingRefresh = useMutation({
    mutationFn: () => api.briefing(id, true),
    onSuccess: data => {
      queryClient.setQueryData(["analytics", "briefing", id], data);
    },
  });

  const productData = productData_extract(product.data);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {productData?.supervisedMode && (
        <div className="text-sm px-4 py-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-3">
          <span className="font-medium">SUPERVISED MODE ON</span>
          <span className="text-amber-400/80">
            agente coleta+sugere mas não muda nada no Meta. Desligue em /config quando confiar.
          </span>
        </div>
      )}

      {/* Hero KPIs */}
      <HeroKpis waterfall={waterfall.data} volume={volume.data} loading={waterfall.isLoading} />

      {/* Pacing + Mismatches (Roadmap Sobral 1, 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PacingCard data={pace.data} loading={pace.isLoading} />
        <MismatchesCard data={mismatches.data} loading={mismatches.isLoading} />
      </div>

      {/* Status Agente + Briefing IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BriefingCard
            data={briefing.data}
            loading={briefing.isLoading}
            refreshing={briefingRefresh.isPending}
            onRefresh={() => briefingRefresh.mutate()}
          />
        </div>
        <AgentStatusCard
          productId={id}
          heartbeat={heartbeats.data?.heartbeats.find(h => h.productId === id)}
          loading={heartbeats.isLoading}
        />
      </div>

      {/* 4 charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard productId={id} metric="cpa" title="CPA" subtitle="ideal: estável ou caindo" format="brl" />
        <ChartCard productId={id} metric="roas" title="ROAS" subtitle="meta: ≥ 1.6x sustentado" format="x" />
        <ChartCard productId={id} metric="sales" title="Vendas/dia" subtitle="atribuição Kirvano webhook" format="num" type="bar" />
        <ChartCard productId={id} metric="spend" title="Gasto/dia" subtitle="vs target diário do produto" format="brl" type="bar" />
      </div>

      {/* Decision Queue resumido + Recent actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DecisionQueuePreview data={decisions.data} loading={decisions.isLoading} />
        <RecentActionsCard actions={recentActions.data?.actions ?? []} loading={recentActions.isLoading} />
      </div>
    </div>
  );
}

function productData_extract(d: { product?: { supervisedMode: boolean } } | undefined) {
  return d?.product;
}

// ─── Hero ───────────────────────────────────────────────────────────

function HeroKpis({
  waterfall,
  volume,
  loading,
}: {
  waterfall: ProfitWaterfallResponse | undefined;
  volume: CreativeVolumeScoreResponse | undefined;
  loading: boolean;
}) {
  if (loading || !waterfall) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <BigKpi
        label="Gasto 7d"
        value={formatBRL(waterfall.spend)}
        delta={null}
      />
      <BigKpi
        label="Vendas 7d"
        value={formatNumber(waterfall.approvedSales)}
        delta={waterfall.delta.salesPct}
      />
      <BigKpi
        label="CPA 7d"
        value={
          waterfall.approvedSales > 0
            ? formatBRL(waterfall.spend / waterfall.approvedSales)
            : "—"
        }
        delta={null}
      />
      <BigKpi
        label="ROAS 7d"
        value={waterfall.roas ? `${waterfall.roas.toFixed(2)}x` : "—"}
        tone={
          waterfall.roas
            ? waterfall.roas >= 2
              ? "success"
              : waterfall.roas < 1.4
                ? "danger"
                : undefined
            : undefined
        }
      />
      <BigKpi
        label="Profit 7d"
        value={formatBRL(waterfall.contributionMargin)}
        delta={waterfall.delta.cmPct}
        tone={
          waterfall.contributionMargin > 0
            ? "success"
            : waterfall.contributionMargin < 0
              ? "danger"
              : undefined
        }
        emphasis
      />
      <BigKpi
        label="Score"
        value={volume ? `${volume.totalScore}` : "—"}
        hint={volume?.grade}
        tone={
          volume?.grade === "elite"
            ? "success"
            : volume?.grade === "critico"
              ? "danger"
              : undefined
        }
      />
    </div>
  );
}

function BigKpi({
  label,
  value,
  delta,
  hint,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  tone?: "success" | "danger";
  emphasis?: boolean;
}) {
  return (
    <div
      className={`bg-card border rounded-lg px-4 py-3 ${
        emphasis ? "border-primary/40" : "border-border"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-heading tabular-nums ${
          emphasis ? "text-2xl font-semibold" : "text-xl font-medium"
        } ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""}`}
      >
        {value}
      </div>
      {delta !== null && delta !== undefined && (
        <div
          className={`text-[10px] mt-0.5 tabular-nums ${
            delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(0)}% vs 7d ant.
        </div>
      )}
      {hint && (
        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
          {hint}
        </div>
      )}
    </div>
  );
}

// ─── Pacing Mensal ──────────────────────────────────────────────────

const PACE_STATUS_META: Record<PaceStatus, { label: string; cls: string; emoji: string }> = {
  ahead: { label: "Adiante da meta", cls: "text-success", emoji: "🟢" },
  on_track: { label: "No ritmo", cls: "text-emerald-400", emoji: "🔵" },
  behind: { label: "Atrás da meta", cls: "text-yellow-500", emoji: "🟡" },
  critical: { label: "CRÍTICO", cls: "text-destructive", emoji: "🔴" },
  no_goal: { label: "Sem meta cadastrada", cls: "text-muted-foreground", emoji: "⚪" },
};

function PacingCard({ data, loading }: { data: MonthlyPaceResponse | undefined; loading: boolean }) {
  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-medium">Pacing mensal</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sobral: meta mensal direciona quão agressivo escalar.
          </p>
        </div>
        {data && (
          <span className="text-xs text-muted-foreground">
            D{data.dayOfMonth}/{data.daysInMonth}
          </span>
        )}
      </div>
      {loading || !data ? (
        <SkeletonLines lines={3} />
      ) : data.status === "no_goal" ? (
        <div className="text-sm text-muted-foreground">
          Sem MonthlyGoal cadastrada pra {data.month}. Cadastre em <strong>/config</strong> pra
          o agente ajustar threshold de scale dinamicamente.
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-heading font-semibold tabular-nums">
              {data.currentSales}
              <span className="text-base text-muted-foreground font-normal">
                {" "}
                / {data.targetSales}
              </span>
            </div>
            <div className={`text-sm ${PACE_STATUS_META[data.status].cls}`}>
              {PACE_STATUS_META[data.status].emoji} {PACE_STATUS_META[data.status].label}
            </div>
          </div>
          {/* Barra de progresso */}
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div
              className={`h-full ${
                data.status === "ahead"
                  ? "bg-success"
                  : data.status === "on_track"
                    ? "bg-emerald-500"
                    : data.status === "behind"
                      ? "bg-yellow-500"
                      : "bg-destructive"
              }`}
              style={{
                width: `${Math.min(100, ((data.currentSales / (data.targetSales || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Pace projetado</div>
              <div className="font-medium tabular-nums">{data.pace ?? "—"} vendas</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Precisa/dia</div>
              <div className="font-medium tabular-nums">
                {data.requiredDailySales !== null ? data.requiredDailySales : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Restam</div>
              <div className="font-medium tabular-nums">{data.daysLeft}d</div>
            </div>
          </div>
          {data.scaleThresholdAdjust !== 1.0 && (
            <div className="text-[11px] text-muted-foreground mt-3 italic">
              Agente ajustou threshold de scale em ×{data.scaleThresholdAdjust.toFixed(2)} —{" "}
              {data.scaleThresholdAdjust > 1
                ? "mais agressivo (atrás da meta)"
                : "mais conservador (adiante)"}
              .
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─── Awareness Mismatches ───────────────────────────────────────────

function MismatchesCard({
  data,
  loading,
}: {
  data: AwarenessMismatchesResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-medium">Awareness × Audiência (Schwartz)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cold ≠ product-aware. Copy avançada em audiência fria explode CPA.
          </p>
        </div>
      </div>
      {loading || !data ? (
        <SkeletonLines lines={3} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            <SeverityChip
              label="Ideal"
              value={data.bySeverity.ideal}
              cls="bg-success/10 text-success border-success/30"
            />
            <SeverityChip
              label="OK"
              value={data.bySeverity.ok}
              cls="bg-muted/40 text-muted-foreground border-border"
            />
            <SeverityChip
              label="Warn"
              value={data.bySeverity.warn}
              cls="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
            />
            <SeverityChip
              label="Mismatch"
              value={data.bySeverity.mismatch}
              cls="bg-destructive/10 text-destructive border-destructive/30"
            />
          </div>
          {data.items.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">
              {data.bySeverity.untagged > 0
                ? `${data.bySeverity.untagged} criativos sem tag — marque em /assets pra detectar mismatch.`
                : "Nenhum mismatch detectado nos últimos 30d."}
            </div>
          ) : (
            <div className="border border-border rounded mt-4">
              {data.items.slice(0, 5).map(m => (
                <MismatchRow key={m.creativeId} item={m} />
              ))}
              {data.items.length > 5 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
                  + {data.items.length - 5} outros mismatches
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SeverityChip({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`px-2 py-1.5 rounded border ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-base font-medium tabular-nums">{value}</div>
    </div>
  );
}

function MismatchRow({ item }: { item: CreativeMismatch }) {
  const isGrave = item.matchScore === "mismatch";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border last:border-b-0 text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.creativeName}</div>
        <div className="text-xs text-muted-foreground">
          <span className="text-primary">{item.awarenessStage}</span> em{" "}
          <span>{item.audience}</span> · CPA {item.cpa ? `R$${item.cpa.toFixed(0)}` : "—"}
        </div>
      </div>
      <span
        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
          isGrave
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
        }`}
      >
        {isGrave ? "GRAVE" : "warn"}
      </span>
    </div>
  );
}

// ─── Briefing IA ────────────────────────────────────────────────────

function BriefingCard({
  data,
  loading,
  refreshing,
  onRefresh,
}: {
  data: BriefingResponse | undefined;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-medium">Briefing executivo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerado por IA cruzando profit, hit rate, fadiga, decisões.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs px-2.5 py-1 bg-muted hover:bg-muted/70 rounded transition-colors shrink-0"
        >
          {refreshing ? "..." : "regenerar"}
        </button>
      </div>
      {loading || !data ? (
        <SkeletonLines lines={6} />
      ) : (
        <div className="prose prose-invert prose-sm max-w-none text-sm">
          <BriefingMarkdown text={data.briefing} />
          <p className="text-[10px] text-muted-foreground mt-3">
            {data.cached ? "cache 30min · " : ""}atualizado{" "}
            {new Date(data.generatedAt).toLocaleString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </p>
        </div>
      )}
    </section>
  );
}

function BriefingMarkdown({ text }: { text: string }) {
  // Renderer mínimo de markdown: ## H2, **bold**, listas, parágrafos.
  const blocks = text.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h3 key={i} className="text-sm font-semibold uppercase tracking-wider text-primary mt-3 first:mt-0">
              {block.slice(3).trim()}
            </h3>
          );
        }
        if (block.startsWith("- ")) {
          const items = block
            .split("\n")
            .filter(l => l.startsWith("- "))
            .map(l => l.slice(2));
          return (
            <ul key={i} className="space-y-1 text-sm my-2">
              {items.map((line, j) => (
                <li key={j} className="text-muted-foreground">
                  • <InlineMarkdown text={line} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm text-muted-foreground my-2 leading-relaxed">
            <InlineMarkdown text={block} />
          </p>
        );
      })}
    </>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-foreground font-medium">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Status Agente ──────────────────────────────────────────────────

function AgentStatusCard({
  productId,
  heartbeat,
  loading,
}: {
  productId: string;
  heartbeat:
    | {
        lastCollectionAt: string | null;
        lastAutomationAt: string | null;
        consecutiveFailures: number;
        lastError: string | null;
      }
    | undefined;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const runMutation = useMutation({
    mutationFn: () => api.runAgentProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "heartbeats"] });
      queryClient.invalidateQueries({ queryKey: ["actions", productId] });
    },
  });

  const status = heartbeat
    ? heartbeat.consecutiveFailures >= 3
      ? "down"
      : heartbeat.consecutiveFailures > 0
        ? "warn"
        : "ok"
    : "unknown";
  const statusColor = {
    ok: "bg-success",
    warn: "bg-yellow-500",
    down: "bg-destructive",
    unknown: "bg-muted",
  }[status];

  const sinceCollection = heartbeat?.lastCollectionAt
    ? relativeTime(heartbeat.lastCollectionAt)
    : "nunca";

  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-base font-medium">Agente</h2>
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
      </div>
      {loading ? (
        <SkeletonLines lines={3} />
      ) : (
        <dl className="space-y-2 text-sm">
          <Row label="Última coleta" value={sinceCollection} />
          <Row
            label="Última ação"
            value={heartbeat?.lastAutomationAt ? relativeTime(heartbeat.lastAutomationAt) : "nenhuma"}
          />
          <Row
            label="Status"
            value={
              status === "ok"
                ? "Saudável"
                : status === "warn"
                  ? `${heartbeat?.consecutiveFailures} falha(s)`
                  : status === "down"
                    ? "PARADO"
                    : "—"
            }
          />
          {heartbeat?.lastError && (
            <div className="text-xs text-destructive break-words mt-2">
              {heartbeat.lastError.slice(0, 200)}
            </div>
          )}
        </dl>
      )}
      <button
        onClick={() => runMutation.mutate()}
        disabled={runMutation.isPending}
        className="mt-4 w-full text-xs py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {runMutation.isPending ? "executando ciclo..." : "rodar ciclo agora"}
      </button>
    </section>
  );
}

// ─── Charts (Recharts) ──────────────────────────────────────────────

function ChartCard({
  productId,
  metric,
  title,
  subtitle,
  format,
  type = "line",
}: {
  productId: string;
  metric: TimeseriesMetric;
  title: string;
  subtitle: string;
  format: "brl" | "num" | "x" | "pct";
  type?: "line" | "bar";
}) {
  const q = useQuery({
    queryKey: ["analytics", "ts", productId, metric],
    queryFn: () => api.timeseries(productId, metric, 14),
    refetchInterval: 5 * 60_000,
  });

  const data = q.data?.points.map(p => ({
    date: p.date.slice(5), // MM-DD
    value: p.value,
  })) ?? [];

  const formatValue = (v: number | null | undefined) => {
    if (v === null || v === undefined) return "—";
    if (format === "brl") return formatBRL(v);
    if (format === "x") return `${v.toFixed(2)}x`;
    if (format === "pct") return `${v.toFixed(1)}%`;
    return v.toString();
  };

  return (
    <section className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {q.data?.current !== null && q.data?.current !== undefined && (
          <div className="text-right shrink-0">
            <div className="text-base font-medium tabular-nums">
              {formatValue(q.data.current)}
            </div>
            {q.data.deltaPct !== null && q.data.deltaPct !== undefined && (
              <div
                className={`text-[10px] tabular-nums ${
                  q.data.deltaPct > 0
                    ? metric === "cpa"
                      ? "text-destructive"
                      : "text-success"
                    : metric === "cpa"
                      ? "text-success"
                      : "text-destructive"
                }`}
              >
                {q.data.deltaPct > 0 ? "+" : ""}
                {q.data.deltaPct.toFixed(0)}% vs média 7d
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-40 mt-2">
        {q.isLoading ? (
          <div className="h-full bg-muted/20 rounded animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: unknown) => formatValue(typeof v === "number" ? v : null)}
                />
                <Bar dataKey="value" fill="#e89b6a" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: unknown) => formatValue(typeof v === "number" ? v : null)}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#e89b6a"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

// ─── Decision Queue preview ─────────────────────────────────────────

function DecisionQueuePreview({
  data,
  loading,
}: {
  data: DecisionQueueResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-medium">Próximas ações sugeridas</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">
        Top 3 cruzando fadiga, hit rate, profit, awareness.
      </p>
      {loading || !data ? (
        <SkeletonLines lines={3} />
      ) : data.items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem ações priorizadas.</div>
      ) : (
        <div className="space-y-2">
          {data.items.slice(0, 3).map((item, i) => (
            <div key={i} className="border border-border rounded p-2.5">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.reasoning}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Recent actions ─────────────────────────────────────────────────

function RecentActionsCard({
  actions,
  loading,
}: {
  actions: ActionLogItem[];
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-medium">Últimas decisões do agente</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">8 mais recentes.</p>
      {loading ? (
        <SkeletonLines lines={4} />
      ) : actions.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma ação ainda.</div>
      ) : (
        <div className="space-y-2">
          {actions.map(a => (
            <div key={a.id} className="text-xs border-b border-border pb-2 last:border-b-0">
              <div className="flex justify-between gap-2">
                <span className="font-mono text-primary">{a.action}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {relativeTime(a.executedAt)}
                </span>
              </div>
              {a.entityName && (
                <div className="text-muted-foreground mt-0.5 truncate">{a.entityName}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── primitives ─────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-muted/30 rounded animate-pulse"
          style={{ width: `${100 - i * 8}%` }}
        />
      ))}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

