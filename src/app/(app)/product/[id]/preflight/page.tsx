"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { api, type PreflightCheck, type PreflightStatus } from "@/lib/api";

const STATUS_COLORS: Record<PreflightStatus, string> = {
  ok: "bg-success/20 text-success border-success/40",
  warning: "bg-warning/20 text-warning border-warning/40",
  error: "bg-destructive/20 text-destructive border-destructive/40",
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
    <div className="p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Preflight</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verificação exaustiva antes do agente operar com segurança.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <StatusBadge status={data.status} />
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

function StatusBadge({ status }: { status: PreflightStatus }) {
  return (
    <div
      className={`px-3 py-1 rounded-full border text-xs uppercase tracking-wider ${
        STATUS_COLORS[status]
      }`}
    >
      {status === "ok" ? "tudo ok" : status === "warning" ? "com avisos" : "com erros"}
    </div>
  );
}
