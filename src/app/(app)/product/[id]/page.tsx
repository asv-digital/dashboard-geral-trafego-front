"use client";

import { use, useState } from "react";
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
  type AwarenessMismatchesResponse,
  type BriefingResponse,
  type CeoReportResponse,
  type CreativeMismatch,
  type DecisionQueueResponse,
  type EmergencyStopResponse,
  type HeroKpiItem,
  type HeroKpisResponse,
  type MonthlyPaceResponse,
  type PaceStatus,
  type TimeseriesMetric,
} from "@/lib/api";
import { formatBRL, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/ui/kpi-card";
import { PeriodPicker } from "@/components/ui/period-picker";
import { PulseLine } from "@/components/ui/pulse-line";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";

const PACE_TONE: Record<PaceStatus, Tone> = {
  ahead: "success",
  on_track: "success",
  behind: "warning",
  critical: "danger",
  no_goal: "muted",
};

const PACE_LABEL: Record<PaceStatus, string> = {
  ahead: "Adiante",
  on_track: "No ritmo",
  behind: "Atras",
  critical: "Critico",
  no_goal: "Sem meta",
};

export default function ProductOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [days, setDays] = useState<number>(7);
  const queryClient = useQueryClient();

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
  });
  const pulse = useQuery({
    queryKey: ["analytics", "pulse", id, days],
    queryFn: () => api.pulse(id, days),
    refetchInterval: 5 * 60_000,
  });
  const heroKpis = useQuery({
    queryKey: ["analytics", "hero-kpis", id, days],
    queryFn: () => api.heroKpis(id, days),
    refetchInterval: 5 * 60_000,
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

  // Sparklines pra KPIs hero (14d cada)
  const tsCpa = useQuery({
    queryKey: ["analytics", "ts", id, "cpa", 14],
    queryFn: () => api.timeseries(id, "cpa", 14),
    refetchInterval: 10 * 60_000,
  });
  const tsRoas = useQuery({
    queryKey: ["analytics", "ts", id, "roas", 14],
    queryFn: () => api.timeseries(id, "roas", 14),
    refetchInterval: 10 * 60_000,
  });
  const tsSales = useQuery({
    queryKey: ["analytics", "ts", id, "sales", 14],
    queryFn: () => api.timeseries(id, "sales", 14),
    refetchInterval: 10 * 60_000,
  });
  const tsHook = useQuery({
    queryKey: ["analytics", "ts", id, "hookRate", 14],
    queryFn: () => api.timeseries(id, "hookRate", 14),
    refetchInterval: 10 * 60_000,
  });
  const tsCm = useQuery({
    queryKey: ["analytics", "ts", id, "cm", 14],
    queryFn: () => api.timeseries(id, "cm", 14),
    refetchInterval: 10 * 60_000,
  });

  // Erro de carregamento — qualquer query crítica que falhar vira banner.
  // Sparklines não entram pra não poluir.
  const queryErrors: { name: string; error: Error }[] = [
    product.isError && { name: "produto", error: product.error as Error },
    pulse.isError && { name: "pulse", error: pulse.error as Error },
    heroKpis.isError && { name: "KPIs", error: heroKpis.error as Error },
    decisions.isError && { name: "decisões", error: decisions.error as Error },
    briefing.isError && { name: "briefing", error: briefing.error as Error },
    pace.isError && { name: "pacing", error: pace.error as Error },
    mismatches.isError && {
      name: "awareness",
      error: mismatches.error as Error,
    },
  ].filter(Boolean) as { name: string; error: Error }[];

  const sparklines: Record<string, number[]> = {
    cpa: tsCpa.data?.points.map(p => p.value ?? 0) ?? [],
    roas: tsRoas.data?.points.map(p => p.value ?? 0) ?? [],
    sales: tsSales.data?.points.map(p => p.value ?? 0) ?? [],
    hookRate: tsHook.data?.points.map(p => p.value ?? 0) ?? [],
    profit: tsCm.data?.points.map(p => p.value ?? 0) ?? [],
  };

  const [briefingError, setBriefingError] = useState<string | null>(null);
  const briefingRefresh = useMutation({
    mutationFn: () => api.briefing(id, true),
    onSuccess: data => {
      queryClient.setQueryData(["analytics", "briefing", id], data);
      setBriefingError(null);
    },
    onError: (err: Error) => {
      setBriefingError(err.message || "falha ao regenerar briefing");
      setTimeout(() => setBriefingError(null), 5000);
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {queryErrors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <strong>Falha ao carregar:</strong> {queryErrors.map(q => q.name).join(", ")}.{" "}
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["product", id] });
              queryClient.invalidateQueries({ queryKey: ["analytics"] });
            }}
            className="underline hover:no-underline"
          >
            tentar novamente
          </button>
          <details className="mt-1 opacity-70">
            <summary className="cursor-pointer text-[10px]">detalhes</summary>
            <ul className="mt-1 ml-3 text-[10px] list-disc">
              {queryErrors.map(q => (
                <li key={q.name}>
                  <strong>{q.name}:</strong> {q.error.message}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
      {/* ZONA 1 — Pulse + acoes + periodo */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            {pulse.data ? (
              <PulseLine
                tone={pulse.data.tone}
                message={pulse.data.message}
                detail={pulse.data.detail}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card h-[68px] animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <PeriodPicker value={days} onChange={setDays} />
            <CeoReportButton productId={id} days={days} />
            <EmergencyStopButton productId={id} />
            <AgentStatusPill
              heartbeat={heartbeats.data?.heartbeats.find(h => h.productId === id)}
              supervisedMode={!!product.data?.product?.supervisedMode}
            />
          </div>
        </div>
      </section>

      {/* ZONA 2 — 6 KPIs hero essenciais com sparkline 14d */}
      <HeroKpisGrid
        data={heroKpis.data}
        loading={heroKpis.isLoading}
        keys={["profit", "sales", "cpa", "roas", "hookRate", "frequency"]}
        sparklines={sparklines}
      />

      {/* ZONA 3 — Briefing IA (2/3) + Pacing gauge + Proximas acoes (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BriefingCard
            data={briefing.data}
            loading={briefing.isLoading}
            refreshing={briefingRefresh.isPending}
            onRefresh={() => briefingRefresh.mutate()}
            refreshError={briefingError}
          />
        </div>
        <div className="space-y-4">
          <PacingGaugeCard data={pace.data} loading={pace.isLoading} />
          <DecisionQueuePreview data={decisions.data} loading={decisions.isLoading} />
        </div>
      </div>

      {/* ZONA 4 — Awareness mismatch (sinal Schwartz) */}
      <MismatchesCard data={mismatches.data} loading={mismatches.isLoading} />

      {/* ZONA 5 — 4 charts 2x2 (tendencia financeira detalhada) */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Tendencia financeira (14 dias)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard productId={id} metric="cpa" title="CPA" subtitle="ideal: estavel ou caindo" format="brl" days={Math.max(days, 14)} />
          <ChartCard productId={id} metric="roas" title="ROAS" subtitle="meta: >= 1.6x sustentado" format="x" days={Math.max(days, 14)} />
          <ChartCard productId={id} metric="sales" title="Vendas/dia" subtitle="atribuicao Kirvano webhook" format="num" type="bar" days={Math.max(days, 14)} />
          <ChartCard productId={id} metric="spend" title="Gasto/dia" subtitle="vs target diario do produto" format="brl" type="bar" days={Math.max(days, 14)} />
        </div>
      </div>
    </div>
  );
}

function PacingGaugeCard({
  data,
  loading,
}: {
  data: MonthlyPaceResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
          Pacing mensal
        </h3>
        {data && data.status !== "no_goal" && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            D{data.dayOfMonth}/{data.daysInMonth}
          </span>
        )}
      </div>
      {loading || !data ? (
        <SkeletonLines lines={3} />
      ) : data.status === "no_goal" ? (
        <div className="text-xs text-muted-foreground italic">
          Sem meta cadastrada — agente nao ajusta pacing.
        </div>
      ) : (
        <PacingGauge
          current={data.currentSales}
          target={data.targetSales ?? 0}
          status={data.status}
          dayOfMonth={data.dayOfMonth}
          daysInMonth={data.daysInMonth}
          requiredDailySales={data.requiredDailySales}
          daysLeft={data.daysLeft ?? 0}
        />
      )}
    </section>
  );
}

function PacingGauge({
  current,
  target,
  status,
  dayOfMonth,
  daysInMonth,
  requiredDailySales,
  daysLeft,
}: {
  current: number;
  target: number;
  status: PaceStatus;
  dayOfMonth: number;
  daysInMonth: number;
  requiredDailySales: number | null;
  daysLeft: number;
}) {
  const pct = Math.min(100, (current / Math.max(target, 1)) * 100);
  const expectedPct = (dayOfMonth / daysInMonth) * 100;
  const tone = PACE_TONE[status];
  const colorVar =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-destructive)";
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dashCurrent = (pct / 100) * circ;
  const dashExpected = (expectedPct / 100) * circ;
  const sizePx = 132;
  return (
    <div>
      <div className="flex items-center gap-3">
        <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`} className="shrink-0">
          {/* track */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={10}
          />
          {/* expected (cinza) */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke="var(--color-muted-foreground)"
            strokeOpacity={0.25}
            strokeWidth={2}
            strokeDasharray={`${dashExpected} ${circ}`}
            transform={`rotate(-90 ${sizePx / 2} ${sizePx / 2})`}
          />
          {/* current */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke={colorVar}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dashCurrent} ${circ}`}
            transform={`rotate(-90 ${sizePx / 2} ${sizePx / 2})`}
          />
          {/* texto centro */}
          <text
            x={sizePx / 2}
            y={sizePx / 2 - 4}
            textAnchor="middle"
            className="font-heading font-semibold fill-foreground"
            style={{ fontSize: 22 }}
          >
            {current}
          </text>
          <text
            x={sizePx / 2}
            y={sizePx / 2 + 14}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10 }}
          >
            / {target}
          </text>
        </svg>
        <div className="text-[11px] text-muted-foreground space-y-1 min-w-0">
          <div>
            <StatusBadge tone={tone} label={PACE_LABEL[status]} dot size="sm" />
          </div>
          <div className="tabular-nums">
            {pct.toFixed(0)}% da meta
          </div>
          <div className="tabular-nums text-muted-foreground/70">
            esperado: {expectedPct.toFixed(0)}%
          </div>
          {requiredDailySales !== null && (
            <div className="tabular-nums">
              precisa <span className="text-foreground">{requiredDailySales}/d</span>
            </div>
          )}
          <div className="tabular-nums text-muted-foreground/70">
            restam {daysLeft}d
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero KPIs (primary + secondary) ────────────────────────────────

function HeroKpisGrid({
  data,
  loading,
  keys,
  sparklines,
}: {
  data: HeroKpisResponse | undefined;
  loading: boolean;
  keys?: string[];
  sparklines?: Record<string, number[]>;
}) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: keys?.length ?? 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-card border border-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  const all = [...data.primary, ...data.secondary];
  const items = keys ? keys.map(k => all.find(i => i.key === k)).filter(Boolean) as HeroKpiItem[] : data.primary;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(kpi => (
        <KpiCard
          key={kpi.key}
          label={kpi.label}
          value={formatHeroValue(kpi)}
          delta={kpi.delta}
          deltaDirection={kpi.direction}
          tooltipTerm={kpi.key}
          sparkline={sparklines?.[kpi.key]?.filter(v => Number.isFinite(v)) ?? undefined}
        />
      ))}
    </div>
  );
}

function AgentStatusPill({
  heartbeat,
  supervisedMode,
}: {
  heartbeat:
    | { lastCollectionAt: string | null; consecutiveFailures: number }
    | undefined;
  supervisedMode: boolean;
}) {
  const tone: Tone = supervisedMode
    ? "warning"
    : heartbeat
      ? heartbeat.consecutiveFailures >= 3
        ? "danger"
        : heartbeat.consecutiveFailures > 0
          ? "warning"
          : "success"
      : "muted";
  const label = supervisedMode
    ? "Supervisionado"
    : tone === "success"
      ? "Agente OK"
      : tone === "warning"
        ? "Agente com avisos"
        : tone === "danger"
          ? "Agente parado"
          : "Sem dado";
  return <StatusBadge tone={tone} label={label} dot />;
}

function formatHeroValue(kpi: HeroKpiItem): string {
  if (kpi.value == null || !Number.isFinite(kpi.value)) return "—";
  switch (kpi.unit) {
    case "BRL":
      return formatBRL(kpi.value);
    case "INT":
      return formatNumber(Math.round(kpi.value));
    case "PCT":
      return `${kpi.value.toFixed(2)}%`;
    case "RATIO":
      return kpi.value > 0 ? `${kpi.value.toFixed(2)}x` : "—";
    case "FLOAT":
    default:
      return kpi.value.toFixed(2);
  }
}

// ─── Freio de Mao ──────────────────────────────────────────────────

function EmergencyStopButton({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<EmergencyStopResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useMutation({
    mutationFn: () => api.emergencyStop(productId),
    onSuccess: r => {
      setResult(r);
      setConfirming(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["actions", productId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", productId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "pulse", productId] });
    },
    onError: (err: Error) => {
      setError(err.message || "falha ao acionar freio");
    },
  });

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="text-xs px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/40 rounded-md font-medium hover:bg-destructive/20 transition-colors"
        title="Para o agente + pausa todas campanhas no Meta"
      >
        Freio de mao
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setConfirming(false);
          }}
        >
          <div className="bg-card border border-destructive/40 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-destructive mb-2">Acionar freio de mao?</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Isso vai fazer 3 coisas:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4 ml-4">
              <li>• Ligar <strong>supervisedMode</strong> (agente para de mexer em pause/scale)</li>
              <li>• <strong>Pausar todas as campanhas</strong> whitelisted no Meta Ads</li>
              <li>• Disparar alerta critico no WhatsApp</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-4 italic">
              Reverter: ativa campanhas no Meta + desliga supervisedMode em /config.
            </p>
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2 mb-3">
                <strong>Falhou:</strong> {error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                disabled={stop.isPending}
                className="text-sm px-3 py-2 bg-muted hover:bg-muted/70 rounded-md disabled:opacity-50"
              >
                cancelar
              </button>
              <button
                onClick={() => stop.mutate()}
                disabled={stop.isPending}
                className="text-sm px-3 py-2 bg-destructive text-destructive-foreground rounded-md font-medium hover:bg-destructive/90 disabled:opacity-50"
              >
                {stop.isPending ? "parando..." : "acionar freio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setResult(null);
          }}
        >
          <div className="bg-card border border-success/40 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-success mb-3">Freio acionado</h3>
            <ul className="text-sm space-y-1.5 mb-4">
              <li className={result.supervisedModeSet ? "text-success" : "text-muted-foreground"}>
                {result.supervisedModeSet ? "✓" : "✗"} supervisedMode = true
              </li>
              <li className={result.campaignsPaused > 0 ? "text-success" : "text-muted-foreground"}>
                {result.campaignsPaused > 0 ? "✓" : "·"} {result.campaignsPaused} campanha(s) pausada(s) no Meta
                {result.campaignsFailed > 0 && (
                  <span className="text-destructive"> ({result.campaignsFailed} falharam)</span>
                )}
              </li>
              <li className={result.notificationSent ? "text-success" : "text-muted-foreground"}>
                {result.notificationSent ? "✓" : "✗"} WhatsApp notificado
              </li>
            </ul>
            <button
              onClick={() => setResult(null)}
              className="text-sm px-4 py-2 bg-muted hover:bg-muted/70 rounded-md w-full"
            >
              fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Botao Relatorio CEO + modal ────────────────────────────────────

function CeoReportButton({ productId, days }: { productId: string; days: number }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<CeoReportResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () => api.ceoReport(productId, days),
    onSuccess: data => {
      setReport(data);
      setOpen(true);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || "falha ao gerar relatório");
      setTimeout(() => setError(null), 5000);
    },
  });

  async function copyToClipboard() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {generate.isPending ? "gerando..." : "Relatorio CEO"}
        </button>
        {error && (
          <span className="text-[10px] text-destructive max-w-[200px] text-right">
            {error}
          </span>
        )}
      </div>

      {open && report && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
              <h3 className="text-base font-medium">
                Relatorio CEO — {report.productName}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/70 rounded transition-colors"
                >
                  {copied ? "copiado" : "copiar markdown"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/70 rounded transition-colors"
                >
                  fechar
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
                {report.markdown}
              </pre>
            </div>
            <div className="px-5 py-2 border-t border-border text-[10px] text-muted-foreground">
              gerado{" "}
              {new Date(report.generatedAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · janela {report.windowDays}d
            </div>
          </div>
        </div>
      )}
    </>
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
          <h2 className="text-base font-medium">Awareness x Audiencia (Schwartz)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cold ≠ product-aware. Copy avancada em audiencia fria explode CPA.
          </p>
        </div>
      </div>
      {loading || !data ? (
        <SkeletonLines lines={3} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            <SeverityChip label="Ideal" value={data.bySeverity.ideal} tone="success" />
            <SeverityChip label="OK" value={data.bySeverity.ok} tone="muted" />
            <SeverityChip label="Atencao" value={data.bySeverity.warn} tone="warning" />
            <SeverityChip label="Mismatch" value={data.bySeverity.mismatch} tone="danger" />
          </div>
          {data.items.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">
              {data.bySeverity.untagged > 0
                ? `${data.bySeverity.untagged} criativos sem tag — marque em /assets para detectar mismatch.`
                : "Nenhum mismatch detectado nos ultimos 30d."}
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

function SeverityChip({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const TONE_BG: Record<Tone, string> = {
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    info: "bg-info/10 text-info border-info/30",
    muted: "bg-muted/40 text-muted-foreground border-border",
  };
  return (
    <div className={`px-2 py-1.5 rounded border ${TONE_BG[tone]}`}>
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
      <StatusBadge size="sm" tone={isGrave ? "danger" : "warning"} label={isGrave ? "GRAVE" : "atencao"} />
    </div>
  );
}

// ─── Briefing IA ────────────────────────────────────────────────────

function BriefingCard({
  data,
  loading,
  refreshing,
  onRefresh,
  refreshError,
}: {
  data: BriefingResponse | undefined;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  refreshError?: string | null;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-medium">Briefing executivo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerado por IA cruzando lucro, hit rate, fadiga, decisoes.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs px-2.5 py-1 bg-muted hover:bg-muted/70 rounded transition-colors"
          >
            {refreshing ? "regenerando..." : "regenerar"}
          </button>
          {refreshError && (
            <span className="text-[10px] text-destructive max-w-[180px] text-right">
              {refreshError}
            </span>
          )}
        </div>
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


// ─── Charts (Recharts) ──────────────────────────────────────────────

function ChartCard({
  productId,
  metric,
  title,
  subtitle,
  format,
  type = "line",
  days = 14,
}: {
  productId: string;
  metric: TimeseriesMetric;
  title: string;
  subtitle: string;
  format: "brl" | "num" | "x" | "pct";
  type?: "line" | "bar";
  days?: number;
}) {
  const q = useQuery({
    queryKey: ["analytics", "ts", productId, metric, days],
    queryFn: () => api.timeseries(productId, metric, days),
    refetchInterval: 5 * 60_000,
  });

  const data = q.data?.points.map(p => ({
    date: p.date.slice(5),
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
                {q.data.deltaPct.toFixed(0)}% vs media 7d
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
      <h2 className="text-base font-medium">Proximas acoes sugeridas</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">
        Top 3 cruzando fadiga, hit rate, lucro, awareness.
      </p>
      {loading || !data ? (
        <SkeletonLines lines={3} />
      ) : data.items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem acoes priorizadas.</div>
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


// ─── primitives ─────────────────────────────────────────────────────

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

