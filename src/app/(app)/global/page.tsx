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
import { formatBRL, formatNumber } from "@/lib/format";

export default function GlobalPage() {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const syncNow = () => setNow(Date.now());
    syncNow();
    const intervalId = window.setInterval(syncNow, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const { data: pnl } = useQuery({
    queryKey: ["global", "pnl", 7],
    queryFn: () => api.globalPnl(7),
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
    queryKey: ["global", "overview", 7],
    queryFn: () => api.globalOverview(7),
    refetchInterval: 60_000,
  });

  const healthMap = new Map<string, ProductHealth>();
  for (const p of overview?.products ?? []) healthMap.set(p.productId, p.health);
  const topAlerts = overview?.topAlerts ?? [];

  const totals = pnl?.totals ?? { spend: 0, sales: 0, revenue: 0, profit: 0 };
  const products = pnl?.products ?? [];
  const heartbeatItems = heartbeats?.heartbeats ?? [];
  const recentActivity = activity?.activity.slice(0, 20) ?? [];

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-heading font-semibold">Visão Geral</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Últimos 7 dias — todos os produtos
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Gasto" value={formatBRL(totals.spend)} />
        <KpiCard label="Vendas" value={formatNumber(totals.sales)} />
        <KpiCard label="Receita líquida" value={formatBRL(totals.revenue)} />
        <KpiCard
          label="Lucro"
          value={formatBRL(totals.profit)}
          tone={totals.profit >= 0 ? "success" : "danger"}
        />
      </div>

      {topAlerts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Alertas ativos ({topAlerts.length})
          </h2>
          <div className="bg-card border border-destructive/30 rounded-lg overflow-hidden">
            {topAlerts.map((alert, i) => (
              <div
                key={`${alert.productSlug}-${alert.type}-${i}`}
                className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0 text-sm gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                  <span className="text-muted-foreground text-xs uppercase tracking-wider shrink-0">
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
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          P&amp;L por produto
        </h2>
        {products.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-10 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhum produto ativo. Crie em &quot;Novo produto&quot; na sidebar.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Produto</th>
                  <th className="text-left px-4 py-2.5">Stage</th>
                  <th className="text-right px-4 py-2.5">Budget/dia</th>
                  <th className="text-right px-4 py-2.5">Gasto</th>
                  <th className="text-right px-4 py-2.5">Vendas</th>
                  <th className="text-right px-4 py-2.5">Receita</th>
                  <th className="text-right px-4 py-2.5">CPA</th>
                  <th className="text-right px-4 py-2.5">ROAS</th>
                  <th className="text-right px-4 py-2.5">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <ProductRow
                    key={product.productId}
                    product={product}
                    health={healthMap.get(product.productId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Heartbeats do agente
          </h2>
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
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Atividade recente (cross-product)
          </h2>
          <div className="bg-card border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="p-5 text-xs text-muted-foreground">sem atividade</div>
            ) : (
              recentActivity.map(item => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const HEALTH_BADGE: Record<ProductHealth, { label: string; cls: string }> = {
  elite: { label: "elite", cls: "bg-success/10 text-success border-success/30" },
  bom: { label: "bom", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  mediano: { label: "mediano", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  critico: { label: "crítico", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

function ProductRow({
  product,
  health,
}: {
  product: GlobalPnlProduct;
  health?: ProductHealth;
}) {
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/product/${product.productId}`}
            className="font-medium hover:text-primary"
          >
            {product.name}
          </Link>
          {health && (
            <span
              className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${HEALTH_BADGE[health].cls}`}
            >
              {HEALTH_BADGE[health].label}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{product.stage}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatBRL(product.dailyBudgetTarget)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(product.spend)}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatNumber(product.salesCount)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(product.revenue)}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {product.cpa > 0 ? formatBRL(product.cpa) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {product.roas > 0 ? `${product.roas.toFixed(2)}x` : "—"}
      </td>
      <td
        className={`px-4 py-3 text-right tabular-nums ${
          product.profit >= 0 ? "text-success" : "text-destructive"
        }`}
      >
        {formatBRL(product.profit)}
      </td>
    </tr>
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

  const tone =
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
              : `há ${hoursSince.toFixed(1)}h`
            : "nunca coletou"}
          {heartbeat.consecutiveFailures > 0 &&
            ` · ${heartbeat.consecutiveFailures} falhas`}
        </div>
      </div>
      <span
        className={
          tone === "success"
            ? "text-success"
            : tone === "warning"
              ? "text-warning"
              : tone === "danger"
                ? "text-destructive"
                : "text-muted-foreground"
        }
      >
        ●
      </span>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-primary">{item.action}</span>
        <span className="text-muted-foreground">
          {new Date(item.executedAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="text-muted-foreground mt-1">
        {item.product?.slug ?? "sem-produto"} · {item.entityName || item.entityType}
        {item.details ? ` — ${item.details}` : ""}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div
        className={`text-2xl font-heading font-semibold mt-2 tabular-nums ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
