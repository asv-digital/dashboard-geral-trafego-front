"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type CampaignListItem } from "@/lib/api";
import { formatBRL, formatNumber } from "@/lib/format";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export default function CampaignsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["campaigns", id],
    queryFn: () => api.listCampaigns(id),
    refetchInterval: 60_000,
  });

  const pauseMutation = useMutation({
    mutationFn: (metaCampaignId: string) => api.pauseCampaignMeta(id, metaCampaignId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    },
    onError: error => {
      setActionError(extractMutationError(error));
    },
  });

  const activateMutation = useMutation({
    mutationFn: (metaCampaignId: string) => api.activateCampaignMeta(id, metaCampaignId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    },
    onError: error => {
      setActionError(extractMutationError(error));
    },
  });

  const campaigns = data?.campaigns ?? [];
  const loading = pauseMutation.isPending || activateMutation.isPending;

  const columns: Column<CampaignListItem>[] = [
    {
      key: "name",
      label: "Nome",
      sortable: true,
      sortValue: c => c.name,
      searchable: c => `${c.name} ${c.type} ${c.status}`,
      exportValue: c => c.name,
      render: c => (
        <div className="font-medium flex items-center gap-2">
          <span className="truncate">{c.name}</span>
          {c.isASC && (
            <StatusBadge
              size="sm"
              tone="info"
              label="ASC"
              className="shrink-0"
            />
          )}
        </div>
      ),
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
      key: "status",
      label: "Status",
      sortable: true,
      sortValue: c => c.status,
      exportValue: c => c.status,
      render: c => (
        <div className="flex items-center gap-2">
          <StatusBadge
            size="sm"
            tone={c.status === "Ativa" ? "success" : "muted"}
            label={c.status}
          />
          {c.isInLearningPhase && (
            <StatusBadge size="sm" tone="warning" label="Learning" />
          )}
        </div>
      ),
    },
    {
      key: "dailyBudget",
      label: "Budget/dia",
      align: "right",
      sortable: true,
      sortValue: c => c.dailyBudget,
      exportValue: c => c.dailyBudget,
      render: c => formatBRL(c.dailyBudget),
    },
    {
      key: "totalInvestment",
      label: "Gasto total",
      align: "right",
      sortable: true,
      sortValue: c => c.totalInvestment,
      exportValue: c => c.totalInvestment,
      render: c => formatBRL(c.totalInvestment),
    },
    {
      key: "totalSales",
      label: "Vendas",
      align: "right",
      sortable: true,
      sortValue: c => c.totalSales,
      exportValue: c => c.totalSales,
      render: c => formatNumber(c.totalSales),
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
      key: "roas",
      label: "ROAS",
      align: "right",
      sortable: true,
      sortValue: c => c.roas ?? null,
      exportValue: c => c.roas,
      render: c => (c.roas ? `${c.roas.toFixed(2)}x` : "—"),
    },
    {
      key: "actions",
      label: "Acoes",
      align: "right",
      render: c =>
        c.metaCampaignId ? (
          c.status === "Ativa" ? (
            <button
              onClick={() => pauseMutation.mutate(c.metaCampaignId!)}
              disabled={loading}
              className="text-xs px-2 py-1 bg-muted hover:bg-muted/70 rounded transition-colors"
            >
              pausar
            </button>
          ) : (
            <button
              onClick={() => activateMutation.mutate(c.metaCampaignId!)}
              disabled={loading}
              className="text-xs px-2 py-1 bg-muted hover:bg-muted/70 rounded transition-colors"
            >
              ativar
            </button>
          )
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Campanhas"
        subtitle="Whitelist do agente — so campanhas aqui sao geridas automaticamente."
      />

      {actionError && <div className="text-xs text-destructive">{actionError}</div>}

      {campaigns.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma campanha whitelisted ainda.</p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            O primeiro launch cria a campanha no Meta e adiciona a whitelist.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={campaigns}
          keyOf={c => c.id}
          exportFilename="campanhas.csv"
          initialSort={{ key: "totalInvestment", dir: "desc" }}
        />
      )}
    </div>
  );
}

function extractMutationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "account_inactive") {
      return "Conta Meta bloqueando a acao agora.";
    }
    if (error.code === "campaign_not_in_whitelist") {
      return "Campanha fora da whitelist do produto.";
    }
    return error.code;
  }
  if (error instanceof Error) return error.message;
  return "falha ao executar acao no Meta";
}
