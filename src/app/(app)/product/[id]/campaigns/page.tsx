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

      <AdsetsSection productId={id} />
    </div>
  );
}

function AdsetsSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["adsets", productId],
    queryFn: () => api.listAdsets(productId),
    refetchInterval: 60_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["adsets", productId] });

  const pause = useMutation({
    mutationFn: (adsetId: string) => api.pauseAdsetMeta(productId, adsetId),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: e => setError(extractMutationError(e)),
  });
  const activate = useMutation({
    mutationFn: (adsetId: string) => api.activateAdsetMeta(productId, adsetId),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: e => setError(extractMutationError(e)),
  });
  const updateBudget = useMutation({
    mutationFn: (params: { adsetId: string; dailyBudget: number }) =>
      api.updateAdsetBudgetMeta(productId, params.adsetId, params.dailyBudget),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: e => setError(extractMutationError(e)),
  });

  const adsets = data?.adsets ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-medium">Adsets ativos</h2>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "carregando..." : `${adsets.length} adsets`}
        </span>
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      {!isLoading && adsets.length === 0 ? (
        <div className="text-xs text-muted-foreground italic border border-dashed border-border rounded-lg p-4 text-center">
          Nenhum adset ativo (ou conta Meta sem permissão).
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Adset</th>
                <th className="text-left px-3 py-2">Campanha</th>
                <th className="text-right px-3 py-2">Budget</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {adsets.map(a => (
                <AdsetRow
                  key={a.id}
                  adset={a}
                  pending={
                    pause.variables === a.id
                      ? pause.isPending
                      : activate.variables === a.id
                        ? activate.isPending
                        : updateBudget.variables?.adsetId === a.id
                          ? updateBudget.isPending
                          : false
                  }
                  onPause={() => pause.mutate(a.id)}
                  onActivate={() => activate.mutate(a.id)}
                  onChangeBudget={dailyBudget =>
                    updateBudget.mutate({ adsetId: a.id, dailyBudget })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdsetRow({
  adset,
  pending,
  onPause,
  onActivate,
  onChangeBudget,
}: {
  adset: { id: string; name: string; campaignName: string; dailyBudget: number; status: string };
  pending: boolean;
  onPause: () => void;
  onActivate: () => void;
  onChangeBudget: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(adset.dailyBudget));
  const isActive = adset.status === "ACTIVE";
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-medium truncate max-w-[260px]" title={adset.name}>
        {adset.name}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]" title={adset.campaignName}>
        {adset.campaignName}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <input
              type="number"
              step="0.01"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-20 px-2 py-1 bg-input border border-border rounded text-xs"
            />
            <button
              onClick={() => {
                const n = Number(draft);
                if (Number.isFinite(n) && n > 0) {
                  onChangeBudget(n);
                  setEditing(false);
                }
              }}
              disabled={pending}
              className="text-[10px] text-success hover:underline disabled:opacity-50"
            >
              salvar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-[10px] text-muted-foreground hover:underline"
            >
              x
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(String(adset.dailyBudget));
              setEditing(true);
            }}
            className="text-xs hover:text-primary tabular-nums"
            title="editar budget"
          >
            {formatBRL(adset.dailyBudget)}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <StatusBadge tone={isActive ? "success" : "muted"} label={adset.status.toLowerCase()} dot size="sm" />
      </td>
      <td className="px-3 py-2 text-right">
        {isActive ? (
          <button
            onClick={onPause}
            disabled={pending}
            className="text-xs px-2 py-1 bg-muted hover:bg-muted/70 rounded disabled:opacity-50"
          >
            {pending ? "..." : "pausar"}
          </button>
        ) : (
          <button
            onClick={onActivate}
            disabled={pending}
            className="text-xs px-2 py-1 bg-success/10 text-success hover:bg-success/20 rounded disabled:opacity-50"
          >
            {pending ? "..." : "ativar"}
          </button>
        )}
      </td>
    </tr>
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
