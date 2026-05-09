"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AudienceType,
  type AwarenessCell,
  type AwarenessResponse,
  type CohortMaturityStatus,
  type CreativeBucket,
  type CreativeHitRateItem,
  type CreativeVolumeScoreResponse,
  type DecisionAction,
  type DecisionItem,
  type DecisionQueueResponse,
  type ElasticityResponse,
  type FatigueResponse,
  type FatigueStatus,
  type HitRateResponse,
  type LtvCohortResponse,
  type PaybackByEntity,
  type PaybackCohortResponse,
  type HeroKpiItem,
  type HeroKpisResponse,
  type ProfitWaterfallResponse,
} from "@/lib/api";
import { formatBRL, formatPercent, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { PeriodPicker } from "@/components/ui/period-picker";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [days, setDays] = useState<number>(7);

  const heroKpisQ = useQuery({
    queryKey: ["analytics", "hero-kpis", id, days],
    queryFn: () => api.heroKpis(id, days),
    refetchInterval: 5 * 60_000,
  });

  const hitRateQ = useQuery({
    queryKey: ["analytics", "hit-rate", id],
    queryFn: () => api.hitRate(id, 30),
    refetchInterval: 5 * 60_000,
  });
  const waterfallQ = useQuery({
    queryKey: ["analytics", "waterfall", id],
    queryFn: () => api.profitWaterfall(id, 7),
    refetchInterval: 5 * 60_000,
  });
  const paybackQ = useQuery({
    queryKey: ["analytics", "payback", id],
    queryFn: () => api.paybackCohort(id, 30),
    refetchInterval: 10 * 60_000,
  });
  const ltvQ = useQuery({
    queryKey: ["analytics", "ltv", id],
    queryFn: () => api.ltvCohort(id, 90),
    refetchInterval: 30 * 60_000,
  });
  const awarenessQ = useQuery({
    queryKey: ["analytics", "awareness", id],
    queryFn: () => api.awarenessAnalytics(id, 30),
    refetchInterval: 10 * 60_000,
  });
  const volumeQ = useQuery({
    queryKey: ["analytics", "volume", id],
    queryFn: () => api.creativeVolumeScore(id),
    refetchInterval: 10 * 60_000,
  });
  const fatigueQ = useQuery({
    queryKey: ["analytics", "fatigue", id],
    queryFn: () => api.fatiguePredictions(id),
    refetchInterval: 10 * 60_000,
  });
  const elasticityQ = useQuery({
    queryKey: ["analytics", "elasticity", id],
    queryFn: () => api.cpaElasticity(id, 60),
    refetchInterval: 30 * 60_000,
  });
  const decisionsQ = useQuery({
    queryKey: ["analytics", "decisions", id],
    queryFn: () => api.decisionQueue(id),
    refetchInterval: 5 * 60_000,
  });

  return (
    <div className="p-6 md:p-8 space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Analise → acao → acao → acao. Lucro absoluto manda — ROAS e vaidade."
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />

      <SecondaryKpisSection data={heroKpisQ.data} loading={heroKpisQ.isLoading} />

      <DecisionQueueSection data={decisionsQ.data} loading={decisionsQ.isLoading} />
      <VolumeScoreSection data={volumeQ.data} loading={volumeQ.isLoading} />
      <ProfitWaterfallSection data={waterfallQ.data} loading={waterfallQ.isLoading} />
      <HitRateSection data={hitRateQ.data} loading={hitRateQ.isLoading} />
      <FatigueSection data={fatigueQ.data} loading={fatigueQ.isLoading} />
      <ElasticitySection data={elasticityQ.data} loading={elasticityQ.isLoading} />
      <PaybackSection data={paybackQ.data} loading={paybackQ.isLoading} />
      <LtvSection data={ltvQ.data} loading={ltvQ.isLoading} />
      <AwarenessSection productId={id} data={awarenessQ.data} loading={awarenessQ.isLoading} />
    </div>
  );
}

// ─── Profit waterfall ───────────────────────────────────────────────

