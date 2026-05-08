"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { api, type PreflightCheck, type PreflightStatus } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge as StatusBadgeShared, type Tone } from "@/components/ui/status-badge";

const STATUS_TONE: Record<PreflightStatus, Tone> = {
  ok: "success",
  warning: "warning",
  error: "danger",
};
const STATUS_LABEL: Record<PreflightStatus, string> = {
  ok: "Tudo ok",
  warning: "Com avisos",
  error: "Com erros",
};

export default function PreflightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["preflight", id],
    queryFn: () => api.preflight(id),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">carregando…</div>;
  }

  if (!data) {
    return <div className="p-8 text-muted-foreground">sem dados</div>;
  }

  const checks = data.checks ?? [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Preflight"
        subtitle="Verificacao exaustiva antes do agente operar com seguranca."
      />

      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadgeShared tone={STATUS_TONE[data.status]} label={STATUS_LABEL[data.status]} dot />
        <div className="text-sm text-muted-foreground">
          {data.errorCount} erro(s) · {data.warningCount} aviso(s) · {checks.length} checks
        </div>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {checks.map(check => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: PreflightCheck }) {
  return (
    <div className="p-4 flex items-start gap-3">
      <div className="mt-0.5">
        {check.status === "ok" ? (
          <CheckCircle2 className="w-4 h-4 text-success" />
        ) : check.status === "warning" ? (
          <AlertTriangle className="w-4 h-4 text-warning" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{check.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{check.message}</div>
        {check.hint && <div className="text-xs text-warning mt-1">➤ {check.hint}</div>}
      </div>
    </div>
  );
}

