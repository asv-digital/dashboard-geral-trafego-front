"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type AudienceType,
  type AwarenessCell,
  type AwarenessResponse,
  type CohortMaturityStatus,
  type CreativeBucket,
  type CreativeHitRateItem,
  type HitRateResponse,
  type LtvCohortResponse,
  type PaybackByEntity,
  type PaybackCohortResponse,
  type ProfitWaterfallResponse,
} from "@/lib/api";
import { formatBRL, formatPercent, formatNumber } from "@/lib/format";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

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

  return (
    <div className="p-8 space-y-8">
      <header>
        <h2 className="text-xl font-heading font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          5 métricas elite-grade. Profit absoluto manda — ROAS é vaidade.
        </p>
      </header>

      <ProfitWaterfallSection data={waterfallQ.data} loading={waterfallQ.isLoading} />
      <HitRateSection data={hitRateQ.data} loading={hitRateQ.isLoading} />
      <PaybackSection data={paybackQ.data} loading={paybackQ.isLoading} />
      <LtvSection data={ltvQ.data} loading={ltvQ.isLoading} />
      <AwarenessSection data={awarenessQ.data} loading={awarenessQ.isLoading} />
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
  data,
  loading,
}: {
  data: AwarenessResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Awareness × Audience type (Schwartz)"
        subtitle="Cold = problem-aware · Warm = solution-aware · Most-aware = remarketing/ASC. Onde sua copy bate com o público."
      />
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

function Skeleton() {
  return (
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-muted/40 rounded animate-pulse" />
      <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
    </div>
  );
}
