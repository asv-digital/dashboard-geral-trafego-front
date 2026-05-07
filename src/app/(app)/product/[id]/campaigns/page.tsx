"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type CampaignListItem } from "@/lib/api";
import { formatBRL, formatNumber } from "@/lib/format";

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

  return (
    <div className="p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Campanhas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Whitelist do agente — só campanhas aqui são geridas automaticamente.
        </p>
      </header>

      {actionError && <div className="text-xs text-destructive">{actionError}</div>}

      {campaigns.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma campanha whitelisted ainda</p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            O primeiro launch cria a campanha no Meta e adiciona à whitelist
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Tipo</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Budget/dia</th>
                <th className="text-right px-4 py-2.5">Gasto (total)</th>
                <th className="text-right px-4 py-2.5">Vendas</th>
                <th className="text-right px-4 py-2.5">CPA</th>
                <th className="text-right px-4 py-2.5">ROAS</th>
                <th className="text-right px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onPause={metaCampaignId => pauseMutation.mutate(metaCampaignId)}
                  onActivate={metaCampaignId => activateMutation.mutate(metaCampaignId)}
                  loading={pauseMutation.isPending || activateMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function extractMutationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "account_inactive") {
      return "Conta Meta bloqueando a ação agora.";
    }
    if (error.code === "campaign_not_in_whitelist") {
      return "Campanha fora da whitelist do produto.";
    }
    return error.code;
  }
  if (error instanceof Error) return error.message;
  return "falha ao executar ação no Meta";
}

function CampaignRow({
  campaign,
  onPause,
  onActivate,
  loading,
}: {
  campaign: CampaignListItem;
  onPause: (metaCampaignId: string) => void;
  onActivate: (metaCampaignId: string) => void;
  loading: boolean;
}) {
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-4 py-3 font-medium">
        {campaign.name}
        {campaign.isASC && (
          <span
            className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30"
            title="Advantage+ Shopping Campaign — IA do Meta gerencia audiência/criativo/placement"
          >
            ASC
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{campaign.type}</td>
      <td className="px-4 py-3">
        <span
          className={
            campaign.status === "Ativa"
              ? "text-success text-xs"
              : "text-muted-foreground text-xs"
          }
        >
          {campaign.status}
          {campaign.isInLearningPhase && (
            <span className="ml-2 text-warning">· learning</span>
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatBRL(campaign.dailyBudget)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatBRL(campaign.totalInvestment)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatNumber(campaign.totalSales)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {campaign.cpa ? formatBRL(campaign.cpa) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {campaign.roas ? `${campaign.roas.toFixed(2)}x` : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {campaign.metaCampaignId && (
          <>
            {campaign.status === "Ativa" ? (
              <button
                onClick={() => onPause(campaign.metaCampaignId!)}
                disabled={loading}
                className="text-xs px-2 py-1 bg-muted hover:bg-muted/70 rounded transition-colors"
              >
                pausar
              </button>
            ) : (
              <button
                onClick={() => onActivate(campaign.metaCampaignId!)}
                disabled={loading}
                className="text-xs px-2 py-1 bg-muted hover:bg-muted/70 rounded transition-colors"
              >
                ativar
              </button>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
