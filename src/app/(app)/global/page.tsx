"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  api,
  type GlobalPnlProduct,
  type ProductHealth,
} from "@/lib/api";
import { calcDelta, formatBRL, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { PeriodPicker } from "@/components/ui/period-picker";
import { StatusBadge, StatusDot, type Tone } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/data-table";

const HEALTH_TONE: Record<ProductHealth, { tone: Tone; label: string }> = {
  elite: { tone: "success", label: "Saudavel" },
  bom: { tone: "success", label: "Bom" },
  mediano: { tone: "warning", label: "Atencao" },
  critico: { tone: "danger", label: "Critico" },
};

export default function GlobalPage() {
  const [days, setDays] = useState<number>(7);

  const { data: pnl } = useQuery({
    queryKey: ["global", "pnl", days],
    queryFn: () => api.globalPnl(days),
    refetchInterval: 60_000,
  });
  const { data: overview } = useQuery({
    queryKey: ["global", "overview", days],
    queryFn: () => api.globalOverview(days),
    refetchInterval: 60_000,
  });

  const healthMap = new Map<string, ProductHealth>();
  for (const p of overview?.products ?? []) healthMap.set(p.productId, p.health);
  const topAlerts = overview?.topAlerts ?? [];

  const totals = pnl?.totals ?? { spend: 0, sales: 0, revenue: 0, profit: 0 };
  const previousTotals = pnl?.previousTotals ?? {
    spend: 0,
    sales: 0,
    revenue: 0,
    profit: 0,
  };
  const products = pnl?.products ?? [];

  const profitableCount = products.filter(p => p.profit > 0).length;
  const criticalCount = (overview?.products ?? []).filter(p => p.health === "critico").length;
  const trendingUp = products.filter(p => trendScore(p) >= 5).length;
  const trendingDown = products.filter(p => trendScore(p) <= -5).length;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <PageHeader
        title="Visao Geral"
        subtitle={`Ultimos ${days === 1 ? "1 dia" : `${days} dias`} · todos os produtos`}
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />

      {products.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <PulseBadge
            tone={profitableCount > 0 ? "success" : "muted"}
            label={`${profitableCount}/${products.length} lucrando`}
            pulse={profitableCount > 0}
          />
          {trendingUp > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-success">
              <TrendingUp className="w-3 h-3" />
              {trendingUp} em alta
            </span>
          )}
          {trendingDown > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
              <TrendingDown className="w-3 h-3" />
              {trendingDown} em queda
            </span>
          )}
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {criticalCount} {criticalCount === 1 ? "crítico" : "críticos"}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Gasto"
          value={formatBRL(totals.spend)}
          delta={calcDelta(totals.spend, previousTotals.spend)}
          deltaDirection="neutral"
        />
        <KpiCard
          label="Vendas"
          value={formatNumber(totals.sales)}
          delta={calcDelta(totals.sales, previousTotals.sales)}
          deltaDirection="up_good"
        />
        <KpiCard
          label="Receita liquida"
          value={formatBRL(totals.revenue)}
          delta={calcDelta(totals.revenue, previousTotals.revenue)}
          deltaDirection="up_good"
        />
        <KpiCard
          label="Lucro"
          value={formatBRL(totals.profit)}
          delta={calcDelta(totals.profit, previousTotals.profit)}
          deltaDirection="up_good"
          tone={totals.profit >= 0 ? "success" : "danger"}
        />
      </div>

      {topAlerts.length > 0 && (
        <section>
          <SectionHeader title={`Alertas ativos (${topAlerts.length})`} />
          <div className="bg-card border border-destructive/30 rounded-lg overflow-hidden">
            {topAlerts.map((alert, i) => (
              <div
                key={`${alert.productSlug}-${alert.type}-${i}`}
                className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0 text-sm gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot tone="danger" />
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider shrink-0">
                    {alert.productSlug}
                  </span>
                  <span className="truncate">{alert.type}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{alert.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="P&L por produto"
          hint={`${products.length} ${products.length === 1 ? "produto" : "produtos"}`}
        />
        {products.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-10 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhum produto ativo. Crie em &quot;Novo produto&quot; na sidebar.
            </p>
          </div>
        ) : (
          <ProductsTable products={products} healthMap={healthMap} />
        )}
      </section>

      <div className="text-[11px] text-muted-foreground italic">
        Saude do agente, ciclos automaticos e ultimas acoes em tempo real ficam em{" "}
        <Link href="/orquestrador" className="text-primary hover:underline">
          Orquestrador
        </Link>
        .
      </div>
    </div>
  );
}

function ProductsTable({
  products,
  healthMap,
}: {
  products: GlobalPnlProduct[];
  healthMap: Map<string, ProductHealth>;
}) {
  const columns: Column<GlobalPnlProduct>[] = [
    {
      key: "name",
      label: "Produto",
      sortable: true,
      sortValue: row => row.name,
      searchable: row => `${row.name} ${row.slug} ${row.stage}`,
      exportValue: row => row.name,
      render: row => {
        const health = healthMap.get(row.productId);
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/product/${row.productId}`}
              className="font-medium hover:text-primary"
            >
              {row.name}
            </Link>
            {health && (
              <StatusBadge
                size="sm"
                tone={HEALTH_TONE[health].tone}
                label={HEALTH_TONE[health].label}
                dot
              />
            )}
          </div>
        );
      },
    },
    {
      key: "stage",
      label: "Stage",
      sortable: true,
      sortValue: row => row.stage,
      exportValue: row => row.stage,
      render: row => <span className="text-muted-foreground text-xs">{row.stage}</span>,
    },
    {
      key: "dailyBudgetTarget",
      label: "Budget/dia",
      align: "right",
      sortable: true,
      sortValue: row => row.dailyBudgetTarget,
      exportValue: row => row.dailyBudgetTarget,
      render: row => formatBRL(row.dailyBudgetTarget),
    },
    {
      key: "spend",
      label: "Gasto",
      align: "right",
      sortable: true,
      sortValue: row => row.spend,
      exportValue: row => row.spend,
      render: row => <DeltaCell value={formatBRL(row.spend)} delta={calcDelta(row.spend, row.previous.spend)} direction="neutral" />,
    },
    {
      key: "salesCount",
      label: "Vendas",
      align: "right",
      sortable: true,
      sortValue: row => row.salesCount,
      exportValue: row => row.salesCount,
      render: row => <DeltaCell value={formatNumber(row.salesCount)} delta={calcDelta(row.salesCount, row.previous.salesCount)} direction="up_good" />,
    },
    {
      key: "revenue",
      label: "Receita",
      align: "right",
      sortable: true,
      sortValue: row => row.revenue,
      exportValue: row => row.revenue,
      render: row => formatBRL(row.revenue),
    },
    {
      key: "cpa",
      label: "CPA",
      align: "right",
      sortable: true,
      sortValue: row => row.cpa,
      exportValue: row => row.cpa,
      render: row => row.cpa > 0 ? <DeltaCell value={formatBRL(row.cpa)} delta={calcDelta(row.cpa, row.previous.cpa)} direction="down_good" /> : "—",
    },
    {
      key: "roas",
      label: "ROAS",
      align: "right",
      sortable: true,
      sortValue: row => row.roas,
      exportValue: row => row.roas,
      render: row => row.roas > 0 ? `${row.roas.toFixed(2)}x` : "—",
    },
    {
      key: "profit",
      label: "Lucro",
      align: "right",
      sortable: true,
      sortValue: row => row.profit,
      exportValue: row => row.profit,
      render: row => (
        <span className={row.profit >= 0 ? "text-success" : "text-destructive"}>
          {formatBRL(row.profit)}
        </span>
      ),
    },
    {
      key: "trend",
      label: "Tendência",
      align: "center",
      sortable: true,
      sortValue: row => trendScore(row),
      exportValue: row => trendLabel(row),
      render: row => <TrendBadge product={row} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      keyOf={row => row.productId}
      exportFilename="pnl-produtos.csv"
      initialSort={{ key: "profit", dir: "desc" }}
    />
  );
}

function PulseBadge({
  tone,
  label,
  pulse,
}: {
  tone: "success" | "muted";
  label: string;
  pulse: boolean;
}) {
  const cls =
    tone === "success"
      ? "bg-success/10 text-success border-success/30"
      : "bg-muted/40 text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${tone === "success" ? "bg-success" : "bg-muted-foreground"} ${pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}

function trendScore(row: GlobalPnlProduct): number {
  const prev = row.previous.profit;
  const cur = row.profit;
  if (prev === 0 && cur === 0) return 0;
  if (prev === 0) return cur > 0 ? 100 : -100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function trendLabel(row: GlobalPnlProduct): string {
  const s = trendScore(row);
  if (Math.abs(s) < 5) return "estavel";
  return s > 0 ? `+${s.toFixed(0)}%` : `${s.toFixed(0)}%`;
}

function TrendBadge({ product }: { product: GlobalPnlProduct }) {
  const score = trendScore(product);
  const stable = Math.abs(score) < 5;
  const up = !stable && score > 0;
  const Icon = stable ? Minus : up ? TrendingUp : TrendingDown;
  const tone = stable
    ? "text-muted-foreground bg-muted/40 border-border"
    : up
      ? "text-success bg-success/10 border-success/30"
      : "text-destructive bg-destructive/10 border-destructive/30";
  const label = stable
    ? "estável"
    : `${score > 0 ? "+" : ""}${score.toFixed(0)}%`;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium tabular-nums ${tone}`}
      title={`Lucro vs período anterior: ${formatBRL(product.previous.profit)} → ${formatBRL(product.profit)}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function DeltaCell({
  value,
  delta,
  direction,
}: {
  value: string;
  delta: number | null;
  direction: "up_good" | "down_good" | "neutral";
}) {
  if (delta == null || !Number.isFinite(delta)) {
    return <span>{value}</span>;
  }
  const tone: Tone =
    direction === "neutral"
      ? "muted"
      : direction === "up_good"
        ? delta >= 0 ? "success" : "danger"
        : delta <= 0 ? "success" : "danger";
  const sign = delta > 0 ? "+" : "";
  const toneCls =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex flex-col items-end leading-tight">
      <span>{value}</span>
      <span className={`text-[9px] tabular-nums ${toneCls}`}>{sign}{delta.toFixed(1)}%</span>
    </div>
  );
}
