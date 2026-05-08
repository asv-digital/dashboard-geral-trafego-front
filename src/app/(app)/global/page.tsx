"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  api,
  type ActivityItem,
  type GlobalPnlProduct,
  type HeartbeatItem,
  type ProductHealth,
} from "@/lib/api";
import { calcDelta, formatBRL, formatNumber, formatRelativeTime } from "@/lib/format";
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
  const [now, setNow] = useState(0);
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    const syncNow = () => setNow(Date.now());
    syncNow();
    const intervalId = window.setInterval(syncNow, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const { data: pnl } = useQuery({
    queryKey: ["global", "pnl", days],
    queryFn: () => api.globalPnl(days),
    refetchInterval: 60_000,
  });
  const { data: activity } = useQuery({
    queryKey: ["global", "activity"],
    queryFn: () => api.globalActivity(),
    refetchInterval: 30_000,
  });
  const { data: heartbeats } = useQuery({
    queryKey: ["global", "heartbeats"],
    queryFn: () => api.globalHeartbeats(),
    refetchInterval: 30_000,
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
  const heartbeatItems = heartbeats?.heartbeats ?? [];
  const recentActivity = activity?.activity.slice(0, 20) ?? [];

  return (
    <div className="p-6 md:p-8 space-y-8">
      <PageHeader
        title="Visao Geral"
        subtitle={`Ultimos ${days === 1 ? "1 dia" : `${days} dias`} · todos os produtos`}
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader title="Heartbeats do agente" />
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {heartbeatItems.length === 0 ? (
              <div className="p-5 text-xs text-muted-foreground">nenhum heartbeat</div>
            ) : (
              heartbeatItems.map(heartbeat => (
                <HeartbeatRow
                  key={heartbeat.productId}
                  heartbeat={heartbeat}
                  now={now}
                />
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="Atividade recente (cross-product)" />
          <div className="bg-card border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="p-5 text-xs text-muted-foreground">sem atividade</div>
            ) : (
              recentActivity.map(item => <ActivityRow key={item.id} item={item} now={now} />)
            )}
          </div>
        </section>
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

function HeartbeatRow({
  heartbeat,
  now,
}: {
  heartbeat: HeartbeatItem;
  now: number;
}) {
  const lastCollection = heartbeat.lastCollectionAt
    ? new Date(heartbeat.lastCollectionAt)
    : null;
  const hoursSince =
    lastCollection && now > 0
      ? (now - lastCollection.getTime()) / (1000 * 60 * 60)
      : null;

  const tone: Tone =
    hoursSince === null
      ? "muted"
      : hoursSince > 8
        ? "danger"
        : hoursSince > 5
          ? "warning"
          : "success";

  return (
    <div className="p-4 flex items-center justify-between text-xs">
      <div>
        <div className="font-medium text-sm">{heartbeat.product?.name ?? "Produto"}</div>
        <div className="text-muted-foreground mt-0.5">
          {lastCollection
            ? hoursSince === null
              ? "calculando…"
              : formatRelativeTime(lastCollection, now)
            : "nunca coletou"}
          {heartbeat.consecutiveFailures > 0 &&
            ` · ${heartbeat.consecutiveFailures} falhas`}
        </div>
      </div>
      <StatusDot tone={tone} />
    </div>
  );
}

function ActivityRow({ item, now }: { item: ActivityItem; now: number }) {
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-primary">{item.action}</span>
        <span className="text-muted-foreground">
          {formatRelativeTime(item.executedAt, now)}
        </span>
      </div>
      <div className="text-muted-foreground mt-1">
        {item.product?.slug ?? "sem-produto"} · {item.entityName || item.entityType}
        {item.details ? ` — ${item.details}` : ""}
      </div>
    </div>
  );
}
