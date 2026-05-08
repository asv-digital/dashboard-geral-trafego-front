"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Rocket, Sparkles } from "lucide-react";
import { api, ApiError, type PlannerCampaignPlan, type PlannerCommitResponse } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

export default function PlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [committed, setCommitted] = useState<PlannerCommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["planner", "preview", id],
    queryFn: () => api.plannerPreview(id),
  });

  const commitMutation = useMutation({
    mutationFn: () => api.plannerCommit(id),
    onSuccess: result => {
      if (!result.ok) {
        setError(result.error || "falha no commit");
      }
      setCommitted(result);
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    },
    onError: commitError => {
      if (commitError instanceof ApiError || commitError instanceof Error) {
        setError(commitError.message);
      } else {
        setError("erro");
      }
    },
  });

  const preflight = committed?.preflight ?? preview?.preflight;
  const plannerWarnings = committed?.warnings ?? preview?.warnings ?? [];
  const preflightStatus = preflight?.status;
  const hasBlockingPreflight = preflightStatus === "error";
  const canCommit = preview?.ok && !hasBlockingPreflight && !commitMutation.isPending;

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">planejando…</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <PageHeader
        title="Planner do agente"
        subtitle="Estrutura sugerida baseada no stage do produto, orcamento, sinais de funil e assets prontos."
        actions={<Sparkles className="w-5 h-5 text-primary" />}
      />

      {preflight && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            preflight.status === "error"
              ? "bg-destructive/10 border-destructive/40"
              : preflight.status === "warning"
                ? "bg-warning/10 border-warning/40"
                : "bg-success/10 border-success/40"
          }`}
        >
          <div className="font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Preflight {preflight.status === "ok" ? "ok" : preflight.status === "warning" ? "com avisos" : "bloqueando launch"}
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            {preflight.errorCount} erro(s) · {preflight.warningCount} aviso(s)
          </div>
          {hasBlockingPreflight && (
            <div className="text-xs mt-2 text-destructive">
              Corrija os erros no Preflight antes de lançar no Meta.
            </div>
          )}
        </div>
      )}

      {preview?.ok === false && (
        <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-5 text-sm">
          <strong className="text-destructive">Não foi possível planejar:</strong>{" "}
          {preview.error}
          {preview.error === "no_ready_assets" && (
            <div className="text-xs text-muted-foreground mt-2">
              Suba pelo menos 1 vídeo ou imagem em <strong>Conteúdo</strong> antes.
              Assets precisam estar em estado &quot;ready&quot; (upload + ingest pro
              Meta concluído).
            </div>
          )}
          {preview.error === "no_launchable_playbook" && (
            <div className="text-xs text-muted-foreground mt-2">
              O stage atual depende de audiências que ainda não estão prontas.
              Veja os avisos do planner logo abaixo para corrigir a segmentação antes do launch.
            </div>
          )}
        </div>
      )}

      {plannerWarnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/40 rounded-lg p-5 space-y-2 text-xs">
          <div className="font-medium text-warning">Avisos do planner</div>
          <ul className="space-y-1 text-muted-foreground">
            {plannerWarnings.map(warning => (
              <li key={warning}>· {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {preview?.ok && (
        <>
          <section className="space-y-3">
            {(preview.planned ?? []).map(plan => (
              <PlannedCampaignCard
                key={`${plan.name}-${plan.type}-${plan.audience ?? "all"}`}
                plan={plan}
              />
            ))}
          </section>

          {error && <div className="text-xs text-destructive">{error}</div>}

          {committed?.created && committed.created.length > 0 && (
            <div className="bg-success/10 border border-success/40 rounded-lg p-5 space-y-2">
              <div className="text-sm font-medium text-success">
                ✓ {committed.created.length} campanha(s) criada(s) no Meta
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {committed.created.map(campaign => (
                  <li key={campaign.metaCampaignId}>
                    · {campaign.name} — {campaign.adsCreated} anúncio(s) — {campaign.status.toLowerCase()} — id {campaign.metaCampaignId}
                  </li>
                ))}
              </ul>
              {committed.created.some(campaign => campaign.status === "Pausada") && (
                <div className="text-xs text-warning pt-2 border-t border-success/20">
                  Campanhas pausadas podem ser ativadas depois em &quot;Campanhas&quot;.
                </div>
              )}
            </div>
          )}

          {committed?.failed && committed.failed.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-5 space-y-2 text-xs">
              <div className="font-medium text-destructive">
                Parte do launch falhou
              </div>
              <ul className="space-y-1 text-muted-foreground">
                {committed.failed.map(item => (
                  <li key={`${item.name}-${item.metaCampaignId || item.reason}`}>
                    · {item.name}: {item.reason}
                    {item.metaCampaignId ? ` (campaign ${item.metaCampaignId})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!committed && (
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                onClick={() => commitMutation.mutate()}
                disabled={!canCommit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Rocket className="w-4 h-4" />
                {commitMutation.isPending ? "criando…" : "Criar no Meta"}
              </button>
              <span className="text-xs text-muted-foreground">
                {hasBlockingPreflight
                  ? "Launch bloqueado pelo preflight."
                  : "O planner agora devolve criação parcial, avisos e falhas de forma explícita."}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlannedCampaignCard({ plan }: { plan: PlannerCampaignPlan }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{plan.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {plan.type} · {plan.audience}
            {plan.usesAdvantage && " · Advantage+"}
            {plan.funnelStage && ` · ${plan.funnelStage}`}
          </div>
          {(plan.copyAngle || plan.objective || plan.strategyNote) && (
            <div className="mt-2 space-y-1">
              {plan.copyAngle && (
                <div className="text-[11px] text-muted-foreground">
                  Ângulo: {plan.copyAngle}
                </div>
              )}
              {plan.objective && (
                <div className="text-[11px] text-muted-foreground">
                  Objetivo: {plan.objective}
                </div>
              )}
              {plan.strategyNote && (
                <div className="text-[11px] text-muted-foreground">
                  {plan.strategyNote}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Budget/dia</div>
          <div className="text-lg font-medium tabular-nums">
            {formatBRL(plan.dailyBudget)}
          </div>
          {plan.creativeSlotLimit ? (
            <div className="text-[11px] text-muted-foreground mt-1">
              até {plan.creativeSlotLimit} criativos
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
