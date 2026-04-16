"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

interface Stage {
  label: string;
  value: number;
}

export default function FunnelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useQuery({
    queryKey: ["metrics", id, "funnel"],
    queryFn: () => api.listMetrics(id),
    refetchInterval: 60_000,
  });
  const { data: salesSummary } = useQuery({
    queryKey: ["sales", "summary", id],
    queryFn: () => api.salesSummary(id),
  });

  const metrics = data?.metrics ?? [];
  const totals = metrics.reduce(
    (accumulator, metric) => ({
      impressions: accumulator.impressions + (metric.impressions || 0),
      clicks: accumulator.clicks + (metric.clicks || 0),
      lpv: accumulator.lpv + (metric.landingPageViews || 0),
      ic: accumulator.ic + (metric.initiateCheckouts || 0),
      spend: accumulator.spend + (metric.investment || 0),
      threeSec: accumulator.threeSec + (metric.threeSecondViews || 0),
    }),
    { impressions: 0, clicks: 0, lpv: 0, ic: 0, spend: 0, threeSec: 0 }
  );
  const sales = salesSummary?.summary?.totalSales || 0;

  const stages: Stage[] = [
    { label: "Impressões", value: totals.impressions },
    { label: "3s views (hook)", value: totals.threeSec },
    { label: "Cliques", value: totals.clicks },
    { label: "Landing Page View", value: totals.lpv },
    { label: "Initiate Checkout", value: totals.ic },
    { label: "Vendas (Purchase)", value: sales },
  ];

  const base = stages[0]?.value || 1;

  return (
    <div className="p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Funil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Da impressão à venda — taxas de conversão etapa a etapa.
        </p>
      </header>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const pct = base > 0 ? (stage.value / base) * 100 : 0;
          const previousValue = index > 0 ? stages[index - 1]?.value : null;
          const stepPct =
            previousValue && previousValue > 0
              ? (stage.value / previousValue) * 100
              : null;
          const width = Math.max(pct, 2);

          return (
            <div key={stage.label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{stage.label}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                  {stepPct !== null && (
                    <span
                      className={
                        stepPct >= 60
                          ? "text-success"
                          : stepPct >= 30
                            ? "text-warning"
                            : "text-destructive"
                      }
                    >
                      {formatPercent(stepPct)} vs anterior
                    </span>
                  )}
                  <span className="text-foreground font-medium">
                    {formatNumber(stage.value)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                {pct.toFixed(2)}% das impressões
              </div>
            </div>
          );
        })}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Gasto total" value={formatBRL(totals.spend)} />
        <MetricCard
          label="CPM"
          value={
            totals.impressions > 0
              ? formatBRL((totals.spend / totals.impressions) * 1000)
              : "—"
          }
        />
        <MetricCard
          label="CPC"
          value={totals.clicks > 0 ? formatBRL(totals.spend / totals.clicks) : "—"}
        />
        <MetricCard
          label="CPA"
          value={sales > 0 ? formatBRL(totals.spend / sales) : "—"}
        />
        <MetricCard
          label="CTR"
          value={
            totals.impressions > 0
              ? formatPercent((totals.clicks / totals.impressions) * 100, 2)
              : "—"
          }
        />
        <MetricCard
          label="Hook rate"
          value={
            totals.impressions > 0
              ? formatPercent((totals.threeSec / totals.impressions) * 100, 2)
              : "—"
          }
        />
        <MetricCard
          label="Clique → LPV"
          value={
            totals.clicks > 0
              ? formatPercent((totals.lpv / totals.clicks) * 100, 1)
              : "—"
          }
        />
        <MetricCard
          label="LPV → IC"
          value={
            totals.lpv > 0 ? formatPercent((totals.ic / totals.lpv) * 100, 1) : "—"
          }
        />
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase text-muted-foreground tracking-wider">
        {label}
      </div>
      <div className="text-lg font-heading font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
