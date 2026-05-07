"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
      <Header />

      <ProfitWaterfallSection data={waterfallQ.data} loading={waterfallQ.isLoading} />
      <HitRateSection data={hitRateQ.data} loading={hitRateQ.isLoading} />
      <PaybackSection data={paybackQ.data} loading={paybackQ.isLoading} />
      <LtvSection data={ltvQ.data} loading={ltvQ.isLoading} />
      <AwarenessSection data={awarenessQ.data} loading={awarenessQ.isLoading} />
    </div>
  );
}

function Header() {
  return (
    <header>
      <h2 className="text-xl font-heading font-semibold">Analytics</h2>
      <p className="text-sm text-muted-foreground mt-1">
        5 métricas que separam gestor mediano de elite. Profit absoluto manda — ROAS é vaidade.
      </p>
    </header>
  );
}

// ─── Profit waterfall ───────────────────────────────────────────────

function ProfitWaterfallSection({
  data,
  loading,
}: {
  data: ReturnType<typeof api.profitWaterfall> extends Promise<infer R> ? R | undefined : never;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Profit waterfall"
        subtitle={`Receita bruta → fee → CAC → contribution margin (${data?.windowDays ?? 7}d)`}
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="space-y-1.5 mt-4">
            {data.steps.map((step, i) => {
              const isResult = step.label.startsWith("=");
              const isNegative = step.value < 0;
              return (
                <div
                  key={i}
                  className={`flex justify-between items-baseline px-3 py-2 rounded ${
                    isResult ? "bg-muted/40 font-medium" : ""
                  }`}
                >
                  <span
                    className={`text-sm ${
                      isNegative
                        ? "text-destructive"
                        : isResult
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`tabular-nums ${
                      isNegative
                        ? "text-destructive"
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
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <Mini label="CM absoluto" value={formatBRL(data.contributionMargin)} tone={data.contributionMargin > 0 ? "success" : "danger"} />
            <Mini label="CM %" value={formatPercent(data.contributionMarginPct)} tone={data.contributionMarginPct > 20 ? "success" : data.contributionMarginPct < 0 ? "danger" : undefined} />
            <Mini label="ROAS bruto" value={data.roas ? `${data.roas.toFixed(2)}x` : "—"} />
          </div>
        </>
      )}
    </section>
  );
}

// ─── Hit rate ───────────────────────────────────────────────────────

function HitRateSection({
  data,
  loading,
}: {
  data: ReturnType<typeof api.hitRate> extends Promise<infer R> ? R | undefined : never;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Hit rate de criativo"
        subtitle="% dos criativos lançados em 30d que viraram winner (CPA ≤ scale threshold)"
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
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
            <Mini label="Lançados" value={formatNumber(data.totalLaunched)} />
            <Mini label="Winners" value={formatNumber(data.winners)} tone="success" />
            <Mini label="Losers" value={formatNumber(data.losers)} tone="danger" hint={`${data.pendingEvaluation} pending`} />
          </div>
          {data.topWinners.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Top winners</div>
              <CreativeRowList items={data.topWinners} tone="success" />
            </div>
          )}
          {data.worstLosers.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Piores losers</div>
              <CreativeRowList items={data.worstLosers} tone="danger" />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CreativeRowList({
  items,
  tone,
}: {
  items: Array<{ id: string; name: string; type: string; cpa: number | null; hookRate: number | null; ctr: number | null; daysActive: number }>;
  tone: "success" | "danger";
}) {
  return (
    <div className="border border-border rounded">
      {items.map(c => (
        <div key={c.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0 text-sm">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.type} · {c.daysActive}d</div>
          </div>
          <div className="flex gap-4 text-xs tabular-nums">
            <span className={tone === "success" ? "text-success" : "text-destructive"}>
              CPA {c.cpa ? formatBRL(c.cpa) : "—"}
            </span>
            <span className="text-muted-foreground">hook {c.hookRate ? `${c.hookRate.toFixed(1)}%` : "—"}</span>
            <span className="text-muted-foreground">CTR {c.ctr ? `${c.ctr.toFixed(2)}%` : "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Payback cohort ─────────────────────────────────────────────────

function PaybackSection({
  data,
  loading,
}: {
  data: ReturnType<typeof api.paybackCohort> extends Promise<infer R> ? R | undefined : never;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Payback cohort"
        subtitle="Pra cada dia: quanto se gastou e quando voltou (em dias)"
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="mt-4">
            <Mini
              label="Payback médio"
              value={data.avgPaybackDays !== null ? `${data.avgPaybackDays}d` : "—"}
              tone={data.avgPaybackDays !== null && data.avgPaybackDays <= 14 ? "success" : data.avgPaybackDays !== null && data.avgPaybackDays > 30 ? "danger" : undefined}
              hint="ideal ≤ 14d pra escalar agressivo"
            />
          </div>
          {data.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">Sem cohorts pagos na janela.</div>
          ) : (
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
                    <th className="text-right px-3 py-2">Payback</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.slice(-14).reverse().map(r => (
                    <tr key={r.cohortDate} className="border-t border-border tabular-nums">
                      <td className="px-3 py-1.5 text-muted-foreground">{r.cohortDate.slice(5)}</td>
                      <td className="px-3 py-1.5 text-right">{formatBRL(r.spend)}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{formatBRL(r.cumRevenueD1)}</td>
                      <td className="px-3 py-1.5 text-right">{formatBRL(r.cumRevenueD7)}</td>
                      <td className="px-3 py-1.5 text-right">{formatBRL(r.cumRevenueD14)}</td>
                      <td className="px-3 py-1.5 text-right">{formatBRL(r.cumRevenueD30)}</td>
                      <td className="px-3 py-1.5 text-right">
                        {r.paybackDay !== null ? (
                          <span className={r.paybackDay <= 14 ? "text-success" : r.paybackDay > 30 ? "text-destructive" : ""}>
                            {r.paybackDay}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─── LTV cohort ─────────────────────────────────────────────────────

function LtvSection({
  data,
  loading,
}: {
  data: ReturnType<typeof api.ltvCohort> extends Promise<infer R> ? R | undefined : never;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="LTV cohort por semana"
        subtitle="Receita média acumulada por buyer em D7/14/30/60 (decisão de scale por LTV)"
      />
      {loading || !data ? (
        <Skeleton />
      ) : data.rows.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-4">Sem dados ainda — precisa pelo menos 1 venda na janela.</div>
      ) : (
        <div className="border border-border rounded mt-4 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Cohort week</th>
                <th className="text-right px-3 py-2">Buyers</th>
                <th className="text-right px-3 py-2">LTV D7</th>
                <th className="text-right px-3 py-2">LTV D14</th>
                <th className="text-right px-3 py-2">LTV D30</th>
                <th className="text-right px-3 py-2">LTV D60</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(-12).reverse().map(r => (
                <tr key={r.cohortWeek} className="border-t border-border tabular-nums">
                  <td className="px-3 py-1.5 text-muted-foreground">{r.cohortWeek}</td>
                  <td className="px-3 py-1.5 text-right">{r.buyers}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{formatBRL(r.ltvD7)}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(r.ltvD14)}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(r.ltvD30)}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(r.ltvD60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Awareness ──────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, { label: string; desc: string }> = {
  unaware: { label: "Unaware", desc: "Nem sabe que tem o problema" },
  problem: { label: "Problem aware", desc: "Sabe do problema, não da solução" },
  solution: { label: "Solution aware", desc: "Conhece a solução, não o produto" },
  product: { label: "Product aware", desc: "Conhece seu produto" },
  most_aware: { label: "Most aware", desc: "Pronto pra comprar" },
  untagged: { label: "Sem tag", desc: "Marque pra cruzar performance" },
};

function AwarenessSection({
  data,
  loading,
}: {
  data: ReturnType<typeof api.awarenessAnalytics> extends Promise<infer R> ? R | undefined : never;
  loading: boolean;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <SectionHeader
        title="Awareness × CPA (Schwartz)"
        subtitle="Cold tráfego ≠ product-aware. Marque copy/criativo pra ver onde performa."
      />
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Mini label="Tagueados" value={formatNumber(data.taggedCount)} />
            <Mini label="Sem tag" value={formatNumber(data.untaggedCount)} tone={data.untaggedCount > data.taggedCount ? "danger" : undefined} hint="marque em /assets" />
          </div>
          {data.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">Sem criativos no período.</div>
          ) : (
            <div className="border border-border rounded mt-4 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Stage</th>
                    <th className="text-right px-3 py-2"># Criativos</th>
                    <th className="text-right px-3 py-2">CPA médio</th>
                    <th className="text-right px-3 py-2">Hook %</th>
                    <th className="text-right px-3 py-2">Winner rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => {
                    const meta = STAGE_LABELS[r.stage] || { label: r.stage, desc: "" };
                    return (
                      <tr key={r.stage} className="border-t border-border tabular-nums">
                        <td className="px-3 py-1.5">
                          <div className="font-medium">{meta.label}</div>
                          <div className="text-[10px] text-muted-foreground">{meta.desc}</div>
                        </td>
                        <td className="px-3 py-1.5 text-right">{r.creativeCount}</td>
                        <td className="px-3 py-1.5 text-right">{r.avgCpa ? formatBRL(r.avgCpa) : "—"}</td>
                        <td className="px-3 py-1.5 text-right">{r.avgHookRate ? `${r.avgHookRate.toFixed(1)}%` : "—"}</td>
                        <td className="px-3 py-1.5 text-right">
                          <span className={r.winnerRate >= 25 ? "text-success" : r.winnerRate < 12 ? "text-destructive" : ""}>
                            {r.winnerRate.toFixed(1)}%
                          </span>
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
      <div className={`text-base font-medium tabular-nums mt-0.5 ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""}`}>
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
