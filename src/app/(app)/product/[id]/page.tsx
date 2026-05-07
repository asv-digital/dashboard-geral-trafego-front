"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ActionLogItem } from "@/lib/api";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

export default function ProductOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: product } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
  });
  const { data: overview } = useQuery({
    queryKey: ["metrics", "overview", id],
    queryFn: () => api.metricsOverview(id),
    refetchInterval: 60_000,
  });
  const { data: salesSummary } = useQuery({
    queryKey: ["sales", "summary", id],
    queryFn: () => api.salesSummary(id),
    refetchInterval: 60_000,
  });
  const { data: actions } = useQuery({
    queryKey: ["actions", id, 20],
    queryFn: () => api.listActions(id, { limit: 20 }),
    refetchInterval: 30_000,
  });

  const overviewData = overview?.overview;
  const automationConfig = product?.product?.automationConfig;
  const productData = product?.product;
  const recentActions = actions?.actions ?? [];

  return (
    <div className="p-8 space-y-8">
      {productData?.supervisedMode && (
        <div className="text-sm px-4 py-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-3">
          <span className="font-medium">SUPERVISED MODE ON</span>
          <span className="text-amber-400/80">
            agente coleta+sugere mas não muda nada no Meta. Desligue em /config quando confiar.
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Gasto" value={formatBRL(overviewData?.totalSpend)} />
        <KpiCard
          label="Vendas"
          value={formatNumber(salesSummary?.summary?.totalSales)}
        />
        <KpiCard
          label="Receita líquida"
          value={formatBRL(salesSummary?.summary?.totalNet)}
        />
        <KpiCard
          label="CPA"
          value={overviewData?.avgCpa ? formatBRL(overviewData.avgCpa) : "—"}
          hint={
            automationConfig
              ? `breakeven ${formatBRL(automationConfig.breakevenCPA)}`
              : undefined
          }
          tone={
            overviewData?.avgCpa && automationConfig
              ? overviewData.avgCpa < automationConfig.autoScaleCPAThreshold
                ? "success"
                : overviewData.avgCpa > automationConfig.breakevenCPA
                  ? "danger"
                  : undefined
              : undefined
          }
        />
        <KpiCard
          label="ROAS"
          value={overviewData?.avgRoas ? `${overviewData.avgRoas.toFixed(2)}x` : "—"}
          tone={
            overviewData?.avgRoas
              ? overviewData.avgRoas >= 2
                ? "success"
                : overviewData.avgRoas < 1.4
                  ? "danger"
                  : undefined
              : undefined
          }
        />
        <KpiCard
          label="CTR"
          value={overviewData?.avgCtr ? formatPercent(overviewData.avgCtr) : "—"}
        />
        <KpiCard
          label="CPM"
          value={overviewData?.avgCpm ? formatBRL(overviewData.avgCpm) : "—"}
        />
        <KpiCard
          label="Freq"
          value={
            overviewData?.avgFrequency
              ? overviewData.avgFrequency.toFixed(2)
              : "—"
          }
        />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Economia do produto
          </h2>
          <dl className="space-y-2 text-sm">
            <Row
              label="Preço bruto"
              value={productData ? formatBRL(productData.priceGross) : "—"}
            />
            <Row
              label="Taxa gateway"
              value={
                productData
                  ? formatPercent(productData.gatewayFeeRate * 100)
                  : "—"
              }
            />
            <Row
              label="Net por venda"
              value={productData ? formatBRL(productData.netPerSale) : "—"}
            />
            <Row
              label="Budget diário alvo"
              value={productData ? formatBRL(productData.dailyBudgetTarget) : "—"}
            />
            <Row
              label="Budget piso / teto"
              value={
                productData
                  ? `${formatBRL(productData.dailyBudgetFloor)} / ${formatBRL(
                      productData.dailyBudgetCap
                    )}`
                  : "—"
              }
            />
          </dl>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Regras do agente (derivadas)
          </h2>
          {automationConfig ? (
            <dl className="space-y-2 text-sm">
              <Row
                label="Breakeven CPA"
                value={formatBRL(automationConfig.breakevenCPA)}
              />
              <Row
                label="Scale CPA (target)"
                value={formatBRL(automationConfig.autoScaleCPAThreshold)}
              />
              <Row
                label="Kill CPA (pausa)"
                value={formatBRL(automationConfig.cpaPauseThreshold)}
              />
              <Row
                label="Auto-pause sem venda acima"
                value={formatBRL(automationConfig.autoPauseSpendLimit)}
              />
              <Row
                label="Min dias breakeven"
                value={String(automationConfig.breakevenMinDays)}
              />
              <Row
                label="Scale %"
                value={`+${automationConfig.autoScalePercent}%`}
              />
              <Row
                label="Max scale budget"
                value={formatBRL(automationConfig.autoScaleMaxBudget)}
              />
              <Row
                label="Freq cap"
                value={`prosp ${automationConfig.frequencyLimitProspection}x · rmk ${automationConfig.frequencyLimitRemarketing}x`}
              />
              <Row
                label="Dayparting"
                value={automationConfig.daypartingEnabled ? "ativo" : "desligado"}
              />
            </dl>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Últimas decisões do agente
        </h2>
        <div className="bg-card border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
          {recentActions.length === 0 ? (
            <div className="p-5 text-xs text-muted-foreground">nenhuma decisão ainda</div>
          ) : (
            recentActions.map(action => <ActionRow key={action.id} action={action} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ActionRow({ action }: { action: ActionLogItem }) {
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-primary">{action.action}</span>
        <span className="text-muted-foreground">
          {new Date(action.executedAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      {action.entityName && (
        <div className="text-muted-foreground mt-1">{action.entityName}</div>
      )}
      {action.details && (
        <div className="text-muted-foreground/80 mt-0.5">{action.details}</div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase text-muted-foreground tracking-wider">
        {label}
      </div>
      <div
        className={`text-xl font-heading font-semibold mt-1.5 tabular-nums ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
