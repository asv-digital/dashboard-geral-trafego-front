"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type PlacementItem } from "@/lib/api";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

export default function PlacementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data } = useQuery({
    queryKey: ["placements", id],
    queryFn: () => api.listPlacements(id, 7),
    refetchInterval: 60_000,
  });

  const placements = data?.placements ?? [];
  const sorted = [...placements].sort((left, right) => right.spend - left.spend);
  const maxSpend = Math.max(...placements.map(placement => placement.spend), 1);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Placements"
        subtitle="Breakdown por plataforma + posicao — ultimos 7 dias."
      />

      {placements.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
          Sem dados de placement ainda. O collector popula isto a cada 4h.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(placement => (
            <PlacementRow
              key={`${placement.platform}-${placement.position}`}
              placement={placement}
              maxSpend={maxSpend}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlacementRow({
  placement,
  maxSpend,
}: {
  placement: PlacementItem;
  maxSpend: number;
}) {
  const bar = (placement.spend / maxSpend) * 100;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium">{placement.platform}</span>
          <span className="text-xs text-muted-foreground ml-2">
            / {placement.position}
          </span>
        </div>
        <div className="flex gap-6 text-xs tabular-nums">
          <Metric label="gasto" value={formatBRL(placement.spend)} />
          <Metric label="impr" value={formatNumber(placement.impressions)} />
          <Metric label="CPM" value={formatBRL(placement.cpm)} />
          <Metric
            label="CTR"
            value={placement.ctr !== null ? formatPercent(placement.ctr, 2) : "—"}
          />
          <Metric
            label="CPA"
            value={placement.cpa !== null ? formatBRL(placement.cpa) : "—"}
          />
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.max(bar, 1)}%` }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
