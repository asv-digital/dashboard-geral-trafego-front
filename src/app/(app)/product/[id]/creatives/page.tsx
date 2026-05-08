"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type CreativeItem } from "@/lib/api";
import { formatBRL, formatPercent } from "@/lib/format";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge as StatusBadgeShared, type Tone } from "@/components/ui/status-badge";

const CREATIVE_STATUS_TONE: Record<string, Tone> = {
  active: "success",
  paused: "muted",
  exhausted: "danger",
};

const CREATIVE_STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  exhausted: "Exausto",
};

export default function CreativesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data } = useQuery({
    queryKey: ["creatives", id],
    queryFn: () => api.listCreatives(id),
    refetchInterval: 60_000,
  });

  const creatives = data?.creatives ?? [];
  const active = creatives.filter(c => c.status === "active");
  const paused = creatives.filter(c => c.status === "paused");
  const exhausted = creatives.filter(c => c.status === "exhausted");

  const columns: Column<CreativeItem>[] = [
    {
      key: "name",
      label: "Nome",
      sortable: true,
      sortValue: c => c.name,
      searchable: c => `${c.name} ${c.type} ${c.campaign?.name ?? ""} ${c.status}`,
      exportValue: c => c.name,
      render: c => <span className="font-medium">{c.name}</span>,
    },
    {
      key: "type",
      label: "Tipo",
      sortable: true,
      sortValue: c => c.type,
      exportValue: c => c.type,
      render: c => <span className="text-muted-foreground text-xs">{c.type}</span>,
    },
    {
      key: "campaign",
      label: "Campanha",
      sortable: true,
      sortValue: c => c.campaign?.name ?? "",
      exportValue: c => c.campaign?.name,
      render: c => <span className="text-muted-foreground text-xs">{c.campaign?.name || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortValue: c => c.status,
      exportValue: c => CREATIVE_STATUS_LABEL[c.status] ?? c.status,
      render: c => (
        <StatusBadgeShared
          size="sm"
          tone={CREATIVE_STATUS_TONE[c.status] ?? "muted"}
          label={CREATIVE_STATUS_LABEL[c.status] ?? c.status}
        />
      ),
    },
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      sortable: true,
      sortValue: c => c.ctr ?? null,
      exportValue: c => c.ctr,
      render: c => (c.ctr ? formatPercent(c.ctr) : "—"),
    },
    {
      key: "hookRate",
      label: "Hook rate",
      align: "right",
      sortable: true,
      sortValue: c => c.hookRate ?? null,
      exportValue: c => c.hookRate,
      render: c => (c.hookRate ? formatPercent(c.hookRate) : "—"),
    },
    {
      key: "cpa",
      label: "CPA",
      align: "right",
      sortable: true,
      sortValue: c => c.cpa ?? null,
      exportValue: c => c.cpa,
      render: c => (c.cpa ? formatBRL(c.cpa) : "—"),
    },
    {
      key: "thruplayRate",
      label: "Thruplay",
      align: "right",
      sortable: true,
      sortValue: c => c.thruplayRate ?? null,
      exportValue: c => c.thruplayRate,
      render: c => (c.thruplayRate ? formatPercent(c.thruplayRate) : "—"),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Criativos"
        subtitle="Estoque de criativos do produto, classificados por saude."
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Ativos" value={String(active.length)} tone="success" />
        <KpiCard label="Pausados" value={String(paused.length)} tone="muted" />
        <KpiCard label="Exaustos" value={String(exhausted.length)} tone="danger" />
      </div>

      {creatives.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum criativo ainda.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={creatives}
          keyOf={c => c.id}
          exportFilename="criativos.csv"
          initialSort={{ key: "hookRate", dir: "desc" }}
        />
      )}
    </div>
  );
}