function ProfitWaterfallSection({
  data,
  loading,
}: {
  data: ProfitWaterfallResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Profit waterfall"
        subtitle={`Receita → refund → fee → comissão → CAC → upsell → imposto → CM (${data?.windowDays ?? 7}d)`}
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="space-y-1.5 mt-4">
            {data.steps.map((step, i) => {
              const isResult = step.kind === "result";
              const isAddition = step.kind === "addition";
              const isDeduction = step.kind === "deduction";
              return (
                <div
                  key={i}
                  className={`flex justify-between items-baseline px-3 py-2 rounded ${
                    isResult ? "bg-muted/40 font-medium" : ""
                  }`}
                >
                  <span
                    className={`text-sm ${
                      isDeduction
                        ? "text-destructive"
                        : isAddition
                          ? "text-success"
                          : isResult
                            ? "text-foreground"
                            : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`tabular-nums ${
                      isDeduction
                        ? "text-destructive"
                        : isAddition
                          ? "text-success"
                          : isResult
                            ? "text-foreground font-medium"
                            : "text-foreground"
                    }`}
                  >
                    {formatBRL(step.value)}
                    <span className="text-xs text-muted-foreground ml-2">
                      {step.pct.toFixed(0)}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            <Mini
              label="CM absoluto"
              value={formatBRL(data.contributionMargin)}
              tone={data.contributionMargin > 0 ? "success" : "danger"}
              hint={deltaLabel(data.delta.cmPct, "vs período anterior")}
            />
            <Mini
              label="CM %"
              value={formatPercent(data.contributionMarginPct)}
              tone={
                data.contributionMarginPct > 20
                  ? "success"
                  : data.contributionMarginPct < 0
                    ? "danger"
                    : undefined
              }
            />
            <Mini
              label="Profit/venda"
              value={data.profitPerSale ? formatBRL(data.profitPerSale) : "—"}
              tone={data.profitPerSale && data.profitPerSale > 0 ? "success" : data.profitPerSale && data.profitPerSale < 0 ? "danger" : undefined}
            />
            <Mini
              label="ROAS bruto"
              value={data.roas ? `${data.roas.toFixed(2)}x` : "—"}
              hint={deltaLabel(data.delta.salesPct, `${data.approvedSales} vendas`)}
            />
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Receita {deltaLabel(data.delta.grossRevenuePct, "vs janela anterior do mesmo tamanho")}
          </div>
        </>
      )}
    </section>
  );
}

function deltaLabel(pct: number | null, fallback: string): string {
  if (pct === null) return fallback;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% ${fallback}`;
}

// ─── Hit rate ───────────────────────────────────────────────────────

const BUCKET_LABEL: Record<CreativeBucket, { label: string; cls: string }> = {
  winner: { label: "Winner", cls: "text-success" },
  survivor: { label: "Survivor", cls: "text-warning" },
  loser: { label: "Loser", cls: "text-destructive" },
  pending_days: { label: "Aguardando 3d", cls: "text-muted-foreground" },
  pending_spend: { label: "Sem sinal stat.", cls: "text-muted-foreground" },
};

function HitRateSection({
  data,
  loading,
}: {
  data: HitRateResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Hit rate de criativo (3 níveis)"
        subtitle={
          data
            ? `winner CPA ≤ ${formatBRL(data.thresholds.scaleCPA)} · survivor ≤ ${formatBRL(data.thresholds.breakevenCPA)} · min spend ${formatBRL(data.thresholds.minSpendForEval)}`
            : "—"
        }
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <Mini
              label="Hit rate"
              value={formatPercent(data.hitRatePct)}
              tone={
                data.hitRatePct >= data.benchmark.elite
                  ? "success"
                  : data.hitRatePct >= data.benchmark.mediano
                    ? undefined
                    : "danger"
              }
              hint={`elite ${data.benchmark.elite}% / mediano ${data.benchmark.mediano}%`}
            />
            <Mini label="Winners" value={formatNumber(data.buckets.winner)} tone="success" />
            <Mini
              label="Survivors"
              value={formatNumber(data.buckets.survivor)}
              tone={data.buckets.survivor > data.buckets.winner ? "danger" : undefined}
              hint="lucra mas não escala"
            />
            <Mini label="Losers" value={formatNumber(data.buckets.loser)} tone="danger" />
            <Mini
              label="Pending"
              value={formatNumber(data.buckets.pendingDays + data.buckets.pendingSpend)}
              hint={`${data.buckets.pendingDays}d / ${data.buckets.pendingSpend}spend`}
            />
          </div>

          {data.monthly.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">
                Histórico mensal (winners / lançados)
              </div>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2">Mês</th>
                      <th className="text-right px-3 py-2">Lançados</th>
                      <th className="text-right px-3 py-2">Winners</th>
                      <th className="text-right px-3 py-2">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly
                      .slice(-6)
                      .reverse()
                      .map(m => (
                        <tr key={m.month} className="border-t border-border tabular-nums">
                          <td className="px-3 py-1.5 text-muted-foreground">{m.month}</td>
                          <td className="px-3 py-1.5 text-right">{m.launched}</td>
                          <td className="px-3 py-1.5 text-right">{m.winners}</td>
                          <td className="px-3 py-1.5 text-right">
                            <span
                              className={
                                m.rate >= 25
                                  ? "text-success"
                                  : m.rate < 12
                                    ? "text-destructive"
                                    : ""
                              }
                            >
                              {m.rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.topWinners.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">
                Top winners
              </div>
              <CreativeRowList items={data.topWinners} />
            </div>
          )}
          {data.worstLosers.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">
                Piores losers
              </div>
              <CreativeRowList items={data.worstLosers} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CreativeRowList({ items }: { items: CreativeHitRateItem[] }) {
  return (
    <div className="border border-border rounded">
      {items.map(c => {
        const meta = BUCKET_LABEL[c.bucket];
        return (
          <div
            key={c.id}
            className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0 text-sm gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.type} · {c.daysActive}d · {c.salesEstimated} vendas · {c.velocityPerDay.toFixed(2)}/d ·{" "}
                <span className={meta.cls}>{meta.label}</span>
              </div>
            </div>
            <div className="flex gap-3 text-xs tabular-nums shrink-0">
              <span className={meta.cls}>CPA {c.cpa ? formatBRL(c.cpa) : "—"}</span>
              <span className="text-muted-foreground hidden md:inline">
                gasto {formatBRL(c.spendEstimated)}
              </span>
              <span className="text-muted-foreground hidden md:inline">
                hook {c.hookRate ? `${c.hookRate.toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Payback cohort ─────────────────────────────────────────────────

const STATUS_BADGE: Record<CohortMaturityStatus, { label: string; cls: string }> = {
  paid: { label: "pago", cls: "bg-success/10 text-success border-success/30" },
  in_progress: {
    label: "maturando",
    cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  never_paid: {
    label: "não pagou",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

function PaybackSection({
  data,
  loading,
}: {
  data: PaybackCohortResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Payback cohort"
        subtitle="Por dia de aquisição + por adset + por criativo. Inclui upsell mentoria."
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="mt-4">
            <Mini
              label="Payback médio"
              value={data.avgPaybackDays !== null ? `${data.avgPaybackDays}d` : "—"}
              tone={
                data.avgPaybackDays !== null && data.avgPaybackDays <= 14
                  ? "success"
                  : data.avgPaybackDays !== null && data.avgPaybackDays > 30
                    ? "danger"
                    : undefined
              }
              hint="ideal ≤ 14d pra escalar agressivo"
            />
          </div>

          {data.rows.length > 0 && (
            <div className="border border-border rounded mt-4 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Cohort</th>
                    <th className="text-right px-3 py-2">Spend</th>
                    <th className="text-right px-3 py-2">D1</th>
                    <th className="text-right px-3 py-2">D7</th>
                    <th className="text-right px-3 py-2">D14</th>
                    <th className="text-right px-3 py-2">D30</th>
                    <th className="text-right px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows
                    .slice(-14)
                    .reverse()
                    .map(r => (
                      <tr key={r.cohortDate} className="border-t border-border tabular-nums">
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {r.cohortDate.slice(5)}
                        </td>
                        <td className="px-3 py-1.5 text-right">{formatBRL(r.spend)}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {r.cumRevenueD1 === null ? "—" : formatBRL(r.cumRevenueD1)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.cumRevenueD7 === null ? "—" : formatBRL(r.cumRevenueD7)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.cumRevenueD14 === null ? "—" : formatBRL(r.cumRevenueD14)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.cumRevenueD30 === null ? "—" : formatBRL(r.cumRevenueD30)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <StatusBadge status={r.status} day={r.paybackDay} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {data.byAdset.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">
                Por adset (top 10 por spend)
              </div>
              <EntityList items={data.byAdset} />
            </div>
          )}
          {data.byCreative.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">
                Por criativo (top 10 por spend)
              </div>
              <EntityList items={data.byCreative} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StatusBadge({
  status,
  day,
}: {
  status: CohortMaturityStatus;
  day: number | null;
}) {
  const meta = STATUS_BADGE[status];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.cls}`}>
      {day !== null ? `${day}d` : meta.label}
    </span>
  );
}

function EntityList({ items }: { items: PaybackByEntity[] }) {
  return (
    <div className="border border-border rounded">
      {items.map(e => (
        <div
          key={e.name}
          className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0 text-sm gap-3"
        >
          <div className="flex-1 min-w-0 truncate">{e.name}</div>
          <div className="flex gap-3 text-xs tabular-nums shrink-0 items-center">
            <span className="text-muted-foreground">spend {formatBRL(e.spend)}</span>
            <span>rec {formatBRL(e.revenue)}</span>
            <StatusBadge status={e.status} day={e.paybackDay} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── LTV cohort ─────────────────────────────────────────────────────

function LtvSection({
  data,
  loading,
}: {
  data: LtvCohortResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="LTV cohort por semana"
        subtitle={data?.rule ?? "LTV/CAC ratio: ≥3 saudável, <2 problema"}
      />
      {loading || !data ? (
        <Skeleton />
      ) : data.rows.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-4">
          Sem dados ainda — precisa pelo menos 1 venda na janela.
        </div>
      ) : (
        <div className="border border-border rounded mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Semana</th>
                <th className="text-right px-3 py-2">Buyers</th>
                <th className="text-right px-3 py-2">CAC</th>
                <th className="text-right px-3 py-2">LTV D7</th>
                <th className="text-right px-3 py-2">LTV D30</th>
                <th className="text-right px-3 py-2">LTV D60</th>
                <th className="text-right px-3 py-2">LTV/CAC</th>
                <th className="text-right px-3 py-2">Mentoria</th>
                <th className="text-right px-3 py-2">Retain D30</th>
              </tr>
            </thead>
            <tbody>
              {data.rows
                .slice(-12)
                .reverse()
                .map(r => (
                  <tr key={r.cohortWeek} className="border-t border-border tabular-nums">
                    <td className="px-3 py-1.5 text-muted-foreground">{r.cohortWeek}</td>
                    <td className="px-3 py-1.5 text-right">{r.buyers}</td>
                    <td className="px-3 py-1.5 text-right">{formatBRL(r.cac)}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {formatBRL(r.ltvD7)}
                    </td>
                    <td className="px-3 py-1.5 text-right">{formatBRL(r.ltvD30)}</td>
                    <td className="px-3 py-1.5 text-right">{formatBRL(r.ltvD60)}</td>
                    <td className="px-3 py-1.5 text-right">
                      {r.ltvCacRatio === null ? (
                        "—"
                      ) : (
                        <span
                          className={
                            r.ltvCacRatio >= 3
                              ? "text-success"
                              : r.ltvCacRatio < 2
                                ? "text-destructive"
                                : ""
                          }
                        >
                          {r.ltvCacRatio.toFixed(2)}x
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {r.mentoriaConvPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {r.retainedD30.toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Awareness × Audience ───────────────────────────────────────────

const STAGE_LABELS: Record<string, { label: string; desc: string }> = {
  unaware: { label: "Unaware", desc: "Nem sabe do problema" },
  problem: { label: "Problem aware", desc: "Sabe do problema" },
  solution: { label: "Solution aware", desc: "Conhece soluções" },
  product: { label: "Product aware", desc: "Conhece o produto" },
  most_aware: { label: "Most aware", desc: "Pronto pra comprar" },
  untagged: { label: "Sem tag", desc: "Marque pra cruzar" },
};

function AwarenessSection({
  productId,
  data,
  loading,
}: {
  productId: string;
  data: AwarenessResponse | undefined;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const classifyMutation = useMutation({
    mutationFn: () => api.classifyAwareness(productId),
    onSuccess: r => {
      if (r.skippedNoLlm < 0) {
        setFeedback("ANTHROPIC_API_KEY não configurada — classifier desligado.");
      } else {
        setFeedback(
          `${r.classified} classificados de ${r.totalAssets} (${r.failed} falhas, ${r.skippedNoCopy} sem copy)`
        );
      }
      queryClient.invalidateQueries({ queryKey: ["analytics", "awareness", productId] });
    },
    onError: () => setFeedback("Erro ao classificar."),
  });
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Awareness × Audience type (Schwartz)"
          subtitle="Cold = problem-aware · Warm = solution-aware · Most-aware = remarketing/ASC. Onde sua copy bate com o público."
        />
        <button
          onClick={() => classifyMutation.mutate()}
          disabled={classifyMutation.isPending}
          className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/70 rounded transition-colors shrink-0"
          title="Classifica assets sem tag via Anthropic"
        >
          {classifyMutation.isPending ? "classificando..." : "classificar via IA"}
        </button>
      </div>
      {feedback && (
        <div className="text-xs text-muted-foreground mt-2">{feedback}</div>
      )}
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Mini label="Tagueados" value={formatNumber(data.taggedCount)} />
            <Mini
              label="Sem tag"
              value={formatNumber(data.untaggedCount)}
              tone={data.untaggedCount > data.taggedCount ? "danger" : undefined}
              hint="marque em /assets"
            />
            <Mini
              label="Melhor par"
              value={
                data.bestPair
                  ? `${STAGE_LABELS[data.bestPair.stage]?.label ?? data.bestPair.stage} × ${data.bestPair.audience}`
                  : "—"
              }
              hint={data.bestPair ? `${data.bestPair.winnerRate.toFixed(0)}% winners` : ""}
              tone="success"
            />
            <Mini
              label="Pior par"
              value={
                data.worstPair
                  ? `${STAGE_LABELS[data.worstPair.stage]?.label ?? data.worstPair.stage} × ${data.worstPair.audience}`
                  : "—"
              }
              hint={data.worstPair ? `${data.worstPair.winnerRate.toFixed(0)}% winners` : ""}
              tone="danger"
            />
          </div>

          {data.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">
              Sem criativos na janela.
            </div>
          ) : (
            <div className="border border-border rounded mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Stage</th>
                    {data.audienceTypes.map(a => (
                      <th key={a} className="text-right px-3 py-2">
                        {a}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => {
                    const meta = STAGE_LABELS[r.stage] || { label: r.stage, desc: "" };
                    return (
                      <tr key={r.stage} className="border-t border-border tabular-nums">
                        <td className="px-3 py-2">
                          <div className="font-medium">{meta.label}</div>
                          <div className="text-[10px] text-muted-foreground">{meta.desc}</div>
                        </td>
                        {data.audienceTypes.map(a => (
                          <td key={a} className="px-3 py-2 text-right">
                            <CellView cell={r.cells[a as AudienceType]} />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <CellView cell={r.total} bold />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CellView({ cell, bold }: { cell: AwarenessCell; bold?: boolean }) {
  if (cell.count === 0) return <span className="text-muted-foreground/50">—</span>;
  return (
    <div className={bold ? "font-medium" : ""}>
      <div>
        <span
          className={
            cell.winnerRate >= 25
              ? "text-success"
              : cell.winnerRate < 12 && cell.count >= 3
                ? "text-destructive"
                : ""
          }
        >
          {cell.winnerRate.toFixed(0)}%
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground">
        n={cell.count} · {cell.avgCpa ? formatBRL(cell.avgCpa) : "—"}
      </div>
    </div>
  );
}

// ─── primitives ─────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
  hint?: string;
}) {
  return (
    <div className="bg-muted/20 border border-border rounded px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-base font-medium tabular-nums mt-0.5 ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

// ─── Onda 2: Decision Queue ─────────────────────────────────────────

const DECISION_BADGE: Record<DecisionAction, { label: string; cls: string }> = {
  pause_creative: { label: "PAUSAR", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  scale_winner: { label: "ESCALAR", cls: "bg-success/10 text-success border-success/30" },
  replace_copy_awareness_mismatch: { label: "TROCAR COPY", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  produce_creatives: { label: "PRODUZIR", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  watch_fatigue: { label: "FADIGA", cls: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  reduce_budget: { label: "REDUZIR", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  investigate_payback: { label: "INVESTIGAR", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  tag_assets: { label: "TAGEAR", cls: "bg-muted/40 text-muted-foreground border-border" },
};

function DecisionQueueSection({
  data,
  loading,
}: {
  data: DecisionQueueResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Decision Queue — ações sugeridas hoje"
        subtitle="Cruza fatigue, hit rate, profit, awareness e volume. Priorizado por urgência."
      />
      {loading || !data ? (
        <Skeleton />
      ) : data.items.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-4">
          Nenhuma ação urgente agora. Pipeline saudável ou sem dados suficientes.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {data.items.map((item, i) => (
            <DecisionCard key={`${item.action}-${i}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function DecisionCard({ item }: { item: DecisionItem }) {
  const meta = DECISION_BADGE[item.action];
  return (
    <div className="border border-border rounded p-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${meta.cls}`}
        >
          {meta.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{item.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{item.reasoning}</div>
          {item.estimatedImpact && (
            <div className="text-xs text-muted-foreground/70 mt-0.5 italic">
              {item.estimatedImpact}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Onda 2: Volume Score ───────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  elite: "text-success",
  bom: "text-emerald-400",
  mediano: "text-yellow-500",
  critico: "text-destructive",
};

function VolumeScoreSection({
  data,
  loading,
}: {
  data: CreativeVolumeScoreResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Creative Volume Score"
        subtitle="Volume de produção × hit rate × idade do pool. Elite ships 5-7/semana."
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="flex items-baseline gap-3 mt-4">
            <div className={`text-4xl font-heading font-semibold tabular-nums ${GRADE_COLOR[data.grade]}`}>
              {data.totalScore}
            </div>
            <div className="text-sm text-muted-foreground">/ 100</div>
            <div className={`text-sm uppercase tracking-wider ${GRADE_COLOR[data.grade]}`}>
              {data.grade}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <ScoreBar label="Volume" value={data.volumeScore} max={40} />
            <ScoreBar label="Hit rate" value={data.hitRateScore} max={40} />
            <ScoreBar label="Freshness" value={data.freshnessScore} max={20} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Mini label="7d" value={`${data.launchesLast7d} criativos`} hint="ideal 5-7" />
            <Mini label="30d" value={`${data.launchesLast30d}`} hint="ideal 20-30" />
            <Mini label="Pool ativo" value={`${data.poolActive}`} />
            <Mini
              label="Idade média"
              value={`${data.poolAvgAgeDays.toFixed(0)}d`}
              tone={data.poolAvgAgeDays > 30 ? "danger" : data.poolAvgAgeDays < 14 ? "success" : undefined}
            />
          </div>
          {data.recommendations.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
              {data.recommendations.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tone = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="text-xs">
      <div className="flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded mt-1 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Onda 2: Fatigue Predictivo ─────────────────────────────────────

const FATIGUE_BADGE: Record<FatigueStatus, { label: string; cls: string }> = {
  healthy: { label: "saudável", cls: "bg-success/10 text-success border-success/30" },
  declining: {
    label: "em queda",
    cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  critical: {
    label: "crítico",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
  },
  no_data: { label: "sem dado", cls: "bg-muted/40 text-muted-foreground border-border" },
};

function FatigueSection({
  data,
  loading,
}: {
  data: FatigueResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Fatigue predictivo"
        subtitle={`Linear regression sobre hookRate ${data?.windowDays ?? 14}d. Floor ${data?.hookRateFloor ?? 5}%.`}
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Mini label="Saudáveis" value={`${data.summary.healthy}`} tone="success" />
            <Mini
              label="Em queda"
              value={`${data.summary.declining}`}
              tone={data.summary.declining > 0 ? "danger" : undefined}
            />
            <Mini
              label="Críticos"
              value={`${data.summary.critical}`}
              tone={data.summary.critical > 0 ? "danger" : undefined}
            />
            <Mini label="Sem dados" value={`${data.summary.noData}`} />
          </div>
          {data.predictions.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">
              Nenhum criativo ativo.
            </div>
          ) : (
            <div className="border border-border rounded mt-4">
              {data.predictions
                .filter(p => p.status !== "no_data")
                .slice(0, 8)
                .map(p => {
                  const meta = FATIGUE_BADGE[p.status];
                  return (
                    <div
                      key={p.creativeId}
                      className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0 text-sm gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.reason}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs tabular-nums">
                        {p.daysToDeath !== null && (
                          <span className="text-destructive">{p.daysToDeath}d</span>
                        )}
                        <span className="text-muted-foreground">
                          slope {p.trendSlope.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─── Onda 2: CPA Elasticity ─────────────────────────────────────────

function ElasticitySection({
  data,
  loading,
}: {
  data: ElasticityResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="CPA Elasticity"
        subtitle="Histórico de scale events × delta de CPA. Detecta o knee — onde escalar mais quebra eficiência."
      />
      {loading || !data ? (
        <Skeleton />
      ) : data.adsets.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-4">
          Sem scale events ainda. Knee detectado quando o agente escalar 1+ adsets e o CPA mover.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.adsets.map(a => (
            <div key={a.adsetId} className="border border-border rounded p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-sm truncate">{a.adsetName}</div>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                    a.signal === "knee_detected"
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : a.signal === "stable"
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted/40 text-muted-foreground border-border"
                  }`}
                >
                  {a.signal === "knee_detected" ? "knee" : a.signal === "stable" ? "estável" : "sem sinal"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{a.note}</div>
              {a.events.length > 0 && (
                <div className="border border-border rounded mt-2 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-2 py-1">Data</th>
                        <th className="text-right px-2 py-1">Budget</th>
                        <th className="text-right px-2 py-1">Δ Budget</th>
                        <th className="text-right px-2 py-1">CPA pre→pós</th>
                        <th className="text-right px-2 py-1">Δ CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.events.map((e, i) => (
                        <tr key={i} className="border-t border-border tabular-nums">
                          <td className="px-2 py-1 text-muted-foreground">{e.date.slice(5)}</td>
                          <td className="px-2 py-1 text-right">
                            {formatBRL(e.budgetBefore)}→{formatBRL(e.budgetAfter)}
                          </td>
                          <td className="px-2 py-1 text-right">+{e.budgetDelta.toFixed(0)}%</td>
                          <td className="px-2 py-1 text-right">
                            {e.cpaBefore !== null ? formatBRL(e.cpaBefore) : "—"}→
                            {e.cpaAfter !== null ? formatBRL(e.cpaAfter) : "—"}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {e.cpaDelta !== null ? (
                              <span
                                className={
                                  e.cpaDelta > 30
                                    ? "text-destructive"
                                    : e.cpaDelta < -10
                                      ? "text-success"
                                      : ""
                                }
                              >
                                {e.cpaDelta > 0 ? "+" : ""}
                                {e.cpaDelta.toFixed(0)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-muted/40 rounded animate-pulse" />
      <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
    </div>
  );
}

function SecondaryKpisSection({
  data,
  loading,
}: {
  data: HeroKpisResponse | undefined;
  loading: boolean;
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Sinais de criativo & leilao
      </h2>
      {loading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.secondary.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={formatHeroValue(kpi)}
              delta={kpi.delta}
              deltaDirection={kpi.direction}
              hint={kpi.hint}
              size="sm"
              tooltipTerm={kpi.key}
            />
          ))}
        </div>
      )}
    </section>
  );
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
